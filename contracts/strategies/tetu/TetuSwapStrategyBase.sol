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
import "@tetu_io/tetu-contracts/contracts/base/interface/ISmartVault.sol";
import "@tetu_io/tetu-contracts/contracts/swap/interfaces/ITetuSwapPair.sol";

/// @title Abstract contract for Tetu swap strategy implementation
/// @author belbix
abstract contract TetuSwapStrategyBase is ProxyStrategyBase {
  using SafeERC20 for IERC20;

  // ************ CONSTANTS **********************

  /// @notice Strategy type for statistical purposes
  string public constant override STRATEGY_NAME = "TetuSwapStrategyBase";
  /// @notice Version of the contract
  /// @dev Should be incremented when contract changed
  string public constant VERSION = "1.3.0";

  /// @dev TetuSwap router
  address public constant TETU_SWAP_ROUTER = 0xBCA055F25c3670fE0b1463e8d470585Fe15Ca819;
  uint internal constant _DUST = 10000;

  // ************ VARIABLES **********************

  /// @dev In case if TetuSwap pair wanna be disabled we will redirect all rewards to another place/
  address public rewardsDestination;

  // ************ INIT **********************

  function _initializeStrategy(
    address _controller,
    address _underlying,
    address _vault
  ) internal initializer {
    require(_vault != address(0), "Zero vault");
    require(_underlying != address(0), "Zero underlying");

    ProxyStrategyBase.initializeStrategyBase(
      _controller,
      _underlying,
      _vault,
      ISmartVault(_vault).rewardTokens(),
      _BUY_BACK_DENOMINATOR
    );
  }

  // ************* GOV *******************

  /// @dev Set new reward tokens
  function setRewardTokens(address[] memory rts) external restricted {
    delete _rewardTokens;
    for (uint i = 0; i < rts.length; i++) {
      _rewardTokens.push(rts[i]);
      _unsalvageableTokens[rts[i]] = true;
    }
  }

  /// @dev Redirect all rewards to another place. Set zero for disable.
  function setRewardDestination(address value) external restricted {
    rewardsDestination = value;
  }

  // ************* VIEWS *******************

  /// @notice Stabbed to 0. We do not invest LP tokens
  function _rewardPoolBalance() internal override pure returns (uint256) {
    return 0;
  }

  /// @notice Stabbed to 0
  function readyToClaim() external view override returns (uint256[] memory) {
    uint256[] memory rewards = new uint256[](_rewardTokens.length);
    return rewards;
  }

  /// @notice Pair total supply
  function poolTotalAmount() external view override returns (uint256) {
    return IERC20(_underlying()).totalSupply();
  }

  // ************ HARD WORK **************************

  /// @notice Claim rewards from pool and forward them to underlying vault.
  ///         Swap fees will be send to this contract, need to autocompound them
  function doHardWork() external onlyNotPausedInvesting override hardWorkers {
    _doHardWork(false);
  }

  function _doHardWork(bool silently) internal {
    _swapFeesToForwarder(silently);
    ITetuSwapPair(_underlying()).claimAll();
    _redirectPairRewards();
  }

  function _swapFeesToForwarder(bool silently) internal {
    address forwarder = IController(_controller()).feeRewardForwarder();
    address vault = _vault();
    address pair = _underlying();
    uint targetTokenEarned;
    targetTokenEarned += _toForwarder(
      ITetuSwapPair(pair).token0(),
      forwarder,
      vault,
      silently
    );

    targetTokenEarned += _toForwarder(
      ITetuSwapPair(pair).token1(),
      forwarder,
      vault,
      silently
    );

    IBookkeeper(IController(_controller()).bookkeeper()).registerStrategyEarned(targetTokenEarned);
  }

  /// @dev Redirect xTETU to the underlying vault
  function _redirectPairRewards() internal {
    // assume underlying vault contains all possible rewards from pair vaults
    address __vault = _vault();
    address[] memory rts = ISmartVault(__vault).rewardTokens();

    for (uint i; i < rts.length; ++i) {
      address rt = rts[i];
      // it is redirected rewards - PS already had their part of income
      // in case of pair with xTETU-XXX we not able to separate it
      uint256 amount = IERC20(rt).balanceOf(address(this));
      if (amount > _DUST) {
        address _rewardsDestination = rewardsDestination;
        if (_rewardsDestination != address(0)) {
          IERC20(rt).safeTransfer(_rewardsDestination, amount);
        } else {
          _approveIfNeeds(rt, amount, __vault);
          ISmartVault(__vault).notifyTargetRewardAmount(rt, amount);
        }
      }
    }
  }

  function _toForwarder(
    address rt,
    address forwarder,
    address vault,
    bool silently
  ) internal returns (uint targetTokenEarned) {
    targetTokenEarned = 0;
    uint amount = IERC20(rt).balanceOf(address(this));
    if (amount > _DUST) {
      address _rewardsDestination = rewardsDestination;
      if (_rewardsDestination != address(0)) {
        IERC20(rt).safeTransfer(_rewardsDestination, amount);
      } else {
        _approveIfNeeds(rt, amount, forwarder);
        if (silently) {
          // slither-disable-next-line unused-return,variable-scope,uninitialized-local
          try IFeeRewardForwarder(forwarder).distribute(amount, rt, vault) returns (uint r) {
            targetTokenEarned = r;
          } catch {}
        } else {
          IFeeRewardForwarder(forwarder).distribute(amount, rt, vault);
        }
      }
    }
  }

  // ************ INTERNAL LOGIC IMPLEMENTATION **************************

  /// @dev No operations
  function depositToPool(uint256 /*amount*/) internal override {
    _doHardWork(true);
  }

  /// @dev No operations
  function withdrawAndClaimFromPool(uint256 /*amount*/) internal override {
    _doHardWork(true);
  }

  /// @dev No operations
  function emergencyWithdrawFromPool() internal override {
    // noop
  }

  function _approveIfNeeds(address token, uint amount, address spender) internal {
    if (IERC20(token).allowance(address(this), spender) < amount) {
      IERC20(token).safeApprove(spender, 0);
      IERC20(token).safeApprove(spender, type(uint).max);
    }
  }

  function platform() external override pure returns (IStrategy.Platform) {
    return IStrategy.Platform.TETU_SWAP;
  }

  // assets should reflect underlying tokens need to investing
  function assets() external override view returns (address[] memory) {
    address[] memory result = new address[](2);
    result[0] = ITetuSwapPair(_underlying()).token0();
    result[1] = ITetuSwapPair(_underlying()).token1();
    return result;
  }

  function liquidateReward() internal override {/*noop*/}

  //slither-disable-next-line unused-state
  uint256[50] private ______gap;
}
