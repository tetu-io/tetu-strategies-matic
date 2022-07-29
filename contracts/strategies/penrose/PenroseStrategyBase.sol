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
import "../../third_party/penrose/IUserProxy.sol";
import "../../third_party/penrose/IPenPoolFactory.sol";
import "../../third_party/penrose/IPenPool.sol";
import "../../third_party/penrose/IUserProxyFactory.sol";
import "../../third_party/penrose/IMultiRewards.sol";

/// @title Strategy for autocompound Penrose rewards
/// @author belbix
abstract contract PenroseStrategyBase is ProxyStrategyBase {
  using SafeERC20 for IERC20;

  // --------------------- CONSTANTS -------------------------------
  /// @notice Strategy type for statistical purposes
  string public constant override STRATEGY_NAME = "PenroseStrategyBase";
  /// @notice Version of the contract
  /// @dev Should be incremented when contract changed
  string public constant VERSION = "1.0.0";

  IUserProxyFactory public constant PENROSE_USER_PROXY_FACTORY = IUserProxyFactory(0x22Eb3955Ac17AA32374dA5932BbB2C46163E39E3);
  //  address public constant PEN_LENS = 0x1432c3553FDf7FBD593a84B3A4d380c643cbf7a2;
  IPenPoolFactory public constant PEN_POOL_FACTORY = IPenPoolFactory(0xdf37c9c17dCdbB8B52ca9651d5C53406894a4abF);


  // ------------------- VARIABLES ---------------------------------
  IUserProxy public userProxy;
  IPenPool public penPool;
  address public stakingAddress;

  /// @notice Initialize contract after setup it as proxy implementation
  function initializeStrategy(
    address _controller,
    address _vault
  ) public initializer {
    address underlying = ISmartVault(_vault).underlying();

    userProxy = IUserProxy(PENROSE_USER_PROXY_FACTORY.createAndGetUserProxy(address(this)));

    IERC20(underlying).safeApprove(address(userProxy), type(uint).max);

    penPool = IPenPool(PEN_POOL_FACTORY.penPoolByDystPool(underlying));
    stakingAddress = penPool.stakingAddress();

    ProxyStrategyBase.initializeStrategyBase(
      _controller,
      underlying,
      _vault,
      new address[](0),
      10_00
    );

    _updateRewardTokens();
  }

  function _updateRewardTokens() internal {
    IMultiRewards multiRewards = IMultiRewards(stakingAddress);
    uint256 rtsLength = multiRewards.rewardTokensLength();
    address[] memory rewardTokens = new address[](rtsLength);

    for (uint i; i < rtsLength; i++) {
      rewardTokens[i] = multiRewards.rewardTokens(i);
    }
    _rewardTokens = rewardTokens;
  }

  /// @dev Returns underlying amount under control
  function _rewardPoolBalance() internal override view returns (uint) {
    return IERC20(stakingAddress).balanceOf(address(this));
  }

  /// @dev Rewards ready to claim
  function readyToClaim() external view override returns (uint[] memory) {
    IMultiRewards multiRewards = IMultiRewards(stakingAddress);
    address[] memory rts = _rewardTokens;
    uint[] memory toClaim = new uint[](rts.length);
    address owner = address(userProxy);

    for (uint i; i < rts.length; i++) {
      toClaim[i] = multiRewards.earned(owner, rts[i]);
    }

    return toClaim;
  }

  /// @dev Return full pool TVL
  function poolTotalAmount() external view override returns (uint) {
    return IERC20(stakingAddress).totalSupply();
  }

  /// @dev Collect profit and do something useful with them
  function doHardWork() external override virtual hardWorkers onlyNotPausedInvesting {
    // we should handle all possible rewards
    _updateRewardTokens();
    // invest all for avoid users funds liquidation
    _investAllUnderlying();
    // claim all rewards
    userProxy.claimStakingRewards(stakingAddress);
    liquidateReward();
  }

  /// @dev Stake underlying
  function depositToPool(uint amount) internal override {
    if (amount > 0) {
      // allowance should be setup in init
      userProxy.depositLpAndStake(_underlying(), amount);
    }
  }

  /// @dev Withdraw underlying
  function withdrawAndClaimFromPool(uint underlyingAmount) internal override {
    if (underlyingAmount > 0) {
      userProxy.unstakeLpAndWithdraw(_underlying(), underlyingAmount, true);
    }
  }

  /// @dev Withdraw without care about rewards
  function emergencyWithdrawFromPool() internal override {
    userProxy.unstakeLpAndWithdraw(_underlying(), IERC20(stakingAddress).balanceOf(address(this)), false);
  }

  function liquidateReward() internal override {
    IController ctrl = IController(_controller());
    address forwarder = ctrl.feeRewardForwarder();
    address ps = ctrl.psVault();

    address[] memory rts = _rewardTokens;
    address und = _underlying();
    uint bbRatio = _buyBackRatio();
    address vault = _vault();

    uint targetTokenEarnedTotal = 0;
    for (uint i = 0; i < rts.length; i++) {
      address rt = rts[i];
      uint amount = IERC20(rt).balanceOf(address(this));

      if (amount != 0) {

        // unwrap shares if needs
        if (rt == ps) {
          ISmartVault(rt).exit();
          rt = ISmartVault(rt).underlying();
          amount = IERC20(rt).balanceOf(address(this));
        }

        uint toBb = amount * bbRatio / _BUY_BACK_DENOMINATOR;
        uint toCompound = amount - toBb;

        _approveIfNeeds(rt, amount, forwarder);

        if (toBb != 0) {
          targetTokenEarnedTotal += IFeeRewardForwarder(forwarder).distribute(toBb, rt, vault);
        }

        if (toCompound != 0) {
          IFeeRewardForwarder(forwarder).liquidate(rt, und, toCompound);
        }
      }
    }

    if (targetTokenEarnedTotal > 0) {
      IBookkeeper(ctrl.bookkeeper()).registerStrategyEarned(targetTokenEarnedTotal);
    }
  }

  /// @dev Platform name for statistical purposes
  /// @return Platform enum index
  function platform() external override pure returns (Platform) {
    return Platform.DYSTOPIA;
  }

  function _approveIfNeeds(address token, uint amount, address spender) internal {
    if (IERC20(token).allowance(address(this), spender) < amount) {
      IERC20(token).safeApprove(spender, 0);
      IERC20(token).safeApprove(spender, type(uint).max);
    }
  }
}
