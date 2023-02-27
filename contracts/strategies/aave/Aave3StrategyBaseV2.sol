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

import "../../third_party/aave3/IAave3Pool.sol";
import "../../third_party/aave3/IAave3Token.sol";
import "@tetu_io/tetu-contracts/contracts/base/strategies/ProxyStrategyBase.sol";
import "../../third_party/aave/IRewardsController.sol";

/// @title Contract for AAVEv3 strategy implementation, a bit simplified comparing with v1
/// @author dvpublic
abstract contract Aave3StrategyBaseV2 is ProxyStrategyBase {
  using SafeERC20 for IERC20;

  /// ******************************************************
  ///                Constants and variables
  /// ******************************************************

  /// @notice Version of the contract
  /// @dev Should be incremented when contract changed
  string public constant VERSION = "1.0.0";

  IStrategy.Platform private constant _PLATFORM = IStrategy.Platform.AAVE_LEND; // same as for AAVEv2

  /// @notice Strategy type for statistical purposes
  string public constant override STRATEGY_NAME = "Aave3StrategyBaseV2";
  IRewardsController internal constant _AAVE_INCENTIVES = IRewardsController(0x929EC64c34a17401F460460D4B9390518E5B473e);
  IAave3Pool constant public AAVE_V3_POOL_MATIC = IAave3Pool(0x794a61358D6845594F94dc1DB02A252b5b4814aD);

  uint localBalance;


  /// ******************************************************
  ///                    Initialization
  /// ******************************************************

  /// @notice Initialize contract after setup it as proxy implementation
  function initializeStrategy(
    address controller_,
    address underlying_,
    address vault_,
    uint buybackRatio_,
    address[] memory __rewardTokens
  ) public initializer {
    ProxyStrategyBase.initializeStrategyBase(
      controller_,
      underlying_,
      vault_,
      __rewardTokens,
      buybackRatio_
    );

    require(_aToken().UNDERLYING_ASSET_ADDRESS() == underlying_, "wrong underlying");
  }

  /// ******************************************************
  ///                    Views
  /// ******************************************************

  /// @notice Strategy balance in the pool
  /// @dev This is amount that we can withdraw
  /// @return Balance amount in underlying tokens
  function _rewardPoolBalance() internal override view returns (uint256) {
    uint normalizedIncome = AAVE_V3_POOL_MATIC.getReserveNormalizedIncome(_underlying());

    // total aToken balance of the user
    // see aave-v3-core, GenericLogic.sol, implementation of _getUserBalanceInBaseCurrency
    return (0.5e27 + _aToken().scaledBalanceOf(address(this)) * normalizedIncome) / 1e27;
  }

  /// @notice Return approximately amount of reward tokens ready to claim in AAVE-pool
  /// @dev AAVE v3 doesn't have rewards on Polygon
  function readyToClaim() external view override returns (uint256[] memory) {
    return new uint[](_rewardTokens.length);
  }

  /// @notice TVL of the underlying in the pool
  /// @dev Only for statistic
  /// @return Pool TVL
  function poolTotalAmount() external view override returns (uint256) {
    // scaled total supply
    return _aToken().totalSupply();
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
    amount = Math.min(IERC20(u).balanceOf(address(this)), amount);
    if (amount > 0) {
      _approveIfNeeds(u, amount, address(AAVE_V3_POOL_MATIC));
      AAVE_V3_POOL_MATIC.supply(u, amount, address(this), 0);

      localBalance += amount;
    }
  }

  /// @dev Withdraw underlying from the pool
  function withdrawAndClaimFromPool(uint256 amount_) internal override {
    uint poolBalance = _forwardBuybacks(true);

    uint amountToWithdraw = amount_;
    localBalance > amountToWithdraw ? localBalance -= amountToWithdraw : localBalance = 0;

    if (amount_ >= poolBalance) {
      // for full withdraw need to call max value, otherwise revert is possible
      amountToWithdraw = type(uint).max;
    }
    AAVE_V3_POOL_MATIC.withdraw(_underlying(), amountToWithdraw, address(this));
  }

  /// @dev Exit from external project without caring about rewards, for emergency cases only
  function emergencyWithdrawFromPool() internal override {
    AAVE_V3_POOL_MATIC.withdraw(
      _underlying(),
      type(uint256).max, // withdraw all, see https://docs.aave.com/developers/core-contracts/pool#withdraw
      address(this)
    );
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

  function _claimAndLiquidate(bool silent) internal returns (uint) {
    address und = _underlying();
    uint underlyingBalance = IERC20(und).balanceOf(address(this));
    address[] memory _assets = new address[](1);
    _assets[0] = address(_aToken());
    (address[] memory rts, uint[] memory unclaimedAmounts) = _AAVE_INCENTIVES.claimAllRewardsToSelf(_assets);
    address targetVault = _vault();
    address forwarder = IController(_controller()).feeRewardForwarder();
    uint targetTokenEarned;
    for (uint i; i < rts.length; ++i) {
      address rt = rts[i];
      uint amount = unclaimedAmounts[i];
      if (und == rt) {
        // if claimed underlying exclude what we had before the claim
        amount = amount - underlyingBalance;
      }
      if (amount != 0) {

        uint toBuyBacks = amount * _buyBackRatio() / _BUY_BACK_DENOMINATOR;
        uint toCompound = amount - toBuyBacks;

        if (toBuyBacks != 0) {
          _approveIfNeeds(rt, amount, forwarder);
          if (silent) {
            try IFeeRewardForwarder(forwarder).distribute(amount, rt, targetVault) returns (uint r) {
              targetTokenEarned += r;
            } catch {}
          } else {
            targetTokenEarned += IFeeRewardForwarder(forwarder).distribute(amount, rt, targetVault);
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
      AAVE_V3_POOL_MATIC.supply(und, underlyingBalance, address(this), 0);
      localBalance += underlyingBalance;
    }

    return targetTokenEarned;
  }

  /// @notice calculate and send buyback
  function _forwardBuybacks(bool silent) internal returns (uint poolBalance) {
    address u = _underlying();
    IController c = IController(_controller());
    uint targetTokenEarned = _claimAndLiquidate(silent);

    poolBalance = _rewardPoolBalance();
    if (poolBalance != 0 && poolBalance > localBalance) {
      uint profit = poolBalance - localBalance;

      uint toBuybacks = profit * _buyBackRatio() / _BUY_BACK_DENOMINATOR;
      uint remaining = profit - toBuybacks;
      localBalance += remaining;

      if (toBuybacks != 0) {
        AAVE_V3_POOL_MATIC.withdraw(u, toBuybacks, address(this));

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
  function _aToken() internal view returns (IAave3Token) {
    return IAave3Token(AAVE_V3_POOL_MATIC.getReserveData(_underlying()).aTokenAddress);
  }

  function _approveIfNeeds(address token, uint amount, address spender) internal {
    if (IERC20(token).allowance(address(this), spender) < amount) {
      IERC20(token).safeApprove(spender, 0);
      IERC20(token).safeApprove(spender, type(uint).max);
    }
  }

}
