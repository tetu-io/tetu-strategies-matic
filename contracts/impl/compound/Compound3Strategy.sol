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

import "../../strategies/compound/Compound3StrategyBase.sol";

contract Compound3Strategy is Compound3StrategyBase {
    function initialize(
        address controller_,
        address underlying_,
        address vault_,
        address comet_,
        uint buybackRatio_
    ) external initializer {
        require(ISmartVault(vault_).underlying() == underlying_, "!underlying");
        Compound3StrategyBase.initializeStrategy(controller_, underlying_, vault_, comet_, buybackRatio_);
    }
}
