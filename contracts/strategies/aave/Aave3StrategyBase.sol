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
import "@tetu_io/tetu-contracts/contracts/base/strategies/ProxyStrategyBase.sol";

/// @title Contract for AAVEv3 strategy implementation
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

  /// @dev 10% buyback
  uint256 private constant _BUY_BACK_RATIO = 10_00;

  /// ******************************************************
  ///                    Variables
  /// ******************************************************
  address internal _pool;
  IAave3ProtocolDataProvider internal _dataProvider;

  /// @notice The main contract where the user interacts to claim the rewards of their positions.
  /// @dev https://docs.aave.com/developers/whats-new/multiple-rewards-and-claim
  IAave3RewardsController internal _rewardsController;
  address internal _aToken;

  /// @notice Initialize contract after setup it as proxy implementation
  function initializeStrategy(
    address controller_,
    address underlying_,
    address vault_,
    address pool_
  ) public initializer {
    _pool = pool_;

    _dataProvider = IAave3ProtocolDataProvider(
      IAave3AddressesProvider(
        IAave3Pool(pool_).ADDRESSES_PROVIDER()
      ).getPoolDataProvider()
    );

    DataTypes.ReserveData memory rd = IAave3Pool(pool_).getReserveData(underlying_);
    _aToken = rd.aTokenAddress;

    IAave3Token aToken = IAave3Token(_aToken);
    _rewardsController = IAave3RewardsController(aToken.getIncentivesController());

    ProxyStrategyBase.initializeStrategyBase(
      controller_,
      underlying_,
      vault_,
      _rewardsController.getRewardsByAsset(underlying_),
      _BUY_BACK_RATIO
    );

    require(aToken.UNDERLYING_ASSET_ADDRESS() == underlying_, "wrong underlying");

  }

  /// ******************************************************
  ///                    Views
  /// ******************************************************

  /// @notice Strategy balance in the aave3-pool
  /// @return balance Balance amount in underlying tokens
  function _rewardPoolBalance() internal override view returns (uint256 balance) {
    // AAVE3 supports multiple reward tokens
    // https://docs.aave.com/developers/whats-new/multiple-rewards-and-claim
    if (_rewardTokens.length > 0) {
      (, uint[] memory unclaimedAmounts) = _rewardsController.getAllUserRewards(_rewardTokens, address(this));
      uint lengthUnclaimedAmounts = unclaimedAmounts.length;
      for (uint i = 0; i < lengthUnclaimedAmounts; ++i) {
        balance += unclaimedAmounts[i];
      }
    }

    return balance;
  }

  /// @notice Return approximately amount of reward tokens ready to claim in AAVE-pool
  /// @dev Don't use it in any internal logic, only for statistical purposes.
  /// @return Array with amounts ready to claim
  function readyToClaim() external view override returns (uint256[] memory) {
    (, uint[] memory unclaimedAmounts) = _rewardsController.getAllUserRewards(_rewardTokens, address(this));
    return unclaimedAmounts;
  }

  /// @notice TVL of the underlying in the pool
  /// @dev Only for statistic
  /// @return Pool TVL
  function poolTotalAmount() external view override returns (uint256) {
    return IAave3Token(_aToken).totalSupply();
  }

  /// ******************************************************
  ///              Do hard work
  /// ******************************************************

  function doHardWork() external onlyNotPausedInvesting override hardWorkers {
    if (_rewardTokens.length > 0) {
      // claim rewards
      address[] memory listAssets = new address[](1);
      listAssets[0] = _underlying();
      _rewardsController.claimAllRewards(listAssets, address(this));
    }
    liquidateReward();
  }

  /// ******************************************************
  ///              Internal logic implementation
  /// ******************************************************

  /// @dev Deposit underlying to AAVE3 pool
  /// @param amount Deposit amount
  function depositToPool(uint256 amount) internal override {
    IERC20(_underlying()).safeApprove(_pool, 0);
    IERC20(_underlying()).safeApprove(_pool, amount);
    IAave3Pool(_pool).deposit(_underlying(), amount, address(this), 0);
  }

  /// @dev Withdraw underlying and reward from AAVE3
  /// @param amount_ Deposit amount
  function withdrawAndClaimFromPool(uint256 amount_) internal override {
    //TODO: claim rewards
    IAave3Pool(_pool).withdraw(_underlying(), amount_, address(this));
  }

  /// @dev Exit from external project without caring about rewards
  ///      For emergency cases only!
  function emergencyWithdrawFromPool() internal override {
    IAave3Pool(_pool).withdraw(_underlying()
      , type(uint256).max
      , address(this)
    );
  }

  /// @dev Do something useful with farmed rewards
  function liquidateReward() internal override {
    autocompound(); //TODO
    liquidateRewardSilently();
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
}
