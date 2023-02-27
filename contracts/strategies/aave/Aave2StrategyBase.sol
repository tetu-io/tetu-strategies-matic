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
import "../../third_party/aave/IAToken.sol";
import "../../third_party/aave/ILendingPool.sol";
import "../../third_party/aave/IAaveIncentivesController.sol";
import "../../third_party/aave/IProtocolDataProvider.sol";

/// @title Contract for AAVEv2 strategy simplified
/// @author belbix
abstract contract Aave2StrategyBase is ProxyStrategyBase {
  using SafeERC20 for IERC20;

  /// ******************************************************
  ///                Constants and variables
  /// ******************************************************

  /// @notice Version of the contract
  /// @dev Should be incremented when contract changed
  string public constant VERSION = "1.0.0";

  IStrategy.Platform private constant _PLATFORM = IStrategy.Platform.AAVE_LEND;

  /// @notice Strategy type for statistical purposes
  string public constant override STRATEGY_NAME = "Aave2StrategyBase";

  ILendingPool public constant AAVE_LENDING_POOL = ILendingPool(0x8dFf5E27EA6b7AC08EbFdf9eB090F32ee9a30fcf);
  IAaveIncentivesController public constant AAVE_CONTROLLER = IAaveIncentivesController(0x357D51124f59836DeD84c8a1730D72B749d8BC23);
  IProtocolDataProvider public constant AAVE_DATA_PROVIDER = IProtocolDataProvider(0x7551b5D2763519d4e37e8B81929D336De671d46d);

  address public aToken;
  address public dToken;
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
    address[] memory __rewardTokens
  ) public initializer {
    ProxyStrategyBase.initializeStrategyBase(
      controller_,
      underlying_,
      vault_,
      __rewardTokens,
      buybackRatio_
    );

    (aToken,,dToken) = AAVE_DATA_PROVIDER.getReserveTokensAddresses(underlying_);
    address _lpt = IAToken(aToken).UNDERLYING_ASSET_ADDRESS();
    require(_lpt == _underlying(), "Wrong underlying");
  }

  /// ******************************************************
  ///                    Views
  /// ******************************************************

  /// @notice Invested assets in the pool
  function _rewardPoolBalance() internal override view returns (uint) {
    (uint suppliedUnderlying,,,,,,,,) = AAVE_DATA_PROVIDER.getUserReserveData(_underlying(), address(this));
    return suppliedUnderlying;
  }

  /// @notice Return approximately amount of reward tokens ready to claim
  function readyToClaim() external view override returns (uint[] memory) {
    uint[] memory rewards = new uint256[](1);
    rewards[0] = AAVE_CONTROLLER.getUserUnclaimedRewards(address(this));
    return rewards;
  }

  /// @notice TVL of the underlying in the pool
  function poolTotalAmount() external view override returns (uint256) {
    return IERC20(_underlying()).balanceOf(aToken);
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
      _approveIfNeeds(u, amount, address(AAVE_LENDING_POOL));
      AAVE_LENDING_POOL.deposit(u, amount, address(this), 0);

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

    AAVE_LENDING_POOL.withdraw(_underlying(), amountToWithdraw, address(this));
  }

  /// @dev Exit from external project without caring about rewards, for emergency cases only
  function emergencyWithdrawFromPool() internal override {
    AAVE_LENDING_POOL.withdraw(_underlying(), type(uint).max, address(this));
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
    address[] memory a = new address[](2);
    a[0] = aToken;
    a[1] = dToken;
    AAVE_CONTROLLER.claimRewards(a, type(uint256).max, address(this));
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
      if (amount != 0) {

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
      AAVE_LENDING_POOL.deposit(und, underlyingBalance, address(this), 0);
      localBalance += underlyingBalance;
    }

    return targetTokenEarned;
  }

  /// @notice calculate and send buyback
  function _forwardBuybacks(bool silent) internal returns (uint poolBalance){
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
        AAVE_LENDING_POOL.withdraw(u, toBuybacks, address(this));

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
