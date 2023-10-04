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
import "../../third_party/IERC20Extended.sol";
import "../../third_party/tangible/ICaviarChef.sol";
import "../../interfaces/ITetuLiquidator.sol";

/// @title Strategy for Caviar staking pool farming
/// @author AlehN
abstract contract CaviarStakingStrategyBase is ProxyStrategyBase {
  using SafeERC20 for IERC20;

  // *******************************************************
  //                      CONSTANTS
  // *******************************************************

  /// @notice Strategy type for statistical purposes
  string public constant override STRATEGY_NAME = "CaviarStakingStrategyBase";
  /// @notice Version of the contract
  /// @dev Should be incremented when contract changed
  string public constant VERSION = "1.0.1";

  uint private constant PRICE_IMPACT_TOLERANCE = 10_000;
  ITetuLiquidator public constant TETU_LIQUIDATOR = ITetuLiquidator(0xC737eaB847Ae6A92028862fE38b828db41314772);
  address internal constant DEFAULT_PERF_FEE_RECEIVER = 0x9Cc199D4353b5FB3e6C8EEBC99f5139e0d8eA06b;
  ICaviarChef public constant CAVIAR_CHEF = ICaviarChef(0x83C5022745B2511Bd199687a42D27BEFd025A9A9);
  address internal constant CAVIAR_TOKEN = 0x6AE96Cc93331c19148541D4D2f31363684917092;
  address internal constant USDR_TOKEN = 0x40379a439D4F6795B6fc9aa5687dB461677A2dBa;


  // *******************************************************
  //                      VARIABLES
  // *******************************************************

  /// @notice Initialize contract after setup it as proxy implementation
  function initializeStrategy(
    address controller_,
    address vault_,
    uint buybackRatio_
  )public initializer {
    address[] memory rewardTokens_ = new address[](2);
    rewardTokens_[0] = CAVIAR_TOKEN;
    rewardTokens_[1] = USDR_TOKEN;

    ProxyStrategyBase.initializeStrategyBase(
      controller_,
      address(CAVIAR_CHEF.underlying()),
      vault_,
      rewardTokens_,
      buybackRatio_
    );

  }

  // *******************************************************
  //                      GOV ACTIONS
  // *******************************************************

  /// @dev Set new reward tokens
  function setRewardTokens(address[] memory rts) external restricted {
    delete _rewardTokens;
    for (uint i = 0; i < rts.length; i++) {
      _rewardTokens.push(rts[i]);
      _unsalvageableTokens[rts[i]] = true;
    }
  }

  // *******************************************************
  //                      STRATEGY LOGIC
  // *******************************************************

  /// @dev Returns CAVIAR amount under control
  function _rewardPoolBalance() internal override view returns (uint256 bal) {
    (bal,) = CAVIAR_CHEF.userInfo(address(this));
  }

  /// @dev not used, returns empty array
  function readyToClaim() external view override returns (uint256[] memory) {
    // caviarChef shows rewards in wUSDR but harvest returns USDR need to convert
    uint256[] memory toClaim = new uint256[](_rewardTokens.length);
    return toClaim;
  }

  /// @dev Return TVL of the farmable pool
  function poolTotalAmount() external view override returns (uint256) {
    return IERC20(_underlying()).balanceOf(address(CAVIAR_CHEF));
  }

  /// @dev Platform name for statistical purposes
  /// @return Platform enum index
  function platform() external override pure returns (Platform) {
    return Platform.TANGIBLE;
  }

  /// @dev assets should reflect underlying tokens need to investing
  function assets() external override view returns (address[] memory) {
    address[] memory tokens = new address[](1);
    tokens[0] = address(CAVIAR_CHEF.underlying());
    return tokens;
  }

  /// @dev Stake Caviar tokens to caviarChef to earn rewards
  function depositToPool(uint256 amount) internal override {
    if (amount != 0) {
      _approveIfNeeds(_underlying(), amount, address(CAVIAR_CHEF));
      CAVIAR_CHEF.deposit(amount, address(this));
    }
  }

  /// @dev Withdraw staked tokens from CaviarChef
  function withdrawAndClaimFromPool(uint256 amount) internal override {
    if (amount != 0) {
      CAVIAR_CHEF.withdrawAndHarvest(amount, address(this));
    }
    _doHardWork(true);
  }

  /// @dev Withdraw staked tokens from CaviarChef without claiming rewards
  function emergencyWithdrawFromPool() internal override {
    CAVIAR_CHEF.emergencyWithdraw(address(this));
  }

  /// @dev Collect profit and do something useful with them
  function doHardWork() external onlyNotPausedInvesting override hardWorkers {
      _doHardWork(false);
  }

  /// @dev Deprecated
  function liquidateReward() internal override {
    // noop
  }

  function _doHardWork(bool silently) internal {
    uint pendingReward = 0;
    // caviarChef.pendingReward can revert if no rewards
    try CAVIAR_CHEF.pendingReward(address(this)) returns (uint reward) {
      pendingReward = reward;
    } catch {}

    uint undBalBeforeHarvest = IERC20(_underlying()).balanceOf(address(this));
    if(pendingReward > 0){
      // harvest will send USDR and CAVIAR tokens as reward but CAVIAR is not return by caviarChef.rewardTokens()
      // so we need to store CAVIAR balance before harvest and send this value to the "_liquidateRewards" method.
      CAVIAR_CHEF.harvest(address(this));
    }
    _liquidateRewards(silently, undBalBeforeHarvest);
  }

  function _liquidateRewards(bool silently, uint undBalBeforeHarvest) internal {
    uint bbRatio = _buyBackRatio();
    address underlying = _underlying();
    address[] memory rts = _rewardTokens;
    for (uint i = 0; i < rts.length; i++) {
      address rt = rts[i];
      uint amount = IERC20(rt).balanceOf(address(this));

      if(rt == underlying){
        amount = amount - undBalBeforeHarvest;
      }

      if (amount != 0) {
        uint toCompound = amount * (_BUY_BACK_DENOMINATOR - bbRatio) / _BUY_BACK_DENOMINATOR;
        uint toGov = amount - toCompound;
        if (toCompound != 0) {
          _liquidate(rt, underlying, toCompound, silently);
        }
        if (toGov != 0) {
          IERC20(rt).safeTransfer(DEFAULT_PERF_FEE_RECEIVER, toGov);
        }
      }
    }
    uint undBalance = IERC20(underlying).balanceOf(address(this)) - undBalBeforeHarvest;

    if (undBalance != 0) {
      _approveIfNeeds(underlying, undBalance, address(CAVIAR_CHEF));
      CAVIAR_CHEF.deposit(undBalance, address(this));
    }
    IBookkeeper(IController(_controller()).bookkeeper()).registerStrategyEarned(0);
  }

  function _liquidate(address tokenIn, address tokenOut, uint amount, bool silently) internal {

    if (amount != 0) {
      _approveIfNeeds(tokenIn, amount, address(TETU_LIQUIDATOR));
      // don't revert on errors
      if (silently) {
        try TETU_LIQUIDATOR.liquidate(tokenIn, tokenOut, amount, PRICE_IMPACT_TOLERANCE) {} catch {}
      } else {
        TETU_LIQUIDATOR.liquidate(tokenIn, tokenOut, amount, PRICE_IMPACT_TOLERANCE);
      }
    }
  }

  function _approveIfNeeds(address token, uint amount, address spender) internal {
    if (IERC20(token).allowance(address(this), spender) < amount) {
      IERC20(token).safeApprove(spender, 0);
      IERC20(token).safeApprove(spender, type(uint).max);
    }
  }

  //slither-disable-next-line unused-state
  uint256[50] private ______gap;
}
