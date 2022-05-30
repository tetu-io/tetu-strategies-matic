// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

interface ISinglePool {
  function name() external view returns (string memory);

  function totalSupply() external view returns (uint256);

  function decimals() external view returns (uint8);

  function poolTotalBorrows(address)
  external
  view
  returns (uint256 principal, uint256 interestIndex);

  function reserveFactor() external view returns (uint256);

  function totalBorrows() external view returns (uint256);

  function singlePoolFactory() external view returns (address);

  function userRewardSum(address) external view returns (uint256);

  function mining() external view returns (uint256);

  function accrualBlockNumber() external view returns (uint256);

  function balanceOf(address) external view returns (uint256);

  function miningIndex() external view returns (uint256);

  function totalReserves() external view returns (uint256);

  function symbol() external view returns (string memory);

  function entered() external view returns (bool);

  function borrowIndex() external view returns (uint256);

  function lastMined() external view returns (uint256);

  function withdrawActive() external view returns (bool);

  function depositActive() external view returns (bool);

  function allowance(address, address) external view returns (uint256);

  function userLastIndex(address) external view returns (uint256);

  function interestRateModel() external view returns (address);

  function token() external view returns (address);

  function version() external pure returns (string memory);

  function transfer(address _to, uint256 _value) external returns (bool);

  function transferFrom(
    address _from,
    address _to,
    uint256 _value
  ) external returns (bool);

  function approve(address _spender, uint256 _value) external returns (bool);

  function changeMiningRate(uint256 _mining) external;

  function initPool() external;

  function setDepositActive(bool b) external;

  function setWithdrawActive(bool b) external;

  function updateMiningIndex() external;

  function claimReward() external;

  function getCash() external view returns (uint256);

  function borrowRatePerBlock() external view returns (uint256);

  function supplyRatePerBlock() external view returns (uint256);

  function totalBorrowsCurrent() external returns (uint256);

  function borrowBalanceInfo(address account, address poolAddress)
  external
  view
  returns (uint256, uint256);

  function borrowBalanceCurrent(address account, address poolAddress)
  external
  returns (uint256);

  function borrowBalanceStored(address account, address poolAddress)
  external
  view
  returns (uint256);

  function borrowBalancePoolTotal(address poolAddress)
  external
  view
  returns (uint256);

  function exchangeRateCurrent() external returns (uint256);

  function exchangeRateStored() external view returns (uint256);

  function accrueInterest() external;

  function depositETH() external payable;

  function depositToken(uint256 depositAmount) external;

  function withdrawETHByAmount(uint256 withdrawTokens) external;

  function withdrawETH(uint256 withdrawAmount) external;

  function withdrawTokenByAmount(uint256 withdrawTokens) external;

  function withdrawToken(uint256 withdrawAmount) external;

  function borrow(
    address user,
    uint256 borrowAmount,
    address plusPoolAddress
  ) external returns (uint256, uint256);

  function addReserves(uint256 addAmount) external payable returns (uint256);

  function reduceReserves(address admin, uint256 reduceAmount) external;
}
