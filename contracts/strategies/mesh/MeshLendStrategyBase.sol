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
import "../../third_party/mesh/ISinglePool.sol";

/// @title Contract for Mesh Lending strategy
/// @author belbix
abstract contract MeshLendStrategyBase is UniversalLendStrategy {
  using SafeERC20 for IERC20;

  /// ******************************************************
  ///                Constants and variables
  /// ******************************************************

  /// @notice Version of the contract
  /// @dev Should be incremented when contract changed
  string public constant VERSION = "1.0.2";
  IStrategy.Platform public constant override platform = IStrategy.Platform.MESH;

  /// @notice Strategy type for statistical purposes
  string public constant override STRATEGY_NAME = "MeshLendStrategyBase";
  address internal constant _USDC = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174;
  address internal constant _MESH = 0x82362Ec182Db3Cf7829014Bc61E9BE8a2E82868a;
  IUniswapV2Router02 internal constant MESH_ROUTER = IUniswapV2Router02(0x10f4A785F458Bc144e3706575924889954946639);

  ISinglePool public pool;

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
    address _pool
  ) public initializer {
    UniversalLendStrategy.initializeLendStrategy(
      controller_,
      underlying_,
      vault_,
      buybackRatio_,
      __rewardTokens
    );

    pool = ISinglePool(_pool);
    require(ISinglePool(_pool).token() == _underlying(), "Wrong underlying");
  }

  /// ******************************************************
  ///                    Views
  /// ******************************************************

  /// @notice Invested assets in the pool
  function _rewardPoolBalance() internal override view returns (uint) {
    ISinglePool _pool = pool;
    uint256 iTokenBalance = _pool.balanceOf(address(this));
    uint256 exchangeRateStored = _pool.exchangeRateStored();
    uint256 underlyingInPool = iTokenBalance * exchangeRateStored / 1e18 + 1;
    return underlyingInPool > 1 ? underlyingInPool : 0;
  }

  /// @notice Return approximately amount of reward tokens ready to claim
  function readyToClaim() external view override returns (uint[] memory) {
    uint[] memory toClaim = new uint[](1);
    toClaim[0] = pool.userRewardSum(address(this));
    return toClaim;
  }

  /// @notice TVL of the underlying in the pool
  function poolTotalAmount() external view override returns (uint256) {
    ISinglePool _pool = pool;
    return _pool.getCash() + _pool.totalBorrows() - _pool.totalReserves();
  }

  /// ******************************************************
  ///              Internal logic implementation
  /// ******************************************************

  /// @dev Refresh rates and return actual deposited balance in underlying tokens
  function _getActualPoolBalance() internal override returns (uint) {
    ISinglePool _pool = pool;
    // refresh balance
    _pool.exchangeRateCurrent();

    uint256 iTokenBalance = _pool.balanceOf(address(this));
    uint256 exchangeRateStored = _pool.exchangeRateStored();
    uint256 underlyingInPool = iTokenBalance * exchangeRateStored / 1e18 + 1;
    return underlyingInPool > 1 ? underlyingInPool : 0;
  }

  /// @dev Deposit to pool and increase local balance
  function _simpleDepositToPool(uint amount) internal override {
    ISinglePool _pool = pool;

    _approveIfNeeds(_underlying(), amount, address(_pool));
    _pool.depositToken(amount);
    localBalance += amount;
  }

  /// @dev Perform only withdraw action, without changing local balance
  function _withdrawFromPoolWithoutChangeLocalBalance(uint amount, uint poolBalance) internal override returns (bool withdrewAll) {
    ISinglePool _pool = pool;
    if (amount < poolBalance) {
      _pool.withdrawToken(amount);
      return false;
    } else {
      _pool.withdrawTokenByAmount(_pool.balanceOf(address(this)));
      return true;
    }
  }

  /// @dev Withdraw all and set localBalance to zero
  function _withdrawAllFromPool() internal override {
    ISinglePool _pool = pool;
    _pool.withdrawTokenByAmount(_pool.balanceOf(address(this)));
    localBalance = 0;
  }

  /// @dev Claim all possible rewards to the current contract
  function _claimReward() internal override {
    pool.claimReward();
    _swapMESHtoUSDC();
  }

  function _swapMESHtoUSDC() internal {
    uint256 meshBalance = IERC20(_MESH).balanceOf(address(this));
    if (meshBalance != 0) {
      address[] memory route = new address[](2);
      route[0] = _MESH;
      route[1] = _USDC;
      _meshSwap(meshBalance, route);
    }
  }

  /// @dev helper function for meshswap router
  function _meshSwap(uint256 amount, address[] memory _route) internal {
    require(IERC20(_route[0]).balanceOf(address(this)) >= amount, "Not enough balance");
    _approveIfNeeds(_route[0], amount, address(MESH_ROUTER));
    MESH_ROUTER.swapExactTokensForTokens(
      amount,
      0,
      _route,
      address(this),
      block.timestamp
    );
  }

  //slither-disable-next-line unused-state
  uint256[48] private ______gap;
}
