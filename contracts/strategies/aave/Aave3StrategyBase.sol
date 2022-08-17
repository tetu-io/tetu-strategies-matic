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

import "hardhat/console.sol";

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
  string public constant VERSION = "1.0.0";

  IStrategy.Platform private constant _PLATFORM = IStrategy.Platform.AAVE_LEND; // same as for AAVEv2

  /// @notice Strategy type for statistical purposes
  string public constant override STRATEGY_NAME = "Aave3StrategyBase";

  /// @notice AAVE3 pool, see https://docs.aave.com/developers/core-contracts/pool
  IAave3Pool internal _pool;

  uint internal _totalDeposited;
  uint internal _totalWithdrawn;
  uint internal _receivedBuyback;
  uint internal _preForwarded;
  uint internal _lastDelta;


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
    return _aToken().totalSupply(); // scaled total supply
  }

  /// ******************************************************
  ///              Do hard work
  /// ******************************************************

  function doHardWork() external onlyNotPausedInvesting override hardWorkers {
    _print();
    _forwardBuybacks();
    _print();
  }

  function _print() internal view {
    uint income = _rewardPoolBalance() + _totalWithdrawn - _totalDeposited;
    console.log("PRINT B D W", _rewardPoolBalance(), _totalDeposited, _totalWithdrawn);
    console.log("DDDDD Delta LastIncome", income, _lastDelta);
    console.log("AAAA NewBB", income >= _lastDelta
      ? ((income - _lastDelta) * _buyBackRatio() / _BUY_BACK_DENOMINATOR)
      : 0
    );
    console.log("!!!!! received, forwarded, underlying-balance", _receivedBuyback, _preForwarded, IERC20(_underlying()).balanceOf(address(this)));
  }
  /// ******************************************************
  ///              Internal logic implementation
  /// ******************************************************

  /// @dev Deposit underlying to AAVE3 pool
  /// @param amount Deposit amount
  function depositToPool(uint256 amount) internal override {
    amount = Math.min(IERC20(_underlying()).balanceOf(address(this)), amount);
    if (amount > 0) {
      _print();

      IERC20(_underlying()).safeApprove(address(_pool), 0);
      IERC20(_underlying()).safeApprove(address(_pool), amount);
      _pool.supply(_underlying(), amount, address(this), 0);

      console.log("_totalDeposited+", amount);
      _totalDeposited += amount;
      _print();
    }
  }

  /// @dev Withdraw underlying from AAVE3 pool
  function withdrawAndClaimFromPool(uint256 amount_) internal override {
    _forwardBuybacks();
    uint amountToWithdraw = Math.min(_rewardPoolBalance(), amount_);
    _pool.withdraw(_underlying(), amountToWithdraw, address(this));
    _totalWithdrawn += amountToWithdraw;
  }

  /// @dev Exit from external project without caring about rewards, for emergency cases only
  function emergencyWithdrawFromPool() internal override {
    uint balanceBefore = IERC20(_underlying()).balanceOf(address(this));
    _pool.withdraw(_underlying()
      , type(uint256).max // withdraw all, see https://docs.aave.com/developers/core-contracts/pool#withdraw
      , address(this)
    );
    _totalWithdrawn += balanceBefore - IERC20(_underlying()).balanceOf(address(this));
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

  /// ******************************************************
  ///                       Utils
  /// ******************************************************
  function _aToken() internal view returns (IAave3Token) {
    return IAave3Token(_pool.getReserveData(_underlying()).aTokenAddress);
  }

  /// @notice calculate and send buyback
  function _forwardBuybacks() internal {
    console.log("_forwardBuybacks _receivedBuyback=", _receivedBuyback);
    uint poolBalance = _rewardPoolBalance();
    if (poolBalance != 0) {
      console.log("_forwardBuybacks.1 poolBalance=", poolBalance);
      console.log("_forwardBuybacks.1 _totalWithdrawn=", _totalWithdrawn);
      console.log("_forwardBuybacks.1 _totalDeposited=", _totalDeposited);
      uint totalIncome = poolBalance + _totalWithdrawn - _totalDeposited;
      console.log("_forwardBuybacks.2 totalIncome lastIncome", totalIncome, _lastDelta);
      uint toBuybacks = totalIncome > _lastDelta
        ? (totalIncome - _lastDelta) * _buyBackRatio() / _BUY_BACK_DENOMINATOR
        : 0;
      console.log("_forwardBuybacks.3 toBuybacks=", toBuybacks, _preForwarded);
      if (toBuybacks != 0) {
        console.log("_forwardBuybacks.4");
        _print();
        if (toBuybacks > _preForwarded) {
          console.log("_forwardBuybacks.5", toBuybacks, _preForwarded);
          _pool.withdraw(_underlying(), toBuybacks - _preForwarded, address(this));
          _preForwarded = toBuybacks;
          console.log("_forwardBuybacks.5.1", toBuybacks, _preForwarded);
          _print();
        }
        console.log("_forwardBuybacks.6");

        address forwarder = IController(_controller()).feeRewardForwarder();
        IERC20(_underlying()).safeApprove(forwarder, 0);
        IERC20(_underlying()).safeApprove(forwarder, toBuybacks);
        console.log("_forwardBuybacks.7");
        _print();

        uint targetTokenEarned;
        // small amounts produce 'F2: Zero swap amount' error in distribute
        try IFeeRewardForwarder(forwarder).distribute(toBuybacks, _underlying(), _vault()) returns (uint r) {
          console.log("_forwardBuybacks.8", _receivedBuyback, _preForwarded);
          targetTokenEarned = r;
          _receivedBuyback += toBuybacks;
          _preForwarded = 0;
          _lastDelta = totalIncome;
          console.log("_forwardBuybacks.9", _receivedBuyback, _preForwarded, r);
        } catch Error(string memory reason) {
          console.log("IFeeRewardForwarder ERROR", reason);
        } catch {
          console.log("IFeeRewardForwarder unknown error");
        }
        _print();

        if (_preForwarded != 0) {
          console.log("_forwardBuybacks.10", _preForwarded);
          IERC20(_underlying()).safeApprove(address(_pool), 0);
          IERC20(_underlying()).safeApprove(address(_pool), _preForwarded);
          _pool.supply(_underlying(), _preForwarded, address(this), 0);
          _preForwarded = 0;
        }

        _print();

        if (targetTokenEarned > 0) {
          console.log("_forwardBuybacks.11");
          IBookkeeper(IController(_controller()).bookkeeper()).registerStrategyEarned(targetTokenEarned);
        }
        console.log("_forwardBuybacks.12");
      }
    }
  }
}
