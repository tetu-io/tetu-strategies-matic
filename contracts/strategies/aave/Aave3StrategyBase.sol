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
    //noop
  }

  /// ******************************************************
  ///              Internal logic implementation
  /// ******************************************************

  /// @dev Deposit underlying to AAVE3 pool
  /// @param amount Deposit amount
  function depositToPool(uint256 amount) internal override {
    amount = Math.min(IERC20(_underlying()).balanceOf(address(this)), amount);
    if (amount > 0) {
      IERC20(_underlying()).safeApprove(address(_pool), 0);
      IERC20(_underlying()).safeApprove(address(_pool), amount);
      _pool.supply(_underlying(), amount, address(this), 0);
    }
  }

  /// @dev Withdraw underlying from AAVE3 pool
  function withdrawAndClaimFromPool(uint256 amount_) internal override {
    _pool.withdraw(_underlying(), amount_, address(this));
  }

  /// @dev Exit from external project without caring about rewards, for emergency cases only
  function emergencyWithdrawFromPool() internal override {
    _pool.withdraw(_underlying()
      , type(uint256).max // withdraw all, see https://docs.aave.com/developers/core-contracts/pool#withdraw
      , address(this)
    );
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

}
