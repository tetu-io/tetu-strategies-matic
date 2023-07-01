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

import "@tetu_io/tetu-contracts/contracts/base/governance/ControllableV2.sol";
import "@tetu_io/tetu-contracts/contracts/openzeppelin/SafeERC20.sol";
import "../../third_party/balancer/IBVault.sol";
import "../../interfaces/ISmartVault.sol";
import "./ITetuBalHolder.sol";
import "../../third_party/IDelegation.sol";
import "../../interfaces/ITetuLiquidator.sol";

contract TetuBalHolder is ControllableV2, ITetuBalHolder {
  using SafeERC20 for IERC20;

  // ----- CONSTANTS -------

  IBVault public constant BALANCER_VAULT = IBVault(0xBA12222222228d8Ba445958a75a0704d566BF2C8);
  address public constant TETU_BAL_VAULT = 0x7fC9E0Aa043787BFad28e29632AdA302C790Ce33;

  address public constant BALANCER_BAL_ETH_POOL = 0x3d468AB2329F296e1b9d8476Bb54Dd77D8c2320f;
  bytes32 public constant BALANCER_BAL_ETH_POOL_ID = 0x3d468ab2329f296e1b9d8476bb54dd77d8c2320f000200000000000000000426;
//  address public constant BALANCER_tetuBAL_POOL = 0xB797AdfB7b268faeaA90CAdBfEd464C76ee599Cd;
//  bytes32 public constant BALANCER_tetuBAL_POOL_ID = 0xb797adfb7b268faeaa90cadbfed464c76ee599cd0002000000000000000005ba;
  address public constant BAL_TOKEN = 0x9a71012B13CA4d3D0Cdc72A177DF3ef03b0E76A3;
  address public constant WETH_TOKEN = 0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619;

  ITetuLiquidator public constant TETU_LIQUIDATOR = ITetuLiquidator(0xC737eaB847Ae6A92028862fE38b828db41314772);

  bytes32 public constant TETU_BAL_ENS = bytes32("tetubal.eth");
  address public constant DELEGATE_REGISTRY = 0x469788fE6E9E9681C6ebF3bF78e7Fd26Fc015446;


  // ----- INITIALIZER -------

  function initialize(address controller_) external initializer {
    initializeControllable(controller_);
  }

  modifier onlyGov() {
    require(_isGovernance(msg.sender), "!gov");
    _;
  }

  // ----- GOV ACTIONS -------

  function delegateSnapshotVotes(address to) external onlyGov {
    IDelegation(DELEGATE_REGISTRY).setDelegate(TETU_BAL_ENS, to);
  }

  function clearDelegatedSnapshotVotes() external onlyGov {
    IDelegation(DELEGATE_REGISTRY).clearDelegate(TETU_BAL_ENS);
  }

  function withdraw(address recipient) external onlyGov {
    uint amount = IERC20(TETU_BAL_VAULT).balanceOf(address(this));
    if (amount != 0) {
      IERC20(TETU_BAL_VAULT).safeTransfer(recipient, amount);
    }
  }

  // ----- MAIN LOGIC -------

  /// @dev Deposit BAL to BAL/ETH pool. Then deposit BPT to tetuBAL vault.
  ///      Anyone can deposit.
  function depositBAL(uint balAmount) external override {
    IAsset[] memory poolTokens = new IAsset[](2);
    poolTokens[0] = IAsset(WETH_TOKEN);
    poolTokens[1] = IAsset(BAL_TOKEN);

    _balancerJoin(poolTokens, BALANCER_BAL_ETH_POOL_ID, BAL_TOKEN, balAmount);

    uint bptAmount = IERC20(BALANCER_BAL_ETH_POOL).balanceOf(address(this));

    (ITetuLiquidator.PoolData[] memory route, string memory errorMessage) = TETU_LIQUIDATOR.buildRoute(BALANCER_BAL_ETH_POOL, TETU_BAL_VAULT);
    if (route.length == 0) {
      revert(errorMessage);
    }

    uint amountOut = TETU_LIQUIDATOR.getPriceForRoute(route, bptAmount);

    if (amountOut < bptAmount) {
      _approveIfNeeds(BALANCER_BAL_ETH_POOL, bptAmount, TETU_BAL_VAULT);
      ISmartVault(TETU_BAL_VAULT).depositAndInvest(bptAmount);
    } else {
      _approveIfNeeds(BALANCER_BAL_ETH_POOL, bptAmount, address(TETU_LIQUIDATOR));
      TETU_LIQUIDATOR.liquidateWithRoute(route, bptAmount, 100_000);
    }
  }

  // ----- INTERNAL LOGIC -------

  /// @dev Swap _tokenIn to _tokenOut using pool identified by _poolId
  function _balancerSwap(bytes32 _poolId, address _tokenIn, address _tokenOut, uint _amountIn) internal {
    if (_amountIn != 0) {
      IBVault.SingleSwap memory singleSwapData = IBVault.SingleSwap({
      poolId : _poolId,
      kind : IBVault.SwapKind.GIVEN_IN,
      assetIn : IAsset(_tokenIn),
      assetOut : IAsset(_tokenOut),
      amount : _amountIn,
      userData : ""
      });

      IBVault.FundManagement memory fundManagementStruct = IBVault.FundManagement({
      sender : address(this),
      fromInternalBalance : false,
      recipient : payable(address(this)),
      toInternalBalance : false
      });

      _approveIfNeeds(_tokenIn, _amountIn, address(BALANCER_VAULT));
      BALANCER_VAULT.swap(singleSwapData, fundManagementStruct, 1, block.timestamp);
    }
  }

  /// @dev Join to the given pool (exchange tokenIn to underlying BPT)
  function _balancerJoin(IAsset[] memory _poolTokens, bytes32 _poolId, address _tokenIn, uint _amountIn) internal {
    if (_amountIn != 0) {
      uint[] memory amounts = new uint[](_poolTokens.length);
      for (uint i = 0; i < amounts.length; i++) {
        amounts[i] = address(_poolTokens[i]) == _tokenIn ? _amountIn : 0;
      }
      bytes memory userData = abi.encode(1, amounts, 1);
      IBVault.JoinPoolRequest memory request = IBVault.JoinPoolRequest({
      assets : _poolTokens,
      maxAmountsIn : amounts,
      userData : userData,
      fromInternalBalance : false
      });
      _approveIfNeeds(_tokenIn, _amountIn, address(BALANCER_VAULT));
      BALANCER_VAULT.joinPool(_poolId, address(this), address(this), request);
    }
  }

  function _approveIfNeeds(address token, uint amount, address spender) internal {
    if (IERC20(token).allowance(address(this), spender) < amount) {
      IERC20(token).safeApprove(spender, 0);
      IERC20(token).safeApprove(spender, type(uint).max);
    }
  }

}
