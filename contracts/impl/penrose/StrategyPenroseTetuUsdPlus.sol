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

import "../../strategies/penrose/PenroseStrategyBase.sol";

contract StrategyPenroseTetuUsdPlus is PenroseStrategyBase {

  address private constant _TETU = 0x255707B70BF90aa112006E1b07B9AeA6De021424;
  address private constant _USD_PLUS = 0x236eeC6359fb44CCe8f97E99387aa7F8cd5cdE1f;
  address private constant _UNDERLYING = 0x5A272ad79cBd3C874879E3FEc5753C2127f77583;


  function initialize(
    address _controller,
    address _vault
  ) external initializer {
    (ISmartVault(_vault).underlying() == _UNDERLYING, "!underlying");
    PenroseStrategyBase.initializeStrategy(_controller, _vault);
  }

  function assets() external pure override returns (address[] memory) {
    address[] memory _assets = new address[](2);
    _assets[0] = _TETU;
    _assets[1] = _USD_PLUS;
    return _assets;
  }
}
