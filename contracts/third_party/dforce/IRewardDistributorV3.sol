// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.4;

interface IRewardDistributorV3 {
  event DistributionBorrowSpeedUpdated(address iToken, uint256 borrowSpeed);
  event DistributionSupplySpeedUpdated(address iToken, uint256 supplySpeed);
  event GlobalDistributionSpeedsUpdated(
    uint256 borrowSpeed,
    uint256 supplySpeed
  );
  event NewDistributionFactor(
    address iToken,
    uint256 oldDistributionFactorMantissa,
    uint256 newDistributionFactorMantissa
  );
  event NewOwner(address indexed previousOwner, address indexed newOwner);
  event NewPendingOwner(
    address indexed oldPendingOwner,
    address indexed newPendingOwner
  );
  event NewRecipient(address iToken, uint256 distributionFactor);
  event NewRewardToken(address oldRewardToken, address newRewardToken);
  event Paused(bool paused);
  event RewardDistributed(
    address iToken,
    address account,
    uint256 amount,
    uint256 accountIndex
  );

  function _acceptOwner() external;

  function _addRecipient(address _iToken, uint256 _distributionFactor)
  external;

  function _pause() external;

  function _setDistributionBorrowSpeeds(
    address[] memory _iTokens,
    uint256[] memory _borrowSpeeds
  ) external;

  function _setDistributionSpeeds(
    address[] memory _borrowiTokens,
    uint256[] memory _borrowSpeeds,
    address[] memory _supplyiTokens,
    uint256[] memory _supplySpeeds
  ) external;

  function _setDistributionSupplySpeeds(
    address[] memory _iTokens,
    uint256[] memory _supplySpeeds
  ) external;

  function _setPendingOwner(address newPendingOwner) external;

  function _setRewardToken(address _newRewardToken) external;

  function _unpause(
    address[] memory _borrowiTokens,
    uint256[] memory _borrowSpeeds,
    address[] memory _supplyiTokens,
    uint256[] memory _supplySpeeds
  ) external;

  function claimAllReward(address[] memory _holders) external;

  function claimReward(address[] memory _holders, address[] memory _iTokens)
  external;

  function claimRewards(
    address[] memory _holders,
    address[] memory _suppliediTokens,
    address[] memory _borrowediTokens
  ) external;

  function controller() external view returns (address);

  function distributionBorrowState(address)
  external
  view
  returns (uint256 index, uint256 _block);

  function distributionBorrowerIndex(address, address)
  external
  view
  returns (uint256);

  function distributionFactorMantissa(address)
  external
  view
  returns (uint256);

  function distributionSpeed(address) external view returns (uint256);

  function distributionSupplierIndex(address, address)
  external
  view
  returns (uint256);

  function distributionSupplySpeed(address) external view returns (uint256);

  function distributionSupplyState(address)
  external
  view
  returns (uint256 index, uint256 _block);

  function globalDistributionSpeed() external view returns (uint256);

  function globalDistributionSupplySpeed() external view returns (uint256);

  function initialize(address _controller) external;

  function owner() external view returns (address);

  function paused() external view returns (bool);

  function pendingOwner() external view returns (address);

  function reward(address) external view returns (uint256);

  function rewardToken() external view returns (address);

  function updateDistributionState(address _iToken, bool _isBorrow) external;

  function updateReward(
    address _iToken,
    address _account,
    bool _isBorrow
  ) external;

  function updateRewardBatch(
    address[] memory _holders,
    address[] memory _iTokens
  ) external;
}
