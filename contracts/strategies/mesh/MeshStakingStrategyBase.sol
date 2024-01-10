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
import "../../third_party/IERC20Extended.sol";
import "../../third_party/IDelegation.sol";
import "../../third_party/mesh/IVotingMesh.sol";
import "../../third_party/mesh/IPoolVoting.sol";
import "../../third_party/mesh/IClaimable.sol";

/// @title Base contract for Mesh stake into vMesh pool
/// @author olegn
/// @author belbix
abstract contract MeshStakingStrategyBase is ProxyStrategyBase {
  using SafeERC20 for IERC20;
  using SlotsLib for bytes32;

  // --------------------- CONSTANTS -------------------------------
  /// @notice Strategy type for statistical purposes
  string public constant override STRATEGY_NAME = "MeshStakingStrategyBase";
  /// @notice Version of the contract
  /// @dev Should be incremented when contract changed
  string public constant VERSION = "1.1.5";
  /// @dev 5% buybacks, 95% of vested Mesh should go to the targetRewardVault as rewards (not autocompound)
  uint256 private constant _BUY_BACK_RATIO = 5_00;
  uint256 private constant _MAX_LOCK_PERIOD = 1555200000;
  uint256 private constant _MESH_PRECISION = 1e18;
  IVotingMesh public constant VOTING_MESH = IVotingMesh(0x176b29289f66236c65C7ac5DB2400abB5955Df13);
  IPoolVoting public constant POOL_VOTING = IPoolVoting(0x705b40Af8CeCd59406cF630Ab7750055c9b137B9);
  IUniswapV2Router02 public constant MESH_ROUTER = IUniswapV2Router02(0x10f4A785F458Bc144e3706575924889954946639);
  address private constant _MESH_TETU_MESH_PAIR_ADDRESS = address(0xcf40352253de7a0155d700a937Dc797D681c9867);
  address private constant _USDC_ADDRESS = address(0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174);
  address private constant _TETU_MESH = address(0xDcB8F34a3ceb48782c9f3F98dF6C12119c8d168a);
  uint256 private constant _TARGET_PPFS = 1e18;

  // DO NOT ADD ANY VARIABLES MORE! ONLY CONSTANTS!
  /// @dev Deprecated, use slots instead
  mapping(bytes32 => uint) private strategyUintStorage;
  bytes32 internal constant _DUST_SLOT = bytes32(uint(keccak256("mesh.staking.dust")) - 1);
  bytes32 internal constant _NEW_OWNER_SLOT = bytes32(uint(keccak256("mesh.staking.new_owner")) - 1);
  bytes32 internal constant _TARGET_VAULT_SLOT = bytes32(uint(keccak256("mesh.staking.target.vault")) - 1);
  bytes32 internal constant _REWARDS_TOKENS_SPECIFIC_SLOT = bytes32(uint(keccak256("mesh.staking.rewards.tokens.specific")) - 1);
  // DO NOT ADD ANY VARIABLES MORE! ONLY CONSTANTS!

  /// @notice Initialize contract after setup it as proxy implementation
  function initializeStrategy(
    address _controller,
    address _underlying,
    address _vault,
    address[] memory __rewardTokens
  ) public initializer {
    ProxyStrategyBase.initializeStrategyBase(
      _controller,
      _underlying,
      _vault,
      __rewardTokens,
      _BUY_BACK_RATIO
    );
  }

  event VotingAdded(address exchange, uint256 amount);
  event VotingRemoved(address exchange, uint256 amount);
  event VotingRemovedAll();
  event TargetRewardVaultUpdated(address newTargetRewardVault);

  // ------------------ GOV actions --------------------------

  modifier onlyNewOwner {
    require(msg.sender == _NEW_OWNER_SLOT.getAddress(), "not new owner");
    _;
  }

  /// @dev End farming and set a new owner of this contract (suppose to be a major holder of tetuMESH)
  function endFarming(address _newOwner) external restricted {
    require(_NEW_OWNER_SLOT.getAddress() == address(0), "already set");
    _setOnPause(true);
    _NEW_OWNER_SLOT.set(_newOwner);
  }

  function unlockMESH() external onlyNewOwner {
    VOTING_MESH.unlockMESH();
  }

  function unlockMESHUnlimited() external onlyNewOwner {
    VOTING_MESH.unlockMESHUnlimited();
  }

  function claimReward() external onlyNewOwner {
    VOTING_MESH.claimReward();
  }

  function manualWithdraw(address token, uint amount) external onlyNewOwner {
    IERC20(token).safeTransfer(_NEW_OWNER_SLOT.getAddress(), amount);
  }

  function claimAirdrop(address claimable, address distributor) external onlyNewOwner {
    IClaimable(claimable).claim(distributor);
  }

  function addVoting(address exchange, uint256 amount) external onlyNewOwner {
    require(exchange != address(0), "Exchange address should be specified");
    POOL_VOTING.addVoting(exchange, amount);
    emit VotingAdded(exchange, amount);
  }

  function removeVoting(address exchange, uint256 amount) external onlyNewOwner {
    require(exchange != address(0), "Exchange address should be specified");
    POOL_VOTING.removeVoting(exchange, amount);
    emit VotingRemoved(exchange, amount);
  }

  function removeAllVoting() external onlyNewOwner {
    POOL_VOTING.removeAllVoting();
    emit VotingRemovedAll();
  }

  function updateRewardTokensFromVoting(address[] memory _rewardTokensFromVoting) external onlyNewOwner {
    _REWARDS_TOKENS_SPECIFIC_SLOT.setLength(_rewardTokensFromVoting.length);
    for (uint i; i < _rewardTokensFromVoting.length; i++) {
      _REWARDS_TOKENS_SPECIFIC_SLOT.setAt(i, _rewardTokensFromVoting[i]);
    }
  }

  // --------------------------------------------

  /// @dev Target for all generated profit. Assume to be tetuMESH-MESH-LP vault.
  function targetRewardVault() public view returns (address) {
    return _TARGET_VAULT_SLOT.getAddress();
  }

  /// @dev Returns MESH amount under control
  function _rewardPoolBalance() internal override view returns (uint256) {
    return VOTING_MESH.lockedMESH(address(this));
  }

  /// @dev In this version rewards are accumulated in this strategy
  function doHardWork() external override pure {
    revert("MSS: Stopped");
  }

  /// @dev Stake Mesh to vMesh
  function depositToPool(uint256 /*amount*/) internal override pure {
    revert("MSS: Stopped");
  }

  /// @dev Not supported by MESH
  function withdrawAndClaimFromPool(uint256) internal pure override {
    revert("MSS: Withdraw forbidden");
  }

  /// @dev Not supported by MESH
  function emergencyWithdrawFromPool() internal pure override {
    revert("MSS: Method not supported");
  }

  /// @dev Make something useful with rewards
  function liquidateReward() internal override pure {
    revert("MSS: Stopped");
  }

  function _liquidateVotingRewards() internal pure {
    revert("MSS: Stopped");
  }

  /// @dev Not implemented
  function readyToClaim() external view override returns (uint256[] memory toClaim) {
    toClaim = new uint256[](_rewardTokens.length);
  }

  /// @dev Return full amount of staked tokens
  function poolTotalAmount() external view override returns (uint256) {
    return IERC20(_underlying()).balanceOf(address(VOTING_MESH));
  }

  /// @dev Platform name for statistical purposes
  /// @return Platform enum index
  function platform() external override pure returns (Platform) {
    return Platform.MESH;
  }

  // use gap in next implementations
}
