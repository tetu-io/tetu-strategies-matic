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

import "../UniversalLendStrategy.sol";
import "../../third_party/aave/IAToken.sol";
import "../../third_party/aave/ILendingPool.sol";
import "../../third_party/aave/IAaveIncentivesController.sol";
import "../../third_party/aave/IProtocolDataProvider.sol";

/// @title Contract for AAVEv2 strategy simplified
/// @author belbix
abstract contract Aave2StrategyBase is UniversalLendStrategy {
  using SafeERC20 for IERC20;

  /// ******************************************************
  ///                Constants and variables
  /// ******************************************************

  /// @notice Version of the contract
  /// @dev Should be incremented when contract changed
  string public constant VERSION = "1.0.2";

  IStrategy.Platform public constant override platform = IStrategy.Platform.AAVE_LEND;
  /// @notice Strategy type for statistical purposes
  string public constant override STRATEGY_NAME = "Aave2StrategyBase";

  ILendingPool public constant AAVE_LENDING_POOL = ILendingPool(0x8dFf5E27EA6b7AC08EbFdf9eB090F32ee9a30fcf);
  IAaveIncentivesController public constant AAVE_CONTROLLER = IAaveIncentivesController(0x357D51124f59836DeD84c8a1730D72B749d8BC23);
  IProtocolDataProvider public constant AAVE_DATA_PROVIDER = IProtocolDataProvider(0x7551b5D2763519d4e37e8B81929D336De671d46d);


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
    UniversalLendStrategy.initializeLendStrategy(
      controller_,
      underlying_,
      vault_,
      buybackRatio_,
      __rewardTokens
    );

    address aToken;
    (aToken,,) = AAVE_DATA_PROVIDER.getReserveTokensAddresses(underlying_);
    require(IAToken(aToken).UNDERLYING_ASSET_ADDRESS() == _underlying(), "Wrong underlying");
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
    address aToken;
    (aToken,,) = AAVE_DATA_PROVIDER.getReserveTokensAddresses(_underlying());
    return IERC20(_underlying()).balanceOf(aToken);
  }

  /// ******************************************************
  ///              Internal logic implementation
  /// ******************************************************


  /// @dev Refresh rates and return actual deposited balance in underlying tokens
  function _getActualPoolBalance() internal view override returns (uint) {
    return _rewardPoolBalance();
  }

  /// @dev Deposit to pool and increase local balance
  function _simpleDepositToPool(uint amount) internal override {
    address u = _underlying();
    _approveIfNeeds(u, amount, address(AAVE_LENDING_POOL));
    AAVE_LENDING_POOL.deposit(u, amount, address(this), 0);
    localBalance += amount;
  }

  /// @dev Perform only withdraw action, without changing local balance
  function _withdrawFromPoolWithoutChangeLocalBalance(uint amount, uint poolBalance) internal override returns (bool withdrewAll) {
    if (amount < poolBalance) {
      AAVE_LENDING_POOL.withdraw(_underlying(), amount, address(this));
      return false;
    } else {
      AAVE_LENDING_POOL.withdraw(_underlying(), type(uint).max, address(this));
      return true;
    }
  }

  /// @dev Withdraw all and set localBalance to zero
  function _withdrawAllFromPool() internal override {
    AAVE_LENDING_POOL.withdraw(_underlying(), type(uint).max, address(this));
    localBalance = 0;
  }

  /// @dev Claim distribution rewards
  function _claimReward() internal override {
    address aToken;
    address dToken;
    (aToken,,dToken) = AAVE_DATA_PROVIDER.getReserveTokensAddresses(_underlying());
    address[] memory a = new address[](2);
    a[0] = aToken;
    a[1] = dToken;
    AAVE_CONTROLLER.claimRewards(a, type(uint256).max, address(this));
  }

  //slither-disable-next-line unused-state
  uint256[48] private ______gap;
}
