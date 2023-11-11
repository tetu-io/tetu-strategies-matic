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

import "@tetu_io/tetu-contracts/contracts/base/strategies/ProxyStrategyBase.sol";
import "@tetu_io/tetu-contracts/contracts/base/SlotsLib.sol";
import "../../third_party/balancer/IBVault.sol";

/// @title Base contract for sending assets to bridge and receive rewards
/// @author belbix
abstract contract BalBridgedStakingStrategyBase is ProxyStrategyBase {
  using SafeERC20 for IERC20;
  using SlotsLib for bytes32;

  // --------------------- CONSTANTS -------------------------------
  /// @notice Strategy type for statistical purposes
  string public constant override STRATEGY_NAME = "BalBridgedStakingStrategyBase";
  /// @notice Version of the contract
  /// @dev Should be incremented when contract changed
  string public constant VERSION = "1.1.3";
  address public constant BRIBER = 0x6672A074B98A7585A8549356F97dB02f9416849E;
  address internal constant _WETH = 0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619;
  address internal constant _BAL = 0x9a71012B13CA4d3D0Cdc72A177DF3ef03b0E76A3;
  address private constant _BAL_ETH_USDC_WMATIC_POOL = 0x0297e37f1873D2DAb4487Aa67cD56B58E2F27875;
  bytes32 private constant _BAL_ETH_USDC_WMATIC_POOL_ID = 0x0297e37f1873d2dab4487aa67cd56b58e2f27875000100000000000000000002;
  bytes32 private constant _BAL_ETH_POOL_ID = 0x3d468ab2329f296e1b9d8476bb54dd77d8c2320f000200000000000000000426;
  address private constant _BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;
  ISmartVault private constant _BAL_TETU_VAULT = ISmartVault(0x1AB27A11A5A932e415067f6f20a65245Bd47E4D1);
  bytes32 internal constant _SENDER_KEY = bytes32(uint256(keccak256("s.sender")) - 1);
  bytes32 internal constant _INVESTED_KEY = bytes32(uint256(keccak256("s.invested")) - 1);
  bytes32 internal constant _TARGET_VAULT = bytes32(uint256(keccak256("s.target.vault")) - 1);
  bytes32 internal constant _POL_RATIO = bytes32(uint256(keccak256("s.pol.ratio")) - 1);

  /// @notice Initialize contract after setup it as proxy implementation
  function initializeStrategy(
    address controller_,
    address underlying_,
    address vault_,
    address[] memory rewardTokens_,
    address sender_
  ) public initializer {
    _SENDER_KEY.set(sender_);
    ProxyStrategyBase.initializeStrategyBase(
      controller_,
      underlying_,
      vault_,
      rewardTokens_,
      100_00
    );
  }

  // --------------------------------------------

  function balSender() external view returns (address) {
    return _SENDER_KEY.getAddress();
  }

  /// @dev This vault will receive all rewards
  function targetVault() public view returns (address) {
    return _TARGET_VAULT.getAddress();
  }

  /// @dev Set target vault
  function setTargetVault(address value) external restricted {
    _TARGET_VAULT.set(value);
  }

  /// @dev Set POL ratio
  function setPolRatio(uint value) external restricted {
    _POL_RATIO.set(value);
  }

  /// @dev Transfer BPT tokens to sender
  function _sendToBridge() internal {
    IERC20 u = IERC20(_underlying());
    uint balance = u.balanceOf(address(this));
    if (balance > 0) {
      // save BPT balance that was transfer to sender
      _INVESTED_KEY.set(_INVESTED_KEY.getUint() + balance);
      u.safeTransfer(_SENDER_KEY.getAddress(), balance);
    }
  }

  // --------------------------------------------

  /// @notice Return only pool balance. Assume that we ALWAYS invest on vault deposit action
  function investedUnderlyingBalance() external override view returns (uint) {
    return _rewardPoolBalance();
  }

  /// @dev Returns underlying balance in the pool
  function _rewardPoolBalance() internal override view returns (uint256) {
    return _INVESTED_KEY.getUint();
  }

  /// @dev Collect profit and do something useful with them
  function doHardWork() external override {
    // we received veBAL rewards in form of BAL tokens from mainnet
    // the whole process simplified for avoid price impact loses
    uint balBalance = IERC20(_BAL).balanceOf(address(this));
    if (balBalance != 0) {
      // send whole amount to the briber for manual handling for the reason huge price impact
      IERC20(_BAL).safeTransfer(BRIBER, balBalance);
    }

    // in case if we will change BAL to WETH
    uint ethBalance = IERC20(_WETH).balanceOf(address(this));
    if (ethBalance != 0) {
      // send whole amount to the briber for manual handling for the reason huge price impact
      IERC20(_WETH).safeTransfer(BRIBER, ethBalance);
    }

    if (balBalance != 0 || ethBalance != 0) {
      //register as hardwork if transferred
      IBookkeeper(IController(_controller()).bookkeeper()).registerStrategyEarned(0);
    }
  }

  function liquidateReward() internal override {
    //noop
  }

  /// @dev Stake underlying to the pool with maximum lock period
  function depositToPool(uint256 amount) internal override {
    if (amount > 0) {
      _sendToBridge();
    }
  }

  /// @dev We will not able to withdraw from the pool
  function withdrawAndClaimFromPool(uint256) internal pure override {
    revert("BBSS: Withdraw forbidden");
  }

  /// @dev Not able to withdraw in any form
  function emergencyWithdrawFromPool() internal pure override {
    revert("BBSS: Withdraw forbidden");
  }

  /// @dev No claimable tokens
  function readyToClaim() external view override returns (uint256[] memory) {
    uint256[] memory toClaim = new uint256[](_rewardTokens.length);
    return toClaim;
  }

  /// @dev Assume that sent tokes is the whole pool balance
  function poolTotalAmount() external view override returns (uint256) {
    return _INVESTED_KEY.getUint();
  }

  /// @dev How much veBAL rewards will send to POL
  function polRatio() public view returns (uint256) {
    return _POL_RATIO.getUint();
  }

  /// @dev Platform name for statistical purposes
  /// @return Platform enum index
  function platform() external override pure returns (Platform) {
    return Platform.BALANCER;
  }

  // use gap in other implementations
}
