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

import "../../strategies/klima/KlimaStakingStrategyBase.sol";


contract StrategyKlimaStaking is KlimaStakingStrategyBase {

  address private constant _KLIMA_STAKING = address(0x25d28a24Ceb6F81015bB0b2007D795ACAc411b4d);
  address private constant _KLIMA = address(0x4e78011Ce80ee02d2c3e649Fb657E45898257815);
  address[] private _poolRewards = [_KLIMA];
  address[] private _assets = [_KLIMA];

  constructor(
    address _controller,
    address _vault,
    address _underlying
  ) KlimaStakingStrategyBase(_controller, _underlying, _vault, _poolRewards, _KLIMA_STAKING) {
  }

  // assets should reflect underlying tokens need to investing
  function assets() external override view returns (address[] memory) {
    return _assets;
  }
}
