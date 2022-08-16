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

import "../../interface/strategies/ICurveStrategy.sol";
import "../../third_party/aave3/IAave3Pool.sol";
import "../../third_party/aave3/IAave3Token.sol";
import "../../third_party/aave3/IAave3RewardsController.sol";
import "../../third_party/aave3/IAave3AddressesProvider.sol";
import "../../third_party/aave3/IAave3ProtocolDataProvider.sol";
import "../../third_party/IERC20Extended.sol";
import "@tetu_io/tetu-contracts/contracts/base/strategies/ProxyStrategyBase.sol";
import "hardhat/console.sol";

/// @title Contract for AAVEv3 strategy implementation
/// @dev AAVE3 doesn't support rewards on polygon, so this strategy doesn't support rewards
/// @author dvpublic
abstract contract Aave3StrategyBase is ProxyStrategyBase {
  using SafeERC20 for IERC20;

  IStrategy.Platform private constant _PLATFORM = IStrategy.Platform.AAVE_LEND; //TODO: aave3, not aave2?

  /// ******************************************************
  ///                    Constants
  /// ******************************************************
  /// @notice Version of the contract
  /// @dev Should be incremented when contract changed
  string public constant VERSION = "1.0.0";
  /// @notice Strategy type for statistical purposes
  string public constant override STRATEGY_NAME = "Aave3StrategyBase";

  /// @dev There are no rewards in AAVEv3 on Polygon
  uint256 private constant _BUY_BACK_RATIO = 0;

  /// ******************************************************
  ///                    Variables
  /// ******************************************************
  address internal _pool;
  address internal _aToken;

  /// @notice Initialize contract after setup it as proxy implementation
  function initializeStrategy(
    address controller_,
    address underlying_,
    address vault_,
    address pool_
  ) public initializer {
    ProxyStrategyBase.initializeStrategyBase(
      controller_,
      underlying_,
      vault_,
      new address[](0), // there are no rewards
      _BUY_BACK_RATIO
    );

    _pool = pool_;

    DataTypes.ReserveData memory rd = IAave3Pool(pool_).getReserveData(underlying_);
    _aToken = rd.aTokenAddress;
    require(IAave3Token(_aToken).UNDERLYING_ASSET_ADDRESS() == underlying_, "wrong underlying");
  }

  /// ******************************************************
  ///                    Views
  /// ******************************************************

  /// @notice Strategy balance in the aave3-pool
  /// @dev AAVE3 doesn't have rewards on Polygon
  /// @return Balance amount in underlying tokens
  function _rewardPoolBalance() internal override view returns (uint256) {
    console.log("_rewardPoolBalance.1");
    address reserve = _underlying();
    uint normalizedIncome = IAave3Pool(_pool).getReserveNormalizedIncome(reserve);
    uint b = IAave3Token(_aToken).scaledBalanceOf(address(this));
    uint256 balance = ((b * normalizedIncome) + 0.5e27) / 1e27;
    console.log("_rewardPoolBalance.5", normalizedIncome, b, balance);
    return balance;
    return 0;
  }

  /// @notice Return approximately amount of reward tokens ready to claim in AAVE-pool
  function readyToClaim() external view override returns (uint256[] memory) {
    // there are no rewards in AAVE3 on polygon
    console.log("readyToClaim");
    return new uint[](_rewardTokens.length);
  }

  /// @notice TVL of the underlying in the pool
  /// @dev Only for statistic
  /// @return Pool TVL
  function poolTotalAmount() external view override returns (uint256) {
    console.log("poolTotalAmount");
    return IAave3Token(_aToken).totalSupply();
  }

  /// ******************************************************
  ///              Do hard work
  /// ******************************************************

  function doHardWork() external onlyNotPausedInvesting override hardWorkers {
    //noop
  }

  /// ******************************************************
  ///              Internal logic implementation
  /// ******************************************************

  /// @dev Deposit underlying to AAVE3 pool
  /// @param amount Deposit amount
  function depositToPool(uint256 amount) internal override {
    console.log("Deposit to pool", amount);
    amount = Math.min(IERC20(_underlying()).balanceOf(address(this)), amount);
    if (amount > 0) {
      IERC20(_underlying()).safeApprove(_pool, 0);
      IERC20(_underlying()).safeApprove(_pool, amount);
      console.log("AToken balance before deposit", IAave3Token(_aToken).balanceOf(address(this)));
      console.log("Underlying balance before deposit", IERC20(_underlying()).balanceOf(address(this)));
      IAave3Pool(_pool).deposit(_underlying(), amount, address(this), 0);
      console.log("AToken balance after deposit", IAave3Token(_aToken).balanceOf(address(this)));
      console.log("Underlying balance after deposit", IERC20(_underlying()).balanceOf(address(this)));
    }
  }

  /// @dev Withdraw underlying and reward from AAVE3
  /// @param amount_ Deposit amount
  function withdrawAndClaimFromPool(uint256 amount_) internal override {
    console.log("withdrawAndClaimFromPool");
    //TODO: claim rewards
    IAave3Pool(_pool).withdraw(_underlying(), amount_, address(this));
  }

  /// @dev Exit from external project without caring about rewards
  ///      For emergency cases only!
  function emergencyWithdrawFromPool() internal override {
    console.log("emergencyWithdrawFromPool");
    IAave3Pool(_pool).withdraw(_underlying()
      , type(uint256).max // withdraw all
      , address(this)
    );
  }

  /// @dev Do something useful with farmed rewards
  function liquidateReward() internal override {
    liquidateRewardDefault();
  }

  function platform() external override pure returns (IStrategy.Platform) {
    return _PLATFORM;
  }

  /// @dev assets should reflect underlying tokens need to investing
  function assets() external override view returns (address[] memory) {
    console.log("assets");
    address[] memory arr = new address[](1);
    arr[0] = _underlying();
    return arr;
  }
}
