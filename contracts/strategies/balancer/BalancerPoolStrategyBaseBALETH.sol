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
import "../../third_party/balancer/IBalancerGaugeV1.sol";
import "../../third_party/balancer/IBVault.sol";

/// @title Base contract for BPT farming
/// @author belbix
abstract contract BalancerPoolStrategyBaseBALETH is ProxyStrategyBase {
  using SafeERC20 for IERC20;

  // *******************************************************
  //                      CONSTANTS
  // *******************************************************

  /// @notice Strategy type for statistical purposes
  string public constant override STRATEGY_NAME = "BalancerPoolStrategyBaseBALETH";
  /// @notice Version of the contract
  /// @dev Should be incremented when contract changed
  string public constant VERSION = "1.1.1";

  IBVault private constant _BALANCER_VAULT = IBVault(0xBA12222222228d8Ba445958a75a0704d566BF2C8);
  address private constant _BAL = 0x9a71012B13CA4d3D0Cdc72A177DF3ef03b0E76A3;
  address private constant _ETH = 0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619;
  address private constant _BAL_ETH_POOL = 0x3d468AB2329F296e1b9d8476Bb54Dd77D8c2320f;
  bytes32 private constant _BAL_ETH_POOL_ID = 0x3d468ab2329f296e1b9d8476bb54dd77d8c2320f000200000000000000000426;

  // *******************************************************
  //                      VARIABLES
  // *******************************************************

  IAsset[] public poolTokens;
  /// @dev Deprecated
  address public pool;
  bytes32 public poolId;
  IBalancerGaugeV1 public gauge;
  /// @dev Deprecated
  address public depositToken;


  /// @notice Initialize contract after setup it as proxy implementation
  function initializeStrategy(
    address controller_,
    address vault_,
    address underlying_,
    bytes32 poolId_,
    address gauge_,
    address depositToken_,
    uint buybackRatio_,
    address[] memory rewardTokens_
  ) public initializer {

    (IERC20[] memory tokens,,) = _BALANCER_VAULT.getPoolTokens(poolId_);
    IAsset[] memory tokenAssets = new IAsset[](tokens.length);
    for (uint i = 0; i < tokens.length; i++) {
      tokenAssets[i] = IAsset(address(tokens[i]));
    }
    poolTokens = tokenAssets;

    poolId = poolId_;
    depositToken = depositToken_;

    gauge = IBalancerGaugeV1(gauge_);
    IERC20(underlying_).safeApprove(gauge_, type(uint).max);

    ProxyStrategyBase.initializeStrategyBase(
      controller_,
      underlying_,
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
    IBalancerGaugeV1 _gauge = gauge;
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
    if (amount != 0) {
      gauge.deposit(amount);
    }
  }

  /// @dev Withdraw LP tokens from gauge
  function withdrawAndClaimFromPool(uint256 amount) internal override {
    if (amount != 0) {
      gauge.withdraw(amount, false);
    }
  }

  /// @dev Emergency withdraw all from a gauge
  function emergencyWithdrawFromPool() internal override {
    gauge.withdraw(gauge.balanceOf(address(this)), false);
  }

  /// @dev In this version rewards are accumulated in this strategy
  function doHardWork() external onlyNotPausedInvesting override hardWorkers {
    _investAllUnderlying();
    gauge.claim_rewards();
    liquidateReward();
  }

  /// @dev Make something useful with rewards
  function liquidateReward() internal override {
    // for the first liquidate autocompound part and join the pool
    _autoCompoundBalancer();
    // exist balance is amount for buybacks
    liquidateRewardDefault();
  }

  /// @dev Liquidate rewards, buy assets and add to beethoven pool
  function _autoCompoundBalancer() internal {
    for (uint i = 0; i < _rewardTokens.length; i++) {
      address rt = _rewardTokens[i];
      uint amount = IERC20(rt).balanceOf(address(this));
      if (amount != 0) {
        uint toCompound = amount * (_BUY_BACK_DENOMINATOR - _buyBackRatio()) / _BUY_BACK_DENOMINATOR;
        if (toCompound != 0) {
          _rewardToUnderlying(rt, toCompound);
          depositToPool(IERC20(_underlying()).balanceOf(address(this)));
        }
      }
    }
  }

  /// @dev Swap reward token to underlying using Beethoven pool
  function _rewardToUnderlying(address rewardToken, uint toCompound) internal {
    uint balToDeposit = toCompound;
    if (rewardToken != _BAL) {
      forwarderSwap(rewardToken, _BAL, toCompound);
      balToDeposit = IERC20(_BAL).balanceOf(address(this));
    }
    uint bptToDeposit;
    if (balToDeposit != 0) {
      IAsset[] memory _poolAssets = new IAsset[](2);
      _poolAssets[0] = IAsset(_ETH);
      _poolAssets[1] = IAsset(_BAL);
      balancerJoin(_poolAssets, _BAL_ETH_POOL_ID, _BAL, balToDeposit);
      bptToDeposit = IERC20(_BAL_ETH_POOL).balanceOf(address(this));
    }
    if (bptToDeposit != 0) {
      balancerJoin(poolTokens, poolId, _BAL_ETH_POOL, bptToDeposit);
    }
  }

  /// @dev swap _tokenIn to _tokenOut using pool identified by _poolId
  function forwarderSwap(address _tokenIn, address _tokenOut, uint _amountIn) internal returns (uint){
    address forwarder = IController(_controller()).feeRewardForwarder();
    IERC20(_tokenIn).safeApprove(forwarder, 0);
    IERC20(_tokenIn).safeApprove(forwarder, _amountIn);
    return IFeeRewardForwarder(forwarder).liquidate(_tokenIn, _tokenOut, _amountIn);
  }

  /// @dev Swap _tokenIn to _tokenOut using pool identified by _poolId
  function balancerSwap(bytes32 _poolId, address _tokenIn, address _tokenOut, uint _amountIn) internal {

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

    IERC20(_tokenIn).safeApprove(address(_BALANCER_VAULT), 0);
    IERC20(_tokenIn).safeApprove(address(_BALANCER_VAULT), _amountIn);
    uint amount = _BALANCER_VAULT.swap(singleSwapData, fundManagementStruct, 1, block.timestamp);
    require(amount != 0, "CS: Liquidated zero");
  }

  /// @dev Join to the given pool (exchange tokenIn to underlying BPT)
  function balancerJoin(IAsset[] memory _poolTokens, bytes32 _poolId, address _tokenIn, uint _amountIn) internal {
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
    IERC20(_tokenIn).safeApprove(address(_BALANCER_VAULT), 0);
    IERC20(_tokenIn).safeApprove(address(_BALANCER_VAULT), _amountIn);
    _BALANCER_VAULT.joinPool(_poolId, address(this), address(this), request);
  }

  //slither-disable-next-line unused-state
  uint256[50] private ______gap;
}
