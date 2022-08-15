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

import "../../strategies/aave/Aave3StrategyBase.sol";

contract Aave3Strategy is Aave3StrategyBase {
  using SafeERC20 for IERC20;

  address public AAVE_V3_POOL_MATIC = 0x794a61358D6845594F94dc1DB02A252b5b4814aD;\

  function initialize(
    address controller_,
    address underlying_,
    address vault_
  ) external initializer {
    Aave3StrategyBase.initializeStrategy(controller_, underlying_, vault_, AAVE_V3_POOL_MATIC);
  }


}