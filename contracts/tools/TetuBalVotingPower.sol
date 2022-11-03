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

contract TetuBalVotingPower is IERC20, IERC20Metadata, ControllableV2 {

  // *************************************************************
  //                        CONSTANTS
  // *************************************************************

  address public constant DX_TETU = 0xAcEE7Bd17E7B04F7e48b29c0C91aF67758394f0f;
  address public constant TETU_BAL = 0x7fC9E0Aa043787BFad28e29632AdA302C790Ce33;
  bytes32 public constant TETU_BAL_BPT_ID = 0xb797adfb7b268faeaa90cadbfed464c76ee599cd0002000000000000000005ba;
  IBVault public constant BALANCER_VAULT = IBVault(0xBA12222222228d8Ba445958a75a0704d566BF2C8);

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
    return tetuBalPower(account) + dxTetuPower(account);
  }

  // --- tetuBAL

  function tetuBalPower(address account) public view returns (uint) {
    return IERC20(TETU_BAL).balanceOf(account);
  }

  // --- BPT tetuBAL-ETH/BAL

  function dxTetuPower(address account) public view returns (uint) {
    uint dxTetuBalance = IERC20(DX_TETU).balanceOf(account);
    uint dxTetuTotalSupply = IERC20(DX_TETU).totalSupply();

    (,uint[] memory balances,) = BALANCER_VAULT.getPoolTokens(TETU_BAL_BPT_ID);
    uint tetuBalBalance = balances[1];

    return tetuBalBalance * dxTetuBalance / dxTetuTotalSupply;
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
