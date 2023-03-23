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
import "../../third_party/0vix/IOToken.sol";

/// @title Contract for 0vix strategy
/// @author a17
abstract contract ZerovixStrategyBase is UniversalLendStrategy {
  using SafeERC20 for IERC20;

  /// ******************************************************
  ///                Constants and variables
  /// ******************************************************

  /// @notice Version of the contract
  /// @dev Should be incremented when contract changed
  string public constant VERSION = "1.0.0";

  IStrategy.Platform public constant override platform = IStrategy.Platform.ZEROVIX;
  /// @notice Strategy type for statistical purposes
  string public constant override STRATEGY_NAME = "ZerovixStrategyBase";

  IOToken public oToken;

  /// ******************************************************
  ///                    Initialization
  /// ******************************************************

  /// @notice Initialize contract after setup it as proxy implementation
  function initializeStrategy(
    address controller_,
    address underlying_,
    address vault_,
    address oToken_,
    uint buybackRatio_
  ) public initializer {
    UniversalLendStrategy.initializeLendStrategy(
      controller_,
      underlying_,
      vault_,
      buybackRatio_,
      new address[](0)
    );

    oToken = IOToken(oToken_);
    require(oToken.underlying() == _underlying(), "Wrong underlying");
  }

  /// ******************************************************
  ///                    Views
  /// ******************************************************

  /// @notice Strategy balance in the pool
  /// @dev This is amount that we can withdraw
  /// @return Balance amount in underlying tokens
  function _rewardPoolBalance() internal override view returns (uint) {
    IOToken _oToken = oToken;
    return _oToken.balanceOf(address(this)) * _oToken.exchangeRateStored() / 1e18;
  }

  /// @notice Return approximately amount of reward tokens ready to claim
  function readyToClaim() external pure override returns (uint256[] memory) {
    return new uint[](0);
  }

  /// @notice TVL of the underlying in the pool
  function poolTotalAmount() external view override returns (uint256) {
    // exchangeRate = (totalCash + totalBorrows - totalReserves) / totalSupply
    return oToken.totalSupply() * oToken.exchangeRateStored() / 1e18;
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
    IOToken _oToken = oToken;
    _approveIfNeeds(u, amount, address(_oToken));
    _oToken.mint(amount);
    localBalance += amount;
  }

  /// @dev Perform only withdraw action, without changing local balance
  function _withdrawFromPoolWithoutChangeLocalBalance(uint amount, uint poolBalance) internal override returns (bool withdrewAll) {
    if (amount < poolBalance) {
      oToken.redeemUnderlying(amount);
      return false;
    } else {
      oToken.redeemUnderlying(type(uint).max);
      return true;
    }
  }

  /// @dev Withdraw all and set localBalance to zero
  function _withdrawAllFromPool() internal override {
    oToken.redeemUnderlying(type(uint).max);
    localBalance = 0;
  }

  /// @dev Claim distribution rewards
  function _claimReward() internal override {}

  //slither-disable-next-line unused-state
  uint256[48] private ______gap;
}
