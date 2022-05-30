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
import "@tetu_io/tetu-contracts/contracts/base/SlotsLib.sol";
import "../../third_party/mesh/ISinglePool.sol";
import "../../third_party/IERC20Extended.sol";

import "hardhat/console.sol";

/// @title Abstract contract for MeshVault strategy implementation
/// @author olegn
abstract contract MeshSinglePoolBase is ProxyStrategyBase{
  using SafeERC20 for IERC20;
  using SlotsLib for bytes32;

  // ************ VARIABLES **********************
  /// @notice Strategy type for statistical purposes
  string public constant override STRATEGY_NAME = "MeshSinglePoolBase";
  /// @notice Version of the contract
  /// @dev Should be incremented when contract changed
  string public constant VERSION = "1.0.0";
  /// @dev 10% buyback
  uint private constant _BUY_BACK_RATIO = 10_00;

  bytes32 internal constant _MESH_POOL_SLOT = bytes32(uint(keccak256("mesh.mesh.single.pool")) - 1);

  /// @notice Contract constructor using on strategy implementation
  /// @dev The implementation should check each parameter
  /// @param _controller Controller address
  /// @param _vault SmartVault address that will provide liquidity
  /// @param _underlying Underlying token address
  /// @param __rewardTokens Reward tokens that the strategy will farm
  /// @param _meshSinglePool single token pool address
  function initializeStrategy(
    address _controller,
    address _vault,
    address _underlying,
    address[] memory __rewardTokens,
    address _meshSinglePool
  ) public initializer{
    ProxyStrategyBase.initializeStrategyBase(
      _controller,
      _underlying,
      _vault,
      __rewardTokens,
      _BUY_BACK_RATIO
    );
    require(ISinglePool(_meshSinglePool).token() == _underlying, "Wrong underlying");
    _MESH_POOL_SLOT.set(_meshSinglePool);
  }


  // ************* VIEWS *******************

  /// @notice Strategy balance in the meshSinglePool pool
  /// @return bal Balance amount in underlying tokens
  function _rewardPoolBalance() internal override view returns (uint) {
    uint iTokenBalance = meshSinglePool().balanceOf(address(this));
    uint exchangeRateStored = meshSinglePool().exchangeRateStored();
    return iTokenBalance * exchangeRateStored / 10 ** IERC20Extended(_underlying()).decimals();
  }

  /// @notice Return approximately amount of reward tokens ready to claim in meshSinglePool pool
  /// @dev Don't use it in any internal logic, only for statistical purposes
  /// @return Array with amounts ready to claim
  function readyToClaim() external view override returns (uint[] memory) {
    uint[] memory toClaim = new uint[](1);
    toClaim[0] = meshSinglePool().userRewardSum(address(this));
    return toClaim;
  }

  /// @notice TVL of the underlying in the meshSinglePool pool
  /// @dev Only for statistic
  /// @return Pool TVL
  function poolTotalAmount() external view override returns (uint) {
    return
      meshSinglePool().getCash() +
      meshSinglePool().totalBorrows() -
      meshSinglePool().totalReserves();
  }

  // ************ GOVERNANCE ACTIONS **************************

  /// @notice Claim rewards from external project and send them to FeeRewardForwarder
  function doHardWork() external onlyNotPausedInvesting override hardWorkers {
    _investAllUnderlying();
    uint balB = IERC20(_rewardTokens[0]).balanceOf(address(this));
    console.log(" >>>> balB %s", balB);
    meshSinglePool().claimReward();
    uint balA = IERC20(_rewardTokens[0]).balanceOf(address(this));
    console.log(" >>>> balA %s", balA);
    liquidateReward();
  }

  // ************ INTERNAL LOGIC IMPLEMENTATION **************************

  /// @dev Deposit underlying to mesh pool
  /// @param amount Deposit amount
  function depositToPool(uint amount) internal override {
    console.log(" >>>> depositToPool %s", amount);
    if(amount > 0){
      IERC20(_underlying()).safeApprove(address(meshSinglePool()), 0);
      IERC20(_underlying()).safeApprove(address(meshSinglePool()), amount);
      meshSinglePool().depositToken(amount);
    }
  }

  /// @dev Withdraw underlying from TShareRewardPool pool
  /// @param amount Deposit amount
  function withdrawAndClaimFromPool(uint amount) internal override {
    meshSinglePool().withdrawToken(amount);
  }

  /// @dev the same as withdrawAndClaimFromPool because mesh pools have no such functionality
  function emergencyWithdrawFromPool() internal override {
    uint strategyBalance = meshSinglePool().balanceOf(address(this));
    console.log(" >>>> strategyBalance %s", strategyBalance);
    meshSinglePool().withdrawToken(strategyBalance);
  }

  /// @dev Do something useful with farmed rewards
  function liquidateReward() internal override {
    autocompound();
    liquidateRewardDefault();
  }

  function meshSinglePool() public view returns (ISinglePool) {
    return ISinglePool(_MESH_POOL_SLOT.getAddress());
  }

  /// @dev Platform name for statistical purposes
  /// @return Platform enum index
  function platform() external override pure returns (Platform) {
    return Platform.MESH;
  }
}
