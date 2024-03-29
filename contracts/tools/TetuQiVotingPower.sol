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

contract TetuQiVotingPower is IERC20, IERC20Metadata, ControllableV2 {

  // *************************************************************
  //                        CONSTANTS
  // *************************************************************

  address public constant TETU_QI = 0x4Cd44ced63d9a6FEF595f6AD3F7CED13fCEAc768;
  bytes32 public constant TETU_QI_BPT_ID = 0x05f21bacc4fd8590d1eaca9830a64b66a733316c00000000000000000000087e;
  IBVault public constant BALANCER_VAULT = IBVault(0xBA12222222228d8Ba445958a75a0704d566BF2C8);
  address public constant VE_TETU = 0x6FB29DD17fa6E27BD112Bc3A2D0b8dae597AeDA4;

  // *************************************************************
  //                        INIT
  // *************************************************************

  function initialize(address _controller) external initializer {
    initializeControllable(_controller);
  }

  // *************************************************************
  //                        ERC20 DATA
  // *************************************************************

  function name() external pure override returns (string memory) {
    return "tetuQI Voting Power";
  }

  function symbol() external pure override returns (string memory) {
    return "tetuQIPower";
  }

  function decimals() external pure override returns (uint8) {
    return uint8(18);
  }

  /// @dev Sum of all powers should be total supply of tetuBAL
  function totalSupply() external view override returns (uint) {
    return IERC20(TETU_QI).totalSupply();
  }

  // *************************************************************
  //                        POWER
  // *************************************************************

  /// @dev Sum of powers for given account
  function balanceOf(address account) external view override returns (uint) {
    return tetuQiPower(account) + veTetuPower(account);
  }

  // --- tetuBAL

  function tetuQiPower(address account) public view returns (uint) {
    return IERC20(TETU_QI).balanceOf(account);
  }

  // --- BPT tetuQI/QI

  function veTetuPower(address account) public view returns (uint) {
    (,uint[] memory balances,) = BALANCER_VAULT.getPoolTokens(TETU_QI_BPT_ID);
    uint tetuQiBalance = balances[1];

    uint veTetuTotalPower = IERC20(VE_TETU).totalSupply();

    uint nftCount = IERC20(VE_TETU).balanceOf(account);

    // protection against ddos
    nftCount = nftCount > 20 ? 20 : nftCount;

    uint power;
    for (uint i; i < nftCount; ++i) {
      uint veId = IVeTetu(VE_TETU).tokenOfOwnerByIndex(account, i);
      power += IVeTetu(VE_TETU).balanceOfNFT(veId);
    }
    return tetuQiBalance * power / veTetuTotalPower;
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
