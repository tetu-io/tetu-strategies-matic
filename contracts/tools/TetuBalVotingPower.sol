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
  bytes32 public constant TETU_BAL_BPT_ID = 0xb797adfb7b268faeaa90cadbfed464c76ee599cd0002000000000000000005ba;
  IBVault public constant BALANCER_VAULT = IBVault(0xBA12222222228d8Ba445958a75a0704d566BF2C8);
  address public constant VE_TETU = 0x6FB29DD17fa6E27BD112Bc3A2D0b8dae597AeDA4;
  address public constant POL_VOTER = 0x6672A074B98A7585A8549356F97dB02f9416849E;
  uint internal constant CUT_DENOMINATOR = 100;

  // *************************************************************
  //                        VARIABLES
  // *************************************************************

  /// @dev Percent of voting power that will be delegated to POL_VOTER
  uint public veTetuPowerCut;

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

    if (account == POL_VOTER) {
      extra = tetuBalInPool() * veTetuPowerCut / CUT_DENOMINATOR;
    }

    return tetuBalPower(account) + veTetuPower(account) + extra;
  }

  // --- tetuBAL

  function tetuBalPower(address account) public view returns (uint) {
    return IERC20(TETU_BAL).balanceOf(account);
  }

  // --- BPT tetuBAL-ETH/BAL

  function veTetuPower(address account) public view returns (uint) {
    uint power = veTetuPowerWithoutCut(account);
    power -= power * veTetuPowerCut / CUT_DENOMINATOR;
    return power;
  }

  function veTetuPowerWithoutCut(address account) public view returns (uint) {
    uint tetuBalBalance = tetuBalInPool();

    uint veTetuTotalPower = IERC20(VE_TETU).totalSupply();

    uint nftCount = IERC20(VE_TETU).balanceOf(account);

    // protection against ddos
    nftCount = nftCount > 20 ? 20 : nftCount;

    uint power;
    for (uint i; i < nftCount; ++i) {
      uint veId = IVeTetu(VE_TETU).tokenOfOwnerByIndex(account, i);
      power += IVeTetu(VE_TETU).balanceOfNFT(veId);
    }
    return tetuBalBalance * power / veTetuTotalPower;
  }

  function tetuBalInPool() public view returns (uint) {
    (,uint[] memory balances,) = BALANCER_VAULT.getPoolTokens(TETU_BAL_BPT_ID);
    return balances[1];
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
