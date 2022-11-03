// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

interface IPenPool {
  function stakingAddress() external view returns (address);

  function dystPoolAddress() external view returns (address);

  function depositLpAndStake(uint256) external;

  function depositLp(uint256) external;

  function withdrawLp(uint256) external;

  function syncBribeTokens() external;

  function notifyBribeOrFees() external;

  function initialize(
    address,
    address,
    address,
    string memory,
    string memory,
    address,
    address
  ) external;

  function gaugeAddress() external view returns (address);

  function balanceOf(address) external view returns (uint256);

  function transfer(address recipient, uint256 amount)
  external
  returns (bool);

  function approve(address spender, uint256 amount) external returns (bool);

  function totalSupply() external view returns (uint256);
}
