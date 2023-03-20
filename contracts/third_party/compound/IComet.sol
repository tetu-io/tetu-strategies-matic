// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

interface IComet {
    function supply(address asset, uint amount) external;
    function withdraw(address asset, uint amount) external;
    function baseToken() external view returns (address);
    function balanceOf(address account) external view returns (uint);
    function totalSupply() external view returns (uint);
}