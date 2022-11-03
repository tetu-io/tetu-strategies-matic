// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

interface IClaimable {
  function claim(address token) external;
}
