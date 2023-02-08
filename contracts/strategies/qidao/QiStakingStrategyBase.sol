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
import "../../third_party/dystopia/IDystopiaRouter.sol";
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
  string public constant VERSION = "1.4.0";
  /// @dev 10% buybacks, 90% of vested Qi should go to the vault rewards (not autocompound)
  uint256 private constant _BUY_BACK_RATIO = 10_00;

  IeQi public constant eQi = IeQi(0x880DeCADe22aD9c58A8A4202EF143c4F305100B3);
  address private constant _QI_tetuQI_BPT_VAULT = 0x190cA39f86ea92eaaF19cB2acCA17F8B2718ed58;
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

    IController c = IController(_controller());
    address qi = _underlying();
    address tetu = c.rewardToken();

    uint underlyingAmount = IERC20(_underlying()).balanceOf(address(this));
    // convert all QI to TETU
    address forwarder = c.feeRewardForwarder();
    _approveIfNeeds(qi, underlyingAmount, forwarder);
    uint tetuAmount = IFeeRewardForwarder(forwarder).liquidate(qi, tetu, underlyingAmount);

    uint toBuybacks = (tetuAmount * _buyBackRatio() / _BUY_BACK_DENOMINATOR);
    uint toBptVault = tetuAmount - toBuybacks;


    if (toBuybacks != 0) {
      IBookkeeper(IController(_controller()).bookkeeper()).registerStrategyEarned(toBuybacks);
      // just send buybacks to controller
      IERC20(tetu).safeTransfer(address(c), toBuybacks);
    }

    if (toBptVault != 0) {
      _approveIfNeeds(tetu, toBptVault, _QI_tetuQI_BPT_VAULT);
      ISmartVault(_QI_tetuQI_BPT_VAULT).notifyTargetRewardAmount(tetu, toBptVault);
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

  function _approveIfNeeds(address token, uint amount, address spender) internal {
    if (IERC20(token).allowance(address(this), spender) < amount) {
      IERC20(token).safeApprove(spender, 0);
      IERC20(token).safeApprove(spender, type(uint).max);
    }
  }

  // use gap in next implementations
}
