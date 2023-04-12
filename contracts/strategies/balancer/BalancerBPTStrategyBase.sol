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
import "../../third_party/balancer/IBalancerGauge.sol";
import "../../third_party/balancer/IBVault.sol";
import "../../interface/ITetuLiquidator.sol";

/// @title Base contract for BPT farming
/// @author belbix
abstract contract BalancerBPTStrategyBase is ProxyStrategyBase {
  using SafeERC20 for IERC20;

  // *******************************************************
  //                      CONSTANTS
  // *******************************************************

  /// @notice Strategy type for statistical purposes
  string public constant override STRATEGY_NAME = "BalancerBPTStrategyBase";
  /// @notice Version of the contract
  /// @dev Should be incremented when contract changed
  string public constant VERSION = "1.0.4";

  uint private constant PRICE_IMPACT_TOLERANCE = 10_000;
  IBVault public constant BALANCER_VAULT = IBVault(0xBA12222222228d8Ba445958a75a0704d566BF2C8);
  ITetuLiquidator public constant TETU_LIQUIDATOR = ITetuLiquidator(0xC737eaB847Ae6A92028862fE38b828db41314772);
  address internal constant DEFAULT_PERF_FEE_RECEIVER = 0x9Cc199D4353b5FB3e6C8EEBC99f5139e0d8eA06b;

  // *******************************************************
  //                      VARIABLES
  // *******************************************************

  address public depositToken;
  IAsset[] public poolTokens;
  bytes32 public poolId;
  IBalancerGauge public gauge;
  uint public lastHw;

  /// @notice Initialize contract after setup it as proxy implementation
  function initializeStrategy(
    address controller_,
    address vault_,
    address depositToken_,
    bytes32 poolId_,
    address gauge_,
    uint buybackRatio_
  ) public initializer {

    (IERC20[] memory tokens,,) = BALANCER_VAULT.getPoolTokens(poolId_);
    IAsset[] memory tokenAssets = new IAsset[](tokens.length);
    for (uint i = 0; i < tokens.length; i++) {
      tokenAssets[i] = IAsset(address(tokens[i]));
    }
    poolTokens = tokenAssets;

    depositToken = depositToken_;
    poolId = poolId_;

    gauge = IBalancerGauge(gauge_);
    IERC20(_getPoolAddress(poolId_)).safeApprove(address(gauge_), type(uint).max);


    address[] memory rewardTokensTmp = new address[](100);
    uint rtsLength;
    for (uint i = 0; i < 100; ++i) {
      address rt = gauge.reward_tokens(i);
      if (rt == address(0)) {
        break;
      }
      rewardTokensTmp[i] = rt;
      rtsLength++;
    }
    address[] memory rewardTokens_ = new address[](rtsLength);
    for (uint i = 0; i < rtsLength; ++i) {
      rewardTokens_[i] = rewardTokensTmp[i];
    }

    ProxyStrategyBase.initializeStrategyBase(
      controller_,
      _getPoolAddress(poolId_),
      vault_,
      rewardTokens_,
      buybackRatio_
    );
  }

  // *******************************************************
  //                      GOV ACTIONS
  // *******************************************************

  /// @dev Set new reward tokens
  function setRewardTokens(address[] memory rts) external restricted {
    delete _rewardTokens;
    for (uint i = 0; i < rts.length; i++) {
      _rewardTokens.push(rts[i]);
      _unsalvageableTokens[rts[i]] = true;
    }
  }

  // *******************************************************
  //                      STRATEGY LOGIC
  // *******************************************************

  /// @dev Balance of staked LPs in the gauge
  function _rewardPoolBalance() internal override view returns (uint256) {
    return gauge.balanceOf(address(this));
  }

  /// @dev Rewards amount ready to claim
  function readyToClaim() external view override returns (uint256[] memory toClaim) {
    IBalancerGauge _gauge = gauge;
    toClaim = new uint256[](_rewardTokens.length);
    for (uint i; i < toClaim.length; i++) {
      address rt = _rewardTokens[i];
      toClaim[i] = _gauge.claimable_reward(address(this), rt);
    }
  }

  /// @dev Return TVL of the farmable pool
  function poolTotalAmount() external view override returns (uint256) {
    return IERC20(_underlying()).balanceOf(address(gauge));
  }

  /// @dev Platform name for statistical purposes
  /// @return Platform enum index
  function platform() external override pure returns (Platform) {
    return Platform.BALANCER;
  }

  /// @dev assets should reflect underlying tokens need to investing
  function assets() external override view returns (address[] memory) {
    address[] memory token = new address[](poolTokens.length);
    for (uint i = 0; i < poolTokens.length; i++) {
      token[i] = address(poolTokens[i]);
    }
    return token;
  }

  /// @dev Deposit LP tokens to gauge
  function depositToPool(uint256 amount) internal override {
    _doHardWork(true, false);
    // doHardWork can deposit all underlyings
    amount = IERC20(_underlying()).balanceOf(address(this));
    if (amount != 0) {
      gauge.deposit(amount);
    }
  }

  /// @dev Withdraw LP tokens from gauge
  function withdrawAndClaimFromPool(uint256 amount) internal override {
    if (amount != 0) {
      gauge.withdraw(amount);
    }
    _doHardWork(true, false);
  }

  /// @dev Emergency withdraw all from a gauge
  function emergencyWithdrawFromPool() internal override {
    gauge.withdraw(gauge.balanceOf(address(this)));
  }

  /// @dev Make something useful with rewards
  function doHardWork() external onlyNotPausedInvesting override hardWorkers {
    _doHardWork(false, true);
  }

  function _doHardWork(bool silently, bool push) internal {
    uint _lastHw = lastHw;
    if (push || _lastHw == 0 || block.timestamp - _lastHw > 12 hours) {
      gauge.claim_rewards();
      _liquidateRewards(silently);
      lastHw = block.timestamp;
    }
  }

  /// @dev Deprecated
  function liquidateReward() internal override {
    // noop
  }

  function _liquidateRewards(bool silently) internal {
    address _depositToken = depositToken;
    uint bbRatio = _buyBackRatio();
    address[] memory rts = _rewardTokens;
    uint undBalanceBefore = IERC20(_underlying()).balanceOf(address(this));
    for (uint i = 0; i < rts.length; i++) {
      address rt = rts[i];
      uint amount = IERC20(rt).balanceOf(address(this));
      if (amount != 0) {
        uint toCompound = amount * (_BUY_BACK_DENOMINATOR - bbRatio) / _BUY_BACK_DENOMINATOR;
        uint toGov = amount - toCompound;
        if (toCompound != 0) {
          _liquidate(rt, _depositToken, toCompound, silently);
        }

        if (toGov != 0) {
          IERC20(rt).safeTransfer(DEFAULT_PERF_FEE_RECEIVER, toGov);
        }
      }
    }

    uint toPool = IERC20(_depositToken).balanceOf(address(this));
    if (toPool != 0) {
      _balancerJoin(poolTokens, poolId, _depositToken, toPool);
    }
    uint undBalance = IERC20(_underlying()).balanceOf(address(this)) - undBalanceBefore;
    if (undBalance != 0) {
      gauge.deposit(undBalance);
    }

    IBookkeeper(IController(_controller()).bookkeeper()).registerStrategyEarned(0);

  }

  /// @dev Join to the given pool (exchange tokenIn to underlying BPT)
  function _balancerJoin(IAsset[] memory _poolTokens, bytes32 _poolId, address _tokenIn, uint _amountIn) internal {
    if (_amountIn != 0) {
      if (_isBoostedPool(_poolTokens, _poolId)) {
        // just swap for enter
        _balancerSwap(_poolId, _tokenIn, _getPoolAddress(_poolId), _amountIn);
      } else {
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
  }

  function _isBoostedPool(IAsset[] memory _poolTokens, bytes32 _poolId) internal pure returns (bool){
    address poolAdr = _getPoolAddress(_poolId);
    for (uint i; i < _poolTokens.length; ++i) {
      if (address(_poolTokens[i]) == poolAdr) {
        return true;
      }
    }
    return false;
  }

  function _liquidate(address tokenIn, address tokenOut, uint amount, bool silently) internal {
    address tokenOutRewrite = _rewriteLinearUSDC(tokenOut);

    if (tokenIn != tokenOutRewrite && amount != 0) {
      _approveIfNeeds(tokenIn, amount, address(TETU_LIQUIDATOR));
      // don't revert on errors
      if (silently) {
        try TETU_LIQUIDATOR.liquidate(tokenIn, tokenOutRewrite, amount, PRICE_IMPACT_TOLERANCE) {} catch {}
      } else {
        TETU_LIQUIDATOR.liquidate(tokenIn, tokenOutRewrite, amount, PRICE_IMPACT_TOLERANCE);
      }
    }

    // assume need to swap rewritten token manually
    if (tokenOut != tokenOutRewrite && amount != 0) {
      _swapLinearUSDC(tokenOutRewrite, tokenOut);
    }
  }

  /// @dev It is a temporally logic until liquidator doesn't have swapper for LinearPool
  function _rewriteLinearUSDC(address token) internal pure returns (address){
    if (token == 0xF93579002DBE8046c43FEfE86ec78b1112247BB8 /*bbamUSDC*/) {
      // USDC
      return 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174;
    }
    if (token == 0xae646817e458C0bE890b81e8d880206710E3c44e /*bb-t-USDC*/) {
      // USDC
      return 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174;
    }
    return token;
  }

  /// @dev It is a temporally logic until liquidator doesn't have swapper for LinearPool
  function _swapLinearUSDC(address tokenIn, address tokenOut) internal {
    bytes32 linearPoolId;
    if (tokenOut == 0xF93579002DBE8046c43FEfE86ec78b1112247BB8 /*bbamUSDC*/) {
      linearPoolId = 0xf93579002dbe8046c43fefe86ec78b1112247bb8000000000000000000000759;
    }
    if (tokenOut == 0xae646817e458C0bE890b81e8d880206710E3c44e /*bb-t-USDC*/) {
      linearPoolId = 0xae646817e458c0be890b81e8d880206710e3c44e000000000000000000000acb;
    }
    _balancerSwap(
      linearPoolId,
      tokenIn,
      tokenOut,
      IERC20(tokenIn).balanceOf(address(this))
    );
  }

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

  function _approveIfNeeds(address token, uint amount, address spender) internal {
    if (IERC20(token).allowance(address(this), spender) < amount) {
      IERC20(token).safeApprove(spender, 0);
      IERC20(token).safeApprove(spender, type(uint).max);
    }
  }


  /// @dev Returns the address of a Pool's contract.
  ///      Due to how Pool IDs are created, this is done with no storage accesses and costs little gas.
  function _getPoolAddress(bytes32 id) internal pure returns (address) {
    // 12 byte logical shift left to remove the nonce and specialization setting. We don't need to mask,
    // since the logical shift already sets the upper bits to zero.
    return address(uint160(uint(id) >> (12 * 8)));
  }


  //slither-disable-next-line unused-state
  uint256[45] private ______gap;
}
