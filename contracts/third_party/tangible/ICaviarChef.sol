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

import "@tetu_io/tetu-contracts/contracts/openzeppelin/IERC20.sol";

interface ICaviarChef {
  function balanceOf() external view returns (uint256);

  function userInfo(address _user) external view returns (uint256, uint256);

  function deposit(uint256 amount, address to) external;

  function withdrawAndHarvest(uint256 amount, address to) external;

  function emergencyWithdraw(address to) external;

  function harvest(address to) external;

  function underlying() external view returns (IERC20);

  function rewardToken() external view returns (address);

  function pendingReward(address) external view returns (uint256);

  function seedRewards(uint256 _amount) external;

  function smartWalletChecker() external view returns (address);

}