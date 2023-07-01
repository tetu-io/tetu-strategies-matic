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

import "@tetu_io/tetu-contracts/contracts/openzeppelin/IERC20.sol";
import "@tetu_io/tetu-contracts/contracts/openzeppelin/IERC20Metadata.sol";
import "@tetu_io/tetu-contracts/contracts/base/governance/ControllableV2.sol";
import "../third_party/balancer/IBVault.sol";

interface IVeTetu {
  function balanceOfNFT(uint) external view returns (uint);

  function tokenOfOwnerByIndex(address _owner, uint _tokenIndex) external view returns (uint);

  function lockedDerivedAmount(uint veId) external view returns (uint);
}

contract TetuBalVotingPower is IERC20, IERC20Metadata, ControllableV2 {

  // *************************************************************
  //                        CONSTANTS
  // *************************************************************

  address public constant TETU_BAL = 0x7fC9E0Aa043787BFad28e29632AdA302C790Ce33;
  IBVault public constant BALANCER_VAULT = IBVault(0xBA12222222228d8Ba445958a75a0704d566BF2C8);
  address public constant VE_TETU = 0x6FB29DD17fa6E27BD112Bc3A2D0b8dae597AeDA4;
  uint internal constant CUT_DENOMINATOR = 100;

  // *************************************************************
  //                        VARIABLES
  // *************************************************************

  /// @dev Percent of voting power that will be delegated to POL_VOTER
  ///      Will be used in off-chain distribution script for xtetuBAL
  uint public veTetuPowerCut;
  /// @dev This address will receive all voting power of veTETU and distribute bribes to veTETU holders like they deposited in xtetuBAL
  address public xtetuBalBriber;

  // *************************************************************
  //                        INIT
  // *************************************************************

  function initialize(address _controller) external initializer {
    initializeControllable(_controller);
  }

  // *************************************************************
  //                        GOV
  // *************************************************************

  /// @notice Set percent of delegation to POL
  function setVeTetuPowerCut(uint value) external {
    require(_isGovernance(msg.sender), "Not governance");
    require(value <= CUT_DENOMINATOR, "Too high");
    veTetuPowerCut = value;
  }

  /// @notice Set address who managed voting power for xtetuBAL
  function setXtetuBalBriber(address value) external {
    require(_isGovernance(msg.sender), "Not governance");
    xtetuBalBriber = value;
  }

  // *************************************************************
  //                        ERC20 DATA
  // *************************************************************

  function name() external pure override returns (string memory) {
    return "tetuBAL Voting Power";
  }

  function symbol() external pure override returns (string memory) {
    return "tetuBALPower";
  }

  function decimals() external pure override returns (uint8) {
    return uint8(18);
  }

  /// @dev Sum of all powers should be total supply of tetuBAL
  function totalSupply() external view override returns (uint) {
    return IERC20(TETU_BAL).totalSupply();
  }

  // *************************************************************
  //                        POWER
  // *************************************************************

  /// @dev Sum of powers for given account
  function balanceOf(address account) external view override returns (uint) {
    uint extra;

    if (account == xtetuBalBriber) {
      // we are using all available balance
      // the cut will be executed in xtetuBAL distribution process
      extra = tetuBalInBalancer();
    }

    return tetuBalPower(account) + extra;
  }

  // --- tetuBAL

  function tetuBalPower(address account) public view returns (uint) {
    // in unreal case we need to exclude it - tetuBAL inside balancer suppose to be used for veTETU power
    if (account == address(BALANCER_VAULT)) {
      return 0;
    }
    return IERC20(TETU_BAL).balanceOf(account);
  }

  // --- BPT tetuBAL-ETH/BAL

  function tetuBalInBalancer() public view returns (uint) {
    // any balancer pools will keep the balance on the vault
    // we will use them for veTETU power
    // exception is boosted pools but we assume they will not exist for tetuBAL
    return IERC20(TETU_BAL).balanceOf(address(BALANCER_VAULT));
  }

  // **********************************************
  //                   STUBS
  // **********************************************

  function transfer(address /*recipient*/, uint /*amount*/) external pure override returns (bool) {
    revert("Not supported");
  }

  function allowance(address /*owner*/, address /*spender*/) external pure override returns (uint) {
    return 0;
  }

  function approve(address /*spender*/, uint /*amount*/) external pure override returns (bool) {
    revert("Not supported");
  }

  function transferFrom(
    address /*sender*/,
    address /*recipient*/,
    uint /*amount*/
  ) external pure override returns (bool) {
    revert("Not supported");
  }


}
