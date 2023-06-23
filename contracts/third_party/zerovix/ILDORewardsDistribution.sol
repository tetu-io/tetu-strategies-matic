// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

interface ILDORewardsDistribution {
    function rewardToken() external view returns(address);
    function userRewardsBalance(address user) external view returns(uint);
    function collectRewards() external;
    function epochNumber() external view returns(uint);
    function owner() external view returns (address);
    function updateEpochParams(uint epoch, uint supplyRewards, uint borrowRewards) external;
    function updateUsersPosition(address[] memory user, uint epoch) external;
    function updateUsersRewards(address[] memory user, uint epoch) external;
}