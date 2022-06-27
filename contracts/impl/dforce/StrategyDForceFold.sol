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


import "../../strategies/dforce/DForceFoldStrategyBase.sol";

contract StrategyDForceFold is DForceFoldStrategyBase {

  address private constant DF = 0x08C15FA26E519A78a666D19CE5C646D55047e0a3;
  address[] private _poolRewards = [DF];
  address[] private _assets;

  constructor(
    address _controller,
    address _vault,
    address _underlying,
    address _iToken,
    uint256 _borrowTargetFactorNumerator,
    uint256 _collateralFactorNumerator
  ) DForceFoldStrategyBase(
    _controller,
    _underlying,
    _vault,
    _poolRewards,
    _borrowTargetFactorNumerator,
    _collateralFactorNumerator,
    _iToken
  ) {
    require(_underlying != address(0), "zero underlying");
    _assets.push(_underlying);
  }

  // assets should reflect underlying tokens need to investing
  function assets() external override view returns (address[] memory) {
    return _assets;
  }
}
