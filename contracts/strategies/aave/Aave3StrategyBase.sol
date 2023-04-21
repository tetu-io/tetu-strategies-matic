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

/// @title Contract for AAVEv3 strategy implementation
/// @dev AAVE3 doesn't support rewards on Polygon, so this strategy doesn't support rewards
/// @author dvpublic
abstract contract Aave3StrategyBase is ProxyStrategyBase {
  using SafeERC20 for IERC20;

  /// ******************************************************
  ///                Constants and variables
  /// ******************************************************

  /// @notice Version of the contract
  /// @dev Should be incremented when contract changed
  string public constant VERSION = "1.0.2";

  IStrategy.Platform private constant _PLATFORM = IStrategy.Platform.AAVE_LEND; // same as for AAVEv2

  /// @notice Strategy type for statistical purposes
  string public constant override STRATEGY_NAME = "Aave3StrategyBase";
  IRewardsController internal constant _AAVE_INCENTIVES = IRewardsController(0x929EC64c34a17401F460460D4B9390518E5B473e);

  /// @notice AAVE3 pool, see https://docs.aave.com/developers/core-contracts/pool
  IAave3Pool internal _pool;

  /// @notice Total deposited amount
  uint internal _totalDeposited;
  /// @notice Total withdrawn amount
  uint internal _totalWithdrawn;
  /// @notice Part of income for which buybacks were taken
  /// @dev See detailed description of calculation below in section "Buybacks"
  uint internal _totalIncomeProcessed;


  /// ******************************************************
  ///                    Initialization
  /// ******************************************************

  /// @notice Initialize contract after setup it as proxy implementation
  function initializeStrategy(
    address controller_,
    address underlying_,
    address vault_,
    address pool_,
    uint buybackRatio_
  ) public initializer {
    ProxyStrategyBase.initializeStrategyBase(
      controller_,
      underlying_,
      vault_,
      new address[](0), // there are no rewards
      buybackRatio_
    );

    require(pool_ != address(0), "zero pool");
    _pool = IAave3Pool(pool_);

    require(_aToken().UNDERLYING_ASSET_ADDRESS() == underlying_, "wrong underlying");
  }

  /// ******************************************************
  ///                    Views
  /// ******************************************************

  /// @notice Strategy balance in the aave3-pool
  /// @dev This is amount that we can withdraw
  /// @return Balance amount in underlying tokens
  function _rewardPoolBalance() internal override view returns (uint256) {
    uint normalizedIncome = _pool.getReserveNormalizedIncome(_underlying());

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

  /// @dev Deposit underlying to AAVE3 pool
  /// @param amount Deposit amount
  function depositToPool(uint256 amount) internal override {
    address u = _underlying();
    amount = Math.min(IERC20(u).balanceOf(address(this)), amount);
    if (amount > 0) {
      _approveIfNeeds(u, amount, address(_pool));
      _pool.supply(u, amount, address(this), 0);

      _totalDeposited += amount;
    }
  }

  /// @dev Withdraw underlying from AAVE3 pool
  function withdrawAndClaimFromPool(uint256 amount_) internal override {
    // take buybacks..
    _forwardBuybacks(true);

    // ..and withdraw remaining amount
    uint amountToWithdraw = Math.min(_rewardPoolBalance(), amount_);
    _pool.withdraw(_underlying(), amountToWithdraw, address(this));
    _totalWithdrawn += amountToWithdraw;
  }

  /// @dev Exit from external project without caring about rewards, for emergency cases only
  function emergencyWithdrawFromPool() internal override {
    address u = _underlying();
    uint balanceBefore = IERC20(u).balanceOf(address(this));
    _pool.withdraw(
      u,
      type(uint256).max, // withdraw all, see https://docs.aave.com/developers/core-contracts/pool#withdraw
      address(this)
    );
    _totalWithdrawn += balanceBefore - IERC20(u).balanceOf(address(this));
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

  function _claimAndLiquidate(bool silent) internal returns (uint){
    address[] memory _assets = new address[](1);
    _assets[0] = address(_aToken());
    (address[] memory rts, uint[] memory unclaimedAmounts) = _AAVE_INCENTIVES.claimAllRewardsToSelf(_assets);
    address targetVault = _vault();
    address forwarder = IController(_controller()).feeRewardForwarder();
    uint targetTokenEarned;
    for (uint i; i < rts.length; ++i) {
      address rt = rts[i];
      uint amount = unclaimedAmounts[i];
      if (amount != 0) {
        _approveIfNeeds(rt, amount, forwarder);
        if (silent) {
          try IFeeRewardForwarder(forwarder).distribute(amount, rt, targetVault) returns (uint r) {
            targetTokenEarned += r;
          } catch {}
        } else {
          targetTokenEarned += IFeeRewardForwarder(forwarder).distribute(amount, rt, targetVault);
        }
      }
    }

    return targetTokenEarned;
  }

  /// ******************************************************
  ///                   Buybacks
  ///  D - total deposit, W - total withdrawn amount,
  ///  B - current balance given by _rewardPoolBalance
  ///  I - income generated by AAVE
  ///  BB - buyback
  ///
  ///  B = D - W + I
  ///  In theory we have: BB = I * 10%
  ///  In practice we take buybacks on each hardwork-step,
  ///  so we have following situation:
  ///     B1 = D1 - W1 + I1, BB1 = I1 * 10%
  ///     B2 = D2 - W2 + I2, BB2 = (I2 - I1) * 10%
  ///     B3 = D3 - W3 + I3, BB3 = (I3 - I2) * 10%
  ///  and result BB = BB1 + BB2 + BB3.
  ///
  /// So, on i-th step we need to know I_{i-1}
  /// We store this sum in _totalIncomeProcessed
  /// ******************************************************

  /// @notice calculate and send buyback
  function _forwardBuybacks(bool silent) internal {
    address u = _underlying();
    IController c = IController(_controller());
    uint targetTokenEarned = _claimAndLiquidate(silent);

    uint poolBalance = _rewardPoolBalance();
    if (poolBalance != 0 && (poolBalance + _totalWithdrawn) >= _totalDeposited) {
      uint totalIncome = poolBalance + _totalWithdrawn - _totalDeposited;

      // _lastTotalIncome can increase totalIncome a bit after withdrawing toBuybacks-amount from the pool
      uint toBuybacks = totalIncome > _totalIncomeProcessed
      ? (totalIncome - _totalIncomeProcessed) * _buyBackRatio() / _BUY_BACK_DENOMINATOR
      : 0;
      if (toBuybacks != 0) {
        _pool.withdraw(u, toBuybacks, address(this));
        uint amountToForward = toBuybacks;

        address forwarder = c.feeRewardForwarder();
        _approveIfNeeds(u, toBuybacks, forwarder);

        // small amounts produce 'F2: Zero swap amount' error in distribute, so we need try/catch
        if (silent) {
          try IFeeRewardForwarder(forwarder).distribute(toBuybacks, u, _vault()) returns (uint r) {
            // buybacks were successfully forwarded
            targetTokenEarned += r;
            amountToForward = 0;

            // remember total amount from which we have already taken buybacks
            _totalIncomeProcessed = totalIncome;
          } catch {}
        } else {
          targetTokenEarned += IFeeRewardForwarder(forwarder).distribute(toBuybacks, u, _vault());
          amountToForward = 0;
          // remember total amount from which we have already taken buybacks
          _totalIncomeProcessed = totalIncome;
        }

        if (amountToForward != 0) {
          // buybacks were not forwarded, so let's return taken amount back to the pool
          _approveIfNeeds(u, amountToForward, address(_pool));
          _pool.supply(u, amountToForward, address(this), 0);
        }
      }
    }

    IBookkeeper(c.bookkeeper()).registerStrategyEarned(targetTokenEarned);
  }

  /// ******************************************************
  ///                       Utils
  /// ******************************************************
  function _aToken() internal view returns (IAave3Token) {
    return IAave3Token(_pool.getReserveData(_underlying()).aTokenAddress);
  }

  function _approveIfNeeds(address token, uint amount, address spender) internal {
    if (IERC20(token).allowance(address(this), spender) < amount) {
      IERC20(token).safeApprove(spender, 0);
      IERC20(token).safeApprove(spender, type(uint).max);
    }
  }

}
