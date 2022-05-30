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

import "../../strategies/mesh/MeshSinglePoolBase.sol";

contract StrategyMeshSinglePool is MeshSinglePoolBase {

  // !!! ONLY CONSTANTS AND DYNAMIC ARRAYS/MAPS !!!
  // push elements to arrays instead of predefine setup
  address private constant _MESH = address(0x82362Ec182Db3Cf7829014Bc61E9BE8a2E82868a);
  address[] private _poolRewards;
  address[] private _assets;

  function initialize(
    address _controller,
    address _vault,
    address _underlying,
    address _meshSinglePool
  ) external initializer {
    require(_meshSinglePool != address(0), "zero mesh pool address");
    _assets.push(_underlying);
    _poolRewards.push(_MESH);
    MeshSinglePoolBase.initializeStrategy(_controller, _vault, _underlying, _poolRewards, _meshSinglePool);
  }

  // assets should reflect underlying tokens need to investing
  function assets() external override view returns (address[] memory) {
    return _assets;
  }
}
