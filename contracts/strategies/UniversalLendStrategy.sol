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

/// @title Universal base strategy for simple lending
/// @author belbix
abstract contract UniversalLendStrategy is ProxyStrategyBase {
  using SafeERC20 for IERC20;

  /// ******************************************************
  ///                Constants and variables
  /// ******************************************************
  uint private constant _DUST = 10_000;
  address private constant _PERF_FEE_TREASURY = 0x9Cc199D4353b5FB3e6C8EEBC99f5139e0d8eA06b;

  uint internal localBalance;
  uint public lastHw;
  bool public isProfitSharingDisabled;

  /// ******************************************************
  ///                    Initialization
  /// ******************************************************

  /// @notice Initialize contract after setup it as proxy implementation
  function initializeLendStrategy(
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
    isProfitSharingDisabled = true;
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

  function setProfitSharingDisabled(bool value) external restricted {
    isProfitSharingDisabled = value;
  }

  /// ******************************************************
  ///              Do hard work
  /// ******************************************************

  function doHardWork() external onlyNotPausedInvesting override hardWorkers {
    _doHardWork(false, true);
  }

  /// ******************************************************
  ///              Specific Internal logic
  /// ******************************************************

  /// @dev Deposit to pool and increase local balance
  function _simpleDepositToPool(uint amount) internal virtual;

  /// @dev Refresh rates and return actual deposited balance in underlying tokens
  function _getActualPoolBalance() internal virtual returns (uint);

  /// @dev Perform only withdraw action, without changing local balance
  function _withdrawFromPoolWithoutChangeLocalBalance(uint amount, uint poolBalance) internal virtual returns (bool withdrewAll);

  /// @dev Withdraw all and set localBalance to zero
  function _withdrawAllFromPool() internal virtual;

  /// @dev Claim all possible rewards to the current contract
  function _claimReward() internal virtual;

  /// ******************************************************
  ///              Internal logic implementation
  /// ******************************************************

  /// @dev Deposit underlying to the pool
  /// @param amount Deposit amount
  function depositToPool(uint256 amount) internal override {
    address u = _underlying();
    amount = Math.min(IERC20(u).balanceOf(address(this)), amount);
    if (amount > 0) {
      _simpleDepositToPool(amount);
    }
  }

  /// @dev Withdraw underlying from the pool
  function withdrawAndClaimFromPool(uint256 amount_) internal override {
    uint poolBalance = _doHardWork(true, false);

    bool withdrewAll = _withdrawFromPoolWithoutChangeLocalBalance(amount_, poolBalance);

    if (withdrewAll) {
      localBalance = 0;
    } else {
      localBalance > amount_ ? localBalance -= amount_ : localBalance = 0;
    }
  }

  /// @dev Exit from external project without caring about rewards, for emergency cases only
  function emergencyWithdrawFromPool() internal override {
    _withdrawAllFromPool();
  }

  function liquidateReward() internal override {
    // noop
  }

  /// @dev assets should reflect underlying tokens need to investing
  function assets() external override view returns (address[] memory) {
    address[] memory arr = new address[](1);
    arr[0] = _underlying();
    return arr;
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
        _approveIfNeeds(rt, amount, forwarder);

        uint toBuyBacks = _calcToBuyback(amount, localBalance);
        uint toCompound = amount - toBuyBacks;

        if (toBuyBacks != 0) {
          if (isProfitSharingDisabled) {
            IERC20(rt).safeTransfer(_PERF_FEE_TREASURY, toBuyBacks);
          } else {
            if (silent) {
              try IFeeRewardForwarder(forwarder).distribute(toBuyBacks, rt, targetVault) returns (uint r) {
                targetTokenEarned += r;
              } catch {}
            } else {
              targetTokenEarned += IFeeRewardForwarder(forwarder).distribute(toBuyBacks, rt, targetVault);
            }
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
      _simpleDepositToPool(underlyingBalance);
    }

    return targetTokenEarned;
  }

  function _doHardWork(bool silent, bool push) internal returns (uint poolBalance) {
    poolBalance = _getActualPoolBalance();

    uint _lastHw = lastHw;
    if (!push && _lastHw != 0 && (block.timestamp - _lastHw) < 12 hours) {
      return poolBalance;
    }
    lastHw = block.timestamp;

    address u = _underlying();
    IController c = IController(_controller());
    uint targetTokenEarned = _claimAndLiquidate(silent);
    uint _localBalance = localBalance;

    if (poolBalance != 0 && poolBalance > _localBalance) {
      uint profit = poolBalance - _localBalance;

      // protection if something went wrong
      require(_localBalance < _DUST || profit < poolBalance / 20, 'Too huge profit');

      uint toBuybacks = _calcToBuyback(profit, _localBalance);
      uint remaining = profit - toBuybacks;
      if (remaining != 0) {
        localBalance += remaining;
      }

      if (toBuybacks > _DUST) {

        // if no users, withdraw all and send to controller for remove dust from this contract
        if (toBuybacks == poolBalance) {
          _withdrawAllFromPool();
          IERC20(u).safeTransfer(address(c), IERC20(u).balanceOf(address(this)));
        } else {
          bool withdrewAll = _withdrawFromPoolWithoutChangeLocalBalance(toBuybacks, poolBalance);
          if (withdrewAll) {
            localBalance = 0;
          }

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

  function _calcToBuyback(uint amount, uint _localBalance) internal view returns (uint) {
    if (_localBalance == 0) {
      // move all profit to buybacks if no users
      return amount;
    } else {
      return amount * _buyBackRatio() / _BUY_BACK_DENOMINATOR;
    }
  }

  //slither-disable-next-line unused-state
  uint256[47] private ______gap;
}
