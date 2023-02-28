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
import "../../third_party/dforce/IiToken.sol";
import "../../third_party/dforce/IRewardDistributorV3.sol";

/// @title Contract for DForce strategy implementation
/// @author belbix
abstract contract DForceStrategyBase is ProxyStrategyBase {
  using SafeERC20 for IERC20;

  /// ******************************************************
  ///                Constants and variables
  /// ******************************************************

  /// @notice Version of the contract
  string public constant VERSION = "1.0.0";

  IStrategy.Platform private constant _PLATFORM = IStrategy.Platform.D_FORCE;
  uint private constant _DUST = 10_000;

  /// @notice Strategy type for statistical purposes
  string public constant override STRATEGY_NAME = "DForceStrategyBase";
  IRewardDistributorV3 public constant REWARD_DISTRIBUTOR = IRewardDistributorV3(0x47C19A2ab52DA26551A22e2b2aEED5d19eF4022F);

  IiToken public iToken;
  uint private localBalance;


  /// ******************************************************
  ///                    Initialization
  /// ******************************************************

  /// @notice Initialize contract after setup it as proxy implementation
  function initializeStrategy(
    address controller_,
    address underlying_,
    address vault_,
    uint buybackRatio_,
    address[] memory __rewardTokens,
    address _iToken
  ) public initializer {
    ProxyStrategyBase.initializeStrategyBase(
      controller_,
      underlying_,
      vault_,
      __rewardTokens,
      buybackRatio_
    );

    iToken = IiToken(_iToken);
    require(IiToken(_iToken).underlying() == _underlying(), "Wrong underlying");
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

  /// ******************************************************
  ///                    Views
  /// ******************************************************

  /// @notice Invested assets in the pool
  function _rewardPoolBalance() internal override view returns (uint) {
    IiToken _iToken = iToken;
    return _iToken.balanceOf(address(this)) * _iToken.exchangeRateStored() / 1e18;
  }

  /// @notice Return approximately amount of reward tokens ready to claim
  function readyToClaim() external view override returns (uint[] memory) {
    uint[] memory rewards = new uint[](1);
    rewards[0] = REWARD_DISTRIBUTOR.reward(address(this));
    return rewards;
  }

  /// @notice TVL of the underlying in the pool
  function poolTotalAmount() external view override returns (uint256) {
    return iToken.getCash() + iToken.totalBorrows() - iToken.totalReserves();
  }

  /// ******************************************************
  ///              Do hard work
  /// ******************************************************

  function doHardWork() external onlyNotPausedInvesting override hardWorkers {
    _forwardBuybacks(false);
  }

  /// ******************************************************
  ///              Internal logic implementation
  /// ******************************************************

  /// @dev Deposit underlying to the pool
  /// @param amount Deposit amount
  function depositToPool(uint256 amount) internal override {
    address u = _underlying();
    IiToken _iToken = iToken;
    amount = Math.min(IERC20(u).balanceOf(address(this)), amount);
    if (amount > 0) {
      _approveIfNeeds(u, amount, address(_iToken));
      _iToken.mintForSelfAndEnterMarket(amount);

      localBalance += amount;
    }
  }

  /// @dev Withdraw underlying from the pool
  function withdrawAndClaimFromPool(uint256 amount_) internal override {
    _forwardBuybacks(true);

    uint amountToWithdraw = Math.min(amount_, iToken.balanceOfUnderlying(address(this)));
    localBalance > amountToWithdraw ? localBalance -= amountToWithdraw : localBalance = 0;
    iToken.redeemUnderlying(address(this), amountToWithdraw);
  }

  /// @dev Exit from external project without caring about rewards, for emergency cases only
  function emergencyWithdrawFromPool() internal override {
    iToken.redeemUnderlying(address(this), _rewardPoolBalance());
    localBalance = 0;
  }

  function liquidateReward() internal override {
    // noop
  }

  function platform() external override pure returns (IStrategy.Platform) {
    return _PLATFORM;
  }

  /// @dev assets should reflect underlying tokens need to investing
  function assets() external override view returns (address[] memory) {
    address[] memory arr = new address[](1);
    arr[0] = _underlying();
    return arr;
  }

  /// @dev Claim distribution rewards
  function _claimReward() internal {
    address[] memory holders = new address[](1);
    holders[0] = address(this);
    address[] memory rts = new address[](1);
    rts[0] = address(iToken);
    REWARD_DISTRIBUTOR.claimReward(holders, rts);
  }

  function _claimAndLiquidate(bool silent) internal returns (uint){
    address und = _underlying();
    uint underlyingBalance = IERC20(und).balanceOf(address(this));
    _claimReward();
    address targetVault = _vault();
    address forwarder = IController(_controller()).feeRewardForwarder();
    uint targetTokenEarned;
    address[] memory rts = _rewardTokens;
    for (uint i; i < rts.length; ++i) {
      address rt = rts[i];
      uint amount = IERC20(rt).balanceOf(address(this));
      if (und == rt) {
        // if claimed underlying exclude what we had before the claim
        amount = amount - underlyingBalance;
      }
      if (amount > _DUST) {

        uint toBuyBacks = amount * _buyBackRatio() / _BUY_BACK_DENOMINATOR;
        uint toCompound = amount - toBuyBacks;

        if (toBuyBacks != 0) {
          _approveIfNeeds(rt, toBuyBacks, forwarder);
          if (silent) {
            try IFeeRewardForwarder(forwarder).distribute(toBuyBacks, rt, targetVault) returns (uint r) {
              targetTokenEarned += r;
            } catch {}
          } else {
            targetTokenEarned += IFeeRewardForwarder(forwarder).distribute(toBuyBacks, rt, targetVault);
          }
        }

        if (toCompound != 0 && und != rt) {
          if (silent) {
            try IFeeRewardForwarder(forwarder).liquidate(rt, und, toCompound) returns (uint r) {
              underlyingBalance += r;
            } catch {}
          } else {
            underlyingBalance += IFeeRewardForwarder(forwarder).liquidate(rt, und, toCompound);
          }
        } else {
          underlyingBalance += toCompound;
        }
      }
    }

    if (underlyingBalance != 0) {
      iToken.mintForSelfAndEnterMarket(underlyingBalance);
      localBalance += underlyingBalance;
    }

    return targetTokenEarned;
  }

  /// @notice calculate and send buyback
  function _forwardBuybacks(bool silent) internal returns (uint poolBalance) {

    poolBalance = iToken.balanceOfUnderlying(address(this));

    address u = _underlying();
    IController c = IController(_controller());
    uint targetTokenEarned = _claimAndLiquidate(silent);
    uint _localBalance = localBalance;

    if (poolBalance != 0 && poolBalance > _localBalance) {
      uint profit = poolBalance - _localBalance;

      // protection if something went wrong
      require(_localBalance < _DUST || profit < poolBalance / 20, 'Too huge profit');

      uint toBuybacks = profit * _buyBackRatio() / _BUY_BACK_DENOMINATOR;
      uint remaining = profit - toBuybacks;

      if (toBuybacks > _DUST) {
        localBalance += remaining;
        iToken.redeemUnderlying(address(this), toBuybacks);

        address forwarder = c.feeRewardForwarder();
        _approveIfNeeds(u, toBuybacks, forwarder);

        // small amounts produce 'F2: Zero swap amount' error in distribute, so we need try/catch
        if (silent) {
          try IFeeRewardForwarder(forwarder).distribute(toBuybacks, u, _vault()) returns (uint r) {
            targetTokenEarned += r;
          } catch {}
        } else {
          targetTokenEarned += IFeeRewardForwarder(forwarder).distribute(toBuybacks, u, _vault());
        }
      }
    }

    IBookkeeper(c.bookkeeper()).registerStrategyEarned(targetTokenEarned);
  }

  /// ******************************************************
  ///                       Utils
  /// ******************************************************

  function _approveIfNeeds(address token, uint amount, address spender) internal {
    if (IERC20(token).allowance(address(this), spender) < amount) {
      IERC20(token).safeApprove(spender, 0);
      IERC20(token).safeApprove(spender, type(uint).max);
    }
  }

}
