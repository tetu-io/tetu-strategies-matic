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
import "@tetu_io/tetu-contracts/contracts/base/SlotsLib.sol";
import "../../third_party/mesh/ISinglePool.sol";
import "../../third_party/IERC20Extended.sol";

/// @title Abstract contract for MeshVault strategy implementation
/// @author olegn
abstract contract MeshSinglePoolBase is ProxyStrategyBase {
  using SafeERC20 for IERC20;
  using SlotsLib for bytes32;

  // ************ VARIABLES **********************
  /// @notice Strategy type for statistical purposes
  string public constant override STRATEGY_NAME = "MeshSinglePoolBase";
  /// @notice Version of the contract
  /// @dev Should be incremented when contract changed
  string public constant VERSION = "1.0.1";
  /// @dev precision for the folding profitability calculation
  uint256 private constant _PRECISION = 10 ** 18;
  /// @dev 10% buyback
  uint private constant _BUY_BACK_RATIO = 10_00;
  IUniswapV2Router02 public constant MESH_ROUTER = IUniswapV2Router02(0x10f4A785F458Bc144e3706575924889954946639);
  bytes32 internal constant _MESH_POOL_SLOT = bytes32(uint(keccak256("mesh.single.pool")) - 1);
  bytes32 internal constant _PROXY_REWARD_TOKEN_SLOT = bytes32(uint(keccak256("mesh.single.proxyRewardToken")) - 1);

  /// @notice Contract constructor using on strategy implementation
  /// @dev The implementation should check each parameter
  /// @param _controller Controller address
  /// @param _vault SmartVault address that will provide liquidity
  /// @param _underlying Underlying token address
  /// @param __rewardTokens Reward tokens that the strategy will farm
  /// @param _meshSinglePool single token pool address
  function initializeStrategy(
    address _controller,
    address _vault,
    address _underlying,
    address[] memory __rewardTokens,
    address proxyRewardToken,
    address _meshSinglePool
  ) public initializer {
    ProxyStrategyBase.initializeStrategyBase(
      _controller,
      _underlying,
      _vault,
      __rewardTokens,
      _BUY_BACK_RATIO
    );
    require(ISinglePool(_meshSinglePool).token() == _underlying, "Wrong underlying");
    _MESH_POOL_SLOT.set(_meshSinglePool);
    _PROXY_REWARD_TOKEN_SLOT.set(proxyRewardToken);
  }


  // ************* VIEWS *******************

  /// @notice Strategy balance in the meshSinglePool pool
  /// @return bal Balance amount in underlying tokens
  function _rewardPoolBalance() internal override view returns (uint) {
    uint256 iTokenBalance = meshSinglePool().balanceOf(address(this));
    uint256 exchangeRateStored = meshSinglePool().exchangeRateStored();
    uint256 underlyingInPool = iTokenBalance * exchangeRateStored / _PRECISION + 1;
    return underlyingInPool > 1 ? underlyingInPool : 0;
  }

  /// @notice Return approximately amount of reward tokens ready to claim in meshSinglePool pool
  /// @dev Don't use it in any internal logic, only for statistical purposes
  /// @return Array with amounts ready to claim
  function readyToClaim() external view override returns (uint[] memory) {
    uint[] memory toClaim = new uint[](1);
    toClaim[0] = meshSinglePool().userRewardSum(address(this));
    return toClaim;
  }

  /// @notice TVL of the underlying in the meshSinglePool pool
  /// @dev Only for statistic
  /// @return Pool TVL
  function poolTotalAmount() external view override returns (uint) {
    return
    meshSinglePool().getCash() +
    meshSinglePool().totalBorrows() -
    meshSinglePool().totalReserves();
  }

  // ************ GOVERNANCE ACTIONS **************************

  /// @notice Claim rewards from external project and send them to FeeRewardForwarder
  function doHardWork() external onlyNotPausedInvesting override hardWorkers {
    _investAllUnderlying();
    meshSinglePool().claimReward();
    liquidateReward();
  }

  // ************ INTERNAL LOGIC IMPLEMENTATION **************************

  /// @dev Deposit underlying to mesh pool
  /// @param amount Deposit amount
  function depositToPool(uint amount) internal override {
    if (amount > 0) {
      IERC20(_underlying()).safeApprove(address(meshSinglePool()), 0);
      IERC20(_underlying()).safeApprove(address(meshSinglePool()), amount);
      meshSinglePool().depositToken(amount);
    }
  }

  /// @dev Withdraw underlying from meshSinglePool. Conversion of underlying to iToken is needed.
  /// @param amount Deposit amount
  function withdrawAndClaimFromPool(uint amount) internal override {
    uint256 exchangeRateStored = meshSinglePool().exchangeRateStored();
    uint256 iTokenBalance = meshSinglePool().balanceOf(address(this));
    uint iTokenToWithdraw = amount * _PRECISION / exchangeRateStored;
    meshSinglePool().withdrawTokenByAmount(Math.min(iTokenBalance, iTokenToWithdraw));
  }

  /// @dev the same as withdrawAndClaimFromPool because mesh pools have no such functionality
  function emergencyWithdrawFromPool() internal override {
    uint strategyBalance = meshSinglePool().balanceOf(address(this));
    meshSinglePool().withdrawToken(strategyBalance);
  }

  /// @dev Do something useful with farmed rewards
  function liquidateReward() internal override {
    _swapRTtoProxyRT();
    _autocompound();
    _liquidateRewardMesh(true);
  }

  /// @dev Liquidate rewards and buy underlying asset
  function _autocompound() internal {
    address forwarder = IController(_controller()).feeRewardForwarder();
    uint amount = IERC20(_proxyRewardToken()).balanceOf(address(this));
    if (amount != 0) {
      uint toCompound = amount * (_BUY_BACK_DENOMINATOR - _buyBackRatio()) / _BUY_BACK_DENOMINATOR;
      IERC20(_proxyRewardToken()).safeApprove(forwarder, 0);
      IERC20(_proxyRewardToken()).safeApprove(forwarder, toCompound);
      uint underlyingBalance = IFeeRewardForwarder(forwarder).liquidate(_proxyRewardToken(), _underlying(), toCompound);
      depositToPool(underlyingBalance);
    }
  }

  /// @dev Custom implementation because of mesh is not satisfies IUniswapV2Pair
  ///      and IFeeRewardForwarder can't liquidate mesh. Mesh rewards are swapped to proxyReward (e.g USDC)
  ///      and liquidated
  function _liquidateRewardMesh(bool revertOnErrors) internal {
    address forwarder = IController(_controller()).feeRewardForwarder();
    uint targetTokenEarnedTotal = 0;

    uint amount = IERC20(_proxyRewardToken()).balanceOf(address(this));
    if (amount != 0) {
      IERC20(_proxyRewardToken()).safeApprove(forwarder, 0);
      IERC20(_proxyRewardToken()).safeApprove(forwarder, amount);
      // it will sell reward token to Target Token and distribute it to SmartVault and PS
      uint targetTokenEarned = 0;
      if (revertOnErrors) {
        targetTokenEarned = IFeeRewardForwarder(forwarder).distribute(amount, _proxyRewardToken(), _vault());
      } else {
        //slither-disable-next-line unused-return,variable-scope,uninitialized-local
        try IFeeRewardForwarder(forwarder).distribute(amount, _proxyRewardToken(), _vault()) returns (uint r) {
          targetTokenEarned = r;
        } catch {}
      }
      targetTokenEarnedTotal += targetTokenEarned;
    }

    if (targetTokenEarnedTotal > 0) {
      IBookkeeper(IController(_controller()).bookkeeper()).registerStrategyEarned(targetTokenEarnedTotal);
    }
  }

  /// @dev swaps rewards to proxy rewards
  function _swapRTtoProxyRT() internal {
    for (uint i = 0; i < _rewardTokens.length; i++) {
      address rt = _rewardTokens[i];
      uint256 rtBalance = IERC20(rt).balanceOf(address(this));
      if (rtBalance != 0) {
        address[] memory route = new address[](2);
        route[0] = rt;
        route[1] = _proxyRewardToken();
        _meshSwap(rtBalance, route);
      }
    }
  }

  /// @dev helper function for meshswap router
  function _meshSwap(uint256 amount, address[] memory _route) internal {
    require(IERC20(_route[0]).balanceOf(address(this)) >= amount, "Not enough balance");
    IERC20(_route[0]).safeApprove(address(MESH_ROUTER), 0);
    IERC20(_route[0]).safeApprove(address(MESH_ROUTER), amount);
    MESH_ROUTER.swapExactTokensForTokens(
      amount,
      0,
      _route,
      address(this),
      block.timestamp
    );
  }

  function meshSinglePool() public view returns (ISinglePool) {
    return ISinglePool(_MESH_POOL_SLOT.getAddress());
  }

  function _proxyRewardToken() internal view returns (address){
    return _PROXY_REWARD_TOKEN_SLOT.getAddress();
  }

  /// @dev Platform name for statistical purposes
  /// @return Platform enum index
  function platform() external override pure returns (Platform) {
    return Platform.MESH;
  }
}
