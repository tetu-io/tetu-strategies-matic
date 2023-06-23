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
import "../../third_party/aave3/IAave3Pool.sol";
import "../../third_party/aave3/IAave3Token.sol";
import "../../third_party/aave/IRewardsController.sol";

/// @title Contract for AAVEv3 strategy implementation, a bit simplified comparing with v1
/// @author dvpublic
abstract contract Aave3StrategyBaseV2 is UniversalLendStrategy {
  using SafeERC20 for IERC20;

  /// ******************************************************
  ///                Constants and variables
  /// ******************************************************

  /// @notice Version of the contract
  /// @dev Should be incremented when contract changed
  string public constant VERSION = "1.0.4";

  IStrategy.Platform public constant override platform = IStrategy.Platform.AAVE_LEND; // same as for AAVEv2

  /// @notice Strategy type for statistical purposes
  string public constant override STRATEGY_NAME = "Aave3StrategyBaseV2";
  IRewardsController internal constant _AAVE_INCENTIVES = IRewardsController(0x929EC64c34a17401F460460D4B9390518E5B473e);
  IAave3Pool constant public AAVE_V3_POOL_MATIC = IAave3Pool(0x794a61358D6845594F94dc1DB02A252b5b4814aD);


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
  ///              Internal logic implementation
  /// ******************************************************


  /// @dev Refresh rates and return actual deposited balance in underlying tokens
  function _getActualPoolBalance() internal view override returns (uint) {
    return _rewardPoolBalance();
  }

  /// @dev Deposit to pool and increase local balance
  function _simpleDepositToPool(uint amount) internal override {
    address u = _underlying();
    _approveIfNeeds(u, amount, address(AAVE_V3_POOL_MATIC));
    AAVE_V3_POOL_MATIC.supply(u, amount, address(this), 0);
    localBalance += amount;
  }

  /// @dev Perform only withdraw action, without changing local balance
  function _withdrawFromPoolWithoutChangeLocalBalance(uint amount, uint poolBalance) internal override returns (bool withdrewAll) {
    if (amount < poolBalance) {
      AAVE_V3_POOL_MATIC.withdraw(_underlying(), amount, address(this));
      return false;
    } else {
      AAVE_V3_POOL_MATIC.withdraw(
        _underlying(),
        type(uint256).max, // withdraw all, see https://docs.aave.com/developers/core-contracts/pool#withdraw
        address(this)
      );
      return true;
    }
  }

  /// @dev Withdraw all and set localBalance to zero
  function _withdrawAllFromPool() internal override {
    AAVE_V3_POOL_MATIC.withdraw(
      _underlying(),
      type(uint256).max, // withdraw all, see https://docs.aave.com/developers/core-contracts/pool#withdraw
      address(this)
    );
    localBalance = 0;
  }

  /// @dev Claim all possible rewards to the current contract
  function _claimReward() internal override {
    address[] memory _assets = new address[](1);
    _assets[0] = address(_aToken());
    _AAVE_INCENTIVES.claimAllRewardsToSelf(_assets);
  }

  /// ******************************************************
  ///                       Utils
  /// ******************************************************
  function _aToken() internal view returns (IAave3Token) {
    return IAave3Token(AAVE_V3_POOL_MATIC.getReserveData(_underlying()).aTokenAddress);
  }

  //slither-disable-next-line unused-state
  uint256[48] private ______gap;
}
