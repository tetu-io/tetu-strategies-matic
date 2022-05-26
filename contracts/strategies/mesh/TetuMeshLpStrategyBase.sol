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
import "../../third_party/mesh/IMeshSwapLP.sol";

/// @title Base contract for Mesh LP farming
/// @author belbix
abstract contract TetuMeshLpStrategyBase is ProxyStrategyBase {
  using SafeERC20 for IERC20;

  // --------------------- CONSTANTS -------------------------------
  /// @notice Strategy type for statistical purposes
  string public constant override STRATEGY_NAME = "MeshLpStrategyBase";
  /// @notice Version of the contract
  /// @dev Should be incremented when contract changed
  string public constant VERSION = "1.0.0";

  address private constant _MESH = address(0x82362Ec182Db3Cf7829014Bc61E9BE8a2E82868a);
  address private constant _USDC = address(0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174);
  address private constant _TETU_MESH = address(0xDcB8F34a3ceb48782c9f3F98dF6C12119c8d168a);
  address private constant _MESH_TETU_MESH_PAIR_ADDRESS = address(0xcf40352253de7a0155d700a937Dc797D681c9867);
  IUniswapV2Router02 public constant MESH_ROUTER = IUniswapV2Router02(0x10f4A785F458Bc144e3706575924889954946639);
  uint256 private constant _MESH_PRECISION = 1e18;

  /// @notice Initialize contract after setup it as proxy implementation
  function initializeStrategy(
    address _controller,
    address _vault
  ) public initializer {
    address[] memory __rewardTokens = new address[](1);
    __rewardTokens[0] = _MESH;
    // 5% buybacks, 95% of vested Mesh should go to the targetRewardVault as rewards (not autocompound)
    uint _buybackRatio = 5_00;
    ProxyStrategyBase.initializeStrategyBase(
      _controller,
      _MESH_TETU_MESH_PAIR_ADDRESS,
      _vault,
      __rewardTokens,
      _buybackRatio
    );
  }

  /// @dev Mesh LP has stakeless rewards
  function _rewardPoolBalance() internal override pure returns (uint256) {
    return 0;
  }

  /// @dev Not implemented
  function readyToClaim() external view override returns (uint256[] memory toClaim) {
    toClaim = new uint256[](_rewardTokens.length);
  }

  /// @dev Return full amount of staked tokens
  function poolTotalAmount() external view override returns (uint256) {
    return IERC20(_MESH_TETU_MESH_PAIR_ADDRESS).totalSupply();
  }

  /// @dev Platform name for statistical purposes
  /// @return Platform enum index
  function platform() external override pure returns (Platform) {
    return Platform.MESH;
  }

  /// @dev assets should reflect underlying tokens need to investing
  function assets() external override pure returns (address[] memory) {
    address[] memory arr = new address[](2);
    arr[0] = _MESH;
    arr[1] = _TETU_MESH;
    return arr;
  }

  /// @dev no actions require
  function depositToPool(uint256 amount) internal override {
    // no actions require
  }

  /// @dev no actions require
  function withdrawAndClaimFromPool(uint256) internal pure override {
    // noop
  }

  /// @dev no actions require
  function emergencyWithdrawFromPool() internal pure override {
    // noop
  }

  /// @dev In this version rewards are accumulated in this strategy
  function doHardWork() external onlyNotPausedInvesting override hardWorkers {
    IMeshSwapLP(_MESH_TETU_MESH_PAIR_ADDRESS).claimReward();
    liquidateReward();
  }

  /// @dev Make something useful with rewards
  function liquidateReward() internal override {
    uint amount = IERC20(_MESH).balanceOf(address(this));

    uint toBuybacks = (amount * _buyBackRatio() / _BUY_BACK_DENOMINATOR);
    uint toVault = amount - toBuybacks;

    if (toBuybacks != 0) {
      address[] memory route = new address[](2);
      route[0] = _MESH;
      route[1] = _USDC;
      _meshSwap(toBuybacks, route);
      uint usdcAmount = IERC20(_USDC).balanceOf(address(this));
      address forwarder = IController(_controller()).feeRewardForwarder();
      IERC20(_USDC).safeApprove(forwarder, 0);
      IERC20(_USDC).safeApprove(forwarder, toBuybacks);
      // it will sell USDC tokens to Target Token and distribute it to SmartVault and PS
      uint targetTokenEarned = IFeeRewardForwarder(forwarder).distribute(usdcAmount, _USDC, _vault());
      if (targetTokenEarned > 0) {
        IBookkeeper(IController(_controller()).bookkeeper()).registerStrategyEarned(targetTokenEarned);
      }
    }

    if (toVault != 0) {
      toVault = _meshToTetuMesh(toVault);
      // add tetuMesh to vault rewards
      address targetVault = _vault();
      IERC20(_TETU_MESH).safeApprove(targetVault, 0);
      IERC20(_TETU_MESH).safeApprove(targetVault, toVault);
      ISmartVault(targetVault).notifyTargetRewardAmount(_TETU_MESH, toVault);
    }
  }

  function _meshToTetuMesh(uint256 amount) internal returns (uint){
    (uint256 tetuMeshReserve, uint256 meshReserve) = _getMeshReserves();
    if (tetuMeshReserve > meshReserve) {
      uint256 toSwapMaxAmount = _computeSellAmount(meshReserve, tetuMeshReserve, _MESH_PRECISION);
      address[] memory route = new address[](2);
      route[0] = _MESH;
      route[1] = _TETU_MESH;
      uint256 toSwap = Math.min(amount, toSwapMaxAmount);
      if (toSwap != 0) {
        _meshSwap(toSwap, route);
      }
    }
    uint256 tokensLeft = IERC20(_MESH).balanceOf(address(this));

    if (tokensLeft > 0) {
      // invest MESH tokens to tetuMESHVault
      IERC20(_MESH).safeApprove(_TETU_MESH, 0);
      IERC20(_MESH).safeApprove(_TETU_MESH, tokensLeft);
      ISmartVault(_TETU_MESH).depositAndInvest(tokensLeft);
    }
    return IERC20(_TETU_MESH).balanceOf(address(this));
  }

  function _meshSwap(uint256 amount, address[] memory _route) internal {
    require(IERC20(_route[0]).balanceOf(address(this)) >= amount, "Not enough balance");
    IERC20(_route[0]).safeApprove(address(MESH_ROUTER), 0);
    IERC20(_route[0]).safeApprove(address(MESH_ROUTER), amount);
    MESH_ROUTER.swapExactTokensForTokens(
      amount,
      0,
      _route,
      address(this),
      block.timestamp
    );
  }

  function _getMeshReserves() internal view returns (uint256 tetuMeshReserves, uint256 meshReserves){
    tetuMeshReserves = IERC20(_TETU_MESH).balanceOf(_MESH_TETU_MESH_PAIR_ADDRESS);
    meshReserves = IERC20(_MESH).balanceOf(_MESH_TETU_MESH_PAIR_ADDRESS);
  }

  function _computeSellAmount(
    uint256 tokenReserve,
    uint256 oppositeReserve,
    uint256 targetPrice
  ) internal pure returns (uint256) {
    if (targetPrice == 0) {
      return 0;
    }
    // ignore fees
    uint base = oppositeReserve * tokenReserve / targetPrice * _MESH_PRECISION;
    uint256 sqrtBase = _sqrt(base);
    if (sqrtBase < tokenReserve) {
      // in this case the price lower than target price, need to sell
      return 0;
    }
    return sqrtBase - tokenReserve;
  }

  /// @dev Babylonian method (https://en.wikipedia.org/wiki/Methods_of_computing_square_roots#Babylonian_method)
  function _sqrt(uint y) internal pure returns (uint z) {
    z = 0;
    if (y > 3) {
      z = y;
      uint x = y / 2 + 1;
      while (x < z) {
        z = x;
        x = (y / x + x) / 2;
      }
    } else if (y != 0) {
      z = 1;
    }
  }

  //slither-disable-next-line unused-state
  uint256[50] private ______gap;
}
