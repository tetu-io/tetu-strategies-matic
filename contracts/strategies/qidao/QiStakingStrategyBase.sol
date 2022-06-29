// SPDX-License-Identifier: ISC
/**
* By using this software, you understand, acknowledge and accept that Tetu
* and/or the underlying software are provided “as is” and “as available”
* basis and without warranties or representations of any kind either expressed
* or implied. Any use of this open source software released under the ISC
* Internet Systems Consortium license is done at your own risk to the fullest
* extent permissible pursuant to applicable law any and all liability as well
* as all warranties, including any fitness for a particular purpose with respect
* to Tetu and/or the underlying software and the use thereof are disclaimed.
*/

pragma solidity 0.8.4;

import "@tetu_io/tetu-contracts/contracts/base/strategies/ProxyStrategyBase.sol";
import "../../third_party/qidao/IeQi.sol";
import "../../third_party/IERC20Extended.sol";
import "../../third_party/IDelegation.sol";

/// @title Base contract for Qi stake into eQi pool
/// @author belbix
abstract contract QiStakingStrategyBase is ProxyStrategyBase {
  using SafeERC20 for IERC20;

  // --------------------- CONSTANTS -------------------------------
  /// @notice Strategy type for statistical purposes
  string public constant override STRATEGY_NAME = "QiStakingStrategyBase";
  /// @notice Version of the contract
  /// @dev Should be incremented when contract changed
  string public constant VERSION = "1.2.0";
  /// @dev 10% buybacks, 90% of vested Qi should go to the vault rewards (not autocompound)
  uint256 private constant _BUY_BACK_RATIO = 10_00;

  IeQi public constant eQi = IeQi(0x880DeCADe22aD9c58A8A4202EF143c4F305100B3);
  address public constant tetuQI_QI_PAIR = 0xBCDd0E38F759F8C07D8416dF15D0B3e0F9146d08;
  address private constant _tetuQI = 0x4Cd44ced63d9a6FEF595f6AD3F7CED13fCEAc768;
  uint256 private constant _MAX_LOCK = 60108430; // 4 years
  bytes32 internal constant _POOL_BALANCE_SNAPSHOT_KEY = bytes32(uint256(keccak256("s.pool_balance")) - 1);
  bytes32 internal constant _UNDERLYING_BALANCE_SNAPSHOT_KEY = bytes32(uint256(keccak256("s.underlying_balance")) - 1);
  bytes32 internal constant _QI_DAO_ENS = bytes32("qidao.eth");

  // ------------------- VARIABLES ---------------------------------
  // should be only maps/arrays, or use storage contract
  mapping(bytes32 => uint) private strategyUintStorage;

  /// @notice Initialize contract after setup it as proxy implementation
  function initializeStrategy(
    address _controller,
    address _underlying,
    address _vault,
    address[] memory __rewardTokens
  ) public initializer {
    ProxyStrategyBase.initializeStrategyBase(
      _controller,
      _underlying,
      _vault,
      __rewardTokens,
      _BUY_BACK_RATIO
    );
  }

  modifier updateBalance() {
    // should be updated after function call
    _;
    _setStrategyUint(_POOL_BALANCE_SNAPSHOT_KEY, eQi.underlyingBalance(address(this)));
    _setStrategyUint(_UNDERLYING_BALANCE_SNAPSHOT_KEY, IERC20(_underlying()).balanceOf(address(this)));
  }


  // --------------------------------------------

  /// @dev Manual withdraw for any emergency purposes
  function manualWithdraw() external restricted updateBalance {
    eQi.leave();
    IERC20(_underlying()).safeTransfer(_vault(), IERC20(_underlying()).balanceOf(address(this)));
  }

  function delegateVotes(address _delegateContract, address _delegate) external restricted {
    IDelegation(_delegateContract).setDelegate(_QI_DAO_ENS, _delegate);
  }

  function clearDelegatedVotes(address _delegateContract) external restricted {
    IDelegation(_delegateContract).clearDelegate(_QI_DAO_ENS);
  }

  // --------------------------------------------

  /// @notice Return underlying balance + balance in the reward pool
  function investedUnderlyingBalance() external override view returns (uint) {
    // we should returns snapshots for the reason of unpredictable rewards airdrops
    return _getStrategyUint(_POOL_BALANCE_SNAPSHOT_KEY) + _getStrategyUint(_UNDERLYING_BALANCE_SNAPSHOT_KEY);
  }

  /// @dev Returns Qi amount under control
  function _rewardPoolBalance() internal override view returns (uint256) {
    return _getStrategyUint(_POOL_BALANCE_SNAPSHOT_KEY);
  }

  /// @dev Collect profit and do something useful with them
  function doHardWork() external onlyNotPausedInvesting override hardWorkers updateBalance {
    // do not invest underlying
    // we should calculate properly what was deposited by users and what we get from airdrop
    // assume that all deposits immediately invested
    // and all withdrawals transfer to vault
    liquidateReward();
  }

  /// @dev Stake Qi to eQi
  function depositToPool(uint256 amount) internal override updateBalance {
    if (amount > 0) {
      // lock on max period
      uint blockNumber = _MAX_LOCK;
      uint endBlock = eQi.userInfo(address(this)).endBlock;
      if (endBlock != 0) {
        blockNumber = (block.number + _MAX_LOCK) - endBlock;
      }

      IERC20(_underlying()).safeApprove(address(eQi), 0);
      IERC20(_underlying()).safeApprove(address(eQi), amount);
      eQi.enter(amount, blockNumber);
    }
  }

  /// @dev We will not able to withdraw from pool
  function withdrawAndClaimFromPool(uint256) internal pure override {
    revert("QSS: Withdraw forbidden");
  }

  /// @dev In emergency case QiDAO can activate this function
  function emergencyWithdrawFromPool() internal override updateBalance {
    eQi.emergencyExit();
    IERC20(_underlying()).safeTransfer(_vault(), IERC20(_underlying()).balanceOf(address(this)));
  }

  /// @dev Send part of airdrop to vault as claimable rewards + use another part for buybacks
  function liquidateReward() internal override {
    uint underlyingAmount = IERC20(_underlying()).balanceOf(address(this));
    uint toBuybacks = (underlyingAmount * _buyBackRatio() / _BUY_BACK_DENOMINATOR);
    uint toVault = underlyingAmount - toBuybacks;
    address qi = _underlying();
    address tetuQi = _tetuQI;
    if (toBuybacks != 0) {
      address forwarder = IController(_controller()).feeRewardForwarder();
      IERC20(qi).safeApprove(forwarder, 0);
      IERC20(qi).safeApprove(forwarder, toBuybacks);
      // it will sell reward token to Target Token and distribute it to SmartVault and PS
      uint targetTokenEarned = IFeeRewardForwarder(forwarder).distribute(toBuybacks, qi, tetuQi);
      if (targetTokenEarned > 0) {
        IBookkeeper(IController(_controller()).bookkeeper()).registerStrategyEarned(targetTokenEarned);
      }
    }

    if (toVault != 0) {
      toVault = _qiToTetuQi(qi, toVault);

      IERC20(tetuQi).safeApprove(tetuQi, 0);
      IERC20(tetuQi).safeApprove(tetuQi, toVault);
      ISmartVault(tetuQi).notifyTargetRewardAmount(tetuQi, toVault);
    }
  }

  function _qiToTetuQi(address qi, uint amount) internal returns (uint) {
    uint balance = IERC20(_tetuQI).balanceOf(address(this));
    (uint reserve0, uint reserve1,) = IUniswapV2Pair(tetuQI_QI_PAIR).getReserves();
    address token0 = IUniswapV2Pair(tetuQI_QI_PAIR).token0();
    uint tetuQiReserve = token0 == _tetuQI ? reserve0 : reserve1;
    uint qiReserve = token0 != _tetuQI ? reserve0 : reserve1;
    if (tetuQiReserve > qiReserve) {
      uint toSell = Math.min(_computeSellAmount(qiReserve, tetuQiReserve), amount);
      uint amountOut = _getAmountOut(toSell, qiReserve, tetuQiReserve);
      IERC20(qi).safeTransfer(tetuQI_QI_PAIR, amount);
      _swapCall(IUniswapV2Pair(tetuQI_QI_PAIR), qi, _tetuQI, amountOut);
      amount = amount - toSell;
    }
    if (amount != 0) {
      IERC20(qi).safeApprove(_tetuQI, 0);
      IERC20(qi).safeApprove(_tetuQI, amount);
      // make sure that we not call doHardWork again in the vault during investment process
      ISmartVault(_tetuQI).depositAndInvest(amount);
    }

    return IERC20(_tetuQI).balanceOf(address(this)) - balance;
  }

  /// @dev Call swap function on pair with necessary preparations
  ///      Assume that amountOut already sent to the pair
  function _swapCall(IUniswapV2Pair _lp, address tokenIn, address tokenOut, uint amountOut) internal {
    (address token0,) = sortTokens(tokenIn, tokenOut);
    (uint amount0Out, uint amount1Out) = tokenIn == token0 ? (uint(0), amountOut) : (amountOut, uint(0));
    _lp.swap(amount0Out, amount1Out, address(this), new bytes(0));
  }

  /// @dev returns sorted token addresses, used to handle return values from pairs sorted in this order
  function sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
    (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
  }


  /// @dev Given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset
  function _getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) internal pure returns (uint amountOut) {
    uint amountInWithFee = amountIn * 999;
    uint numerator = amountInWithFee * reserveOut;
    uint denominator = (reserveIn * 1000) + amountInWithFee;
    amountOut = numerator / denominator;
  }

  function _computeSellAmount(
    uint tokenReserve,
    uint oppositeReserve
  ) internal pure returns (uint) {
    // ignore fees
    uint base = oppositeReserve * tokenReserve;
    uint sqrtBase = _sqrt(base);
    if (sqrtBase < tokenReserve) {
      return 0;
    }
    return sqrtBase - tokenReserve;
  }

  /// @dev Babylonian method (https://en.wikipedia.org/wiki/Methods_of_computing_square_roots#Babylonian_method)
  function _sqrt(uint y) internal pure returns (uint z) {
    z = 0;
    if (y > 3) {
      z = y;
      uint x = y / 2 + 1;
      while (x < z) {
        z = x;
        x = (y / x + x) / 2;
      }
    } else if (y != 0) {
      z = 1;
    }
  }

  /// @dev No claimable tokens
  function readyToClaim() external view override returns (uint256[] memory) {
    uint256[] memory toClaim = new uint256[](_rewardTokens.length);
    return toClaim;
  }

  /// @dev Return full amount of staked tokens
  function poolTotalAmount() external view override returns (uint256) {
    return IERC20(_underlying()).balanceOf(address(eQi));
  }

  /// @dev Platform name for statistical purposes
  /// @return Platform enum index
  function platform() external override pure returns (Platform) {
    return Platform.QIDAO;
  }

  // --------------------- STORAGE FUNCTIONS -------------------------
  function _setStrategyUint(bytes32 key, uint256 _value) private {
    strategyUintStorage[key] = _value;
  }

  function _getStrategyUint(bytes32 key) private view returns (uint256) {
    return strategyUintStorage[key];
  }

  // use gap in next implementations
}
