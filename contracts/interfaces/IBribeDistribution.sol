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

interface IBribeDistribution {
  function VERSION() external view returns (string memory);

  function acceptOwnership() external;

  function autoNotify() external;

  function bribe() external view returns (address);

  function manualNotify(uint256 amount, bool fresh) external;

  function offerOwnership(address newOwner) external;

  function operator() external view returns (address);

  function owner() external view returns (address);

  function pendingOwner() external view returns (address);

  function round() external view returns (uint256);

  function setOperator(address operator_) external;

  function token() external view returns (address);

  function vault() external view returns (address);
}
