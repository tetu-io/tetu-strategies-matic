// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

interface IOToken {
    function mint(uint mintAmount) external returns (uint);
    function underlying() external view returns(address);
    function balanceOf(address owner) external view returns (uint);
    function exchangeRateStored() external view returns (uint);
    function totalSupply() external view returns (uint);
    function redeemUnderlying(uint redeemAmount) external returns (uint);
    function accrueInterest() external returns (uint256);
}
