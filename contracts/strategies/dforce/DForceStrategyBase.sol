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
import "../../third_party/dforce/IiToken.sol";
import "../../third_party/dforce/IRewardDistributorV3.sol";

/// @title Contract for DForce strategy implementation
/// @author belbix
abstract contract DForceStrategyBase is UniversalLendStrategy {
  using SafeERC20 for IERC20;

  /// ******************************************************
  ///                Constants and variables
  /// ******************************************************

  /// @notice Version of the contract
  string public constant VERSION = "1.0.2";

  IStrategy.Platform public constant override platform = IStrategy.Platform.D_FORCE;

  /// @notice Strategy type for statistical purposes
  string public constant override STRATEGY_NAME = "DForceStrategyBase";
  IRewardDistributorV3 public constant REWARD_DISTRIBUTOR = IRewardDistributorV3(0x47C19A2ab52DA26551A22e2b2aEED5d19eF4022F);

  IiToken public iToken;


  /// ******************************************************
  ///                    Initialization
  /// ******************************************************

  /// @notice Initialize contract after setup it as proxy implementation
  function initializeStrategy(
    address controller_,
    address underlying_,
    address vault_,
    uint buybackRatio_,
    address[] memory __rewardTokens,
    address _iToken
  ) public initializer {
    UniversalLendStrategy.initializeLendStrategy(
      controller_,
      underlying_,
      vault_,
      buybackRatio_,
      __rewardTokens
    );

    iToken = IiToken(_iToken);
    require(IiToken(_iToken).underlying() == _underlying(), "Wrong underlying");
  }

  /// ******************************************************
  ///                    Views
  /// ******************************************************

  /// @notice Invested assets in the pool
  function _rewardPoolBalance() internal override view returns (uint) {
    IiToken _iToken = iToken;
    return _iToken.balanceOf(address(this)) * _iToken.exchangeRateStored() / 1e18;
  }

  /// @notice Return approximately amount of reward tokens ready to claim
  function readyToClaim() external view override returns (uint[] memory) {
    uint[] memory rewards = new uint[](1);
    rewards[0] = REWARD_DISTRIBUTOR.reward(address(this));
    return rewards;
  }

  /// @notice TVL of the underlying in the pool
  function poolTotalAmount() external view override returns (uint256) {
    return iToken.getCash() + iToken.totalBorrows() - iToken.totalReserves();
  }

  /// ******************************************************
  ///              Internal logic implementation
  /// ******************************************************


  /// @dev Refresh rates and return actual deposited balance in underlying tokens
  function _getActualPoolBalance() internal override returns (uint) {
    return iToken.balanceOfUnderlying(address(this));
  }

  /// @dev Deposit to pool and increase local balance
  function _simpleDepositToPool(uint amount) internal override {
    address u = _underlying();
    IiToken _iToken = iToken;
    _approveIfNeeds(u, amount, address(_iToken));
    _iToken.mintForSelfAndEnterMarket(amount);
    localBalance += amount;
  }

  /// @dev Perform only withdraw action, without changing local balance
  function _withdrawFromPoolWithoutChangeLocalBalance(uint amount, uint poolBalance) internal override returns (bool withdrewAll) {
    if (amount < poolBalance) {
      iToken.redeemUnderlying(address(this), amount);
      return false;
    } else {
      iToken.redeemUnderlying(address(this), _rewardPoolBalance());
      return true;
    }
  }

  /// @dev Withdraw all and set localBalance to zero
  function _withdrawAllFromPool() internal override {
    iToken.redeemUnderlying(address(this), _rewardPoolBalance());
    localBalance = 0;
  }

  /// @dev Claim distribution rewards
  function _claimReward() internal override {
    address[] memory holders = new address[](1);
    holders[0] = address(this);
    address[] memory rts = new address[](1);
    rts[0] = address(iToken);
    REWARD_DISTRIBUTOR.claimReward(holders, rts);
  }

  //slither-disable-next-line unused-state
  uint256[48] private ______gap;
}
