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
*
* 1.0.2: rewards are sent to receiver, there is no tetuBalHolder anymore
*/

pragma solidity 0.8.4;

import "@tetu_io/tetu-contracts/contracts/base/strategies/ProxyStrategyBase.sol";
import "../../third_party/balancer/IBalancerGauge.sol";
import "../../third_party/balancer/IBVault.sol";
import "../../interfaces/ITetuLiquidator.sol";

/// @title Base contract for USDC-TETU farming where all rewards will be converted to tetuBAL in POL contract
/// @author belbix
abstract contract BalancerBPTTetuUsdcStrategyBase is ProxyStrategyBase {
  using SafeERC20 for IERC20;

  // *******************************************************
  //                      CONSTANTS
  // *******************************************************

  /// @notice Strategy type for statistical purposes
  string public constant override STRATEGY_NAME = "BalancerBPTTetuUsdcStrategyBase";
  /// @notice Version of the contract
  /// @dev Should be incremented when contract changed
  string public constant VERSION = "1.0.2";

  uint private constant PRICE_IMPACT_TOLERANCE = 10_000;
  IBVault public constant BALANCER_VAULT = IBVault(0xBA12222222228d8Ba445958a75a0704d566BF2C8);
  ITetuLiquidator public constant TETU_LIQUIDATOR = ITetuLiquidator(0xC737eaB847Ae6A92028862fE38b828db41314772);

  /// @dev USDC-TETU pool id
  bytes32 public constant POOL_ID = 0xe2f706ef1f7240b803aae877c9c762644bb808d80002000000000000000008c2;
  IBalancerGauge public constant GAUGE = IBalancerGauge(0xa86e8e8CfAe8C9847fA9381d4631c13c7b3466bd);
  address public constant BAL_TOKEN = 0x9a71012B13CA4d3D0Cdc72A177DF3ef03b0E76A3;
  address public constant TETU_TOKEN = 0x255707B70BF90aa112006E1b07B9AeA6De021424;

  // *******************************************************
  //                      VARIABLES
  // *******************************************************

  IAsset[] public poolTokens;
  address public rewardsRecipient;
  address public bribeReceiver;
  uint public polRatio;

  /// @notice Initialize contract after setup it as proxy implementation
  function initializeStrategy(
    address controller_,
    address vault_,
    address rewardsRecipient_,
    address bribeReceiver_
  ) public initializer {
    require(rewardsRecipient_ != address(0) && bribeReceiver_ != address(0), "zero adr");
    rewardsRecipient = rewardsRecipient_;
    bribeReceiver = bribeReceiver_;

    (IERC20[] memory tokens,,) = BALANCER_VAULT.getPoolTokens(POOL_ID);
    IAsset[] memory tokenAssets = new IAsset[](tokens.length);
    for (uint i = 0; i < tokens.length; i++) {
      tokenAssets[i] = IAsset(address(tokens[i]));
    }
    poolTokens = tokenAssets;

    IERC20(_getPoolAddress(POOL_ID)).safeApprove(address(GAUGE), type(uint).max);

    address[] memory rewardTokens_ = new address[](1);
    rewardTokens_[0] = BAL_TOKEN;

    initializeStrategyBase(
      controller_,
      _getPoolAddress(POOL_ID),
      vault_,
      rewardTokens_,
      0 // no buybacks from this strategy
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

  /// @dev Set percent (0-100 uint) of generated POL (tetuBAL). Remaining amount will be used for bribes.
  function setPolRatio(uint value) external restricted {
    polRatio = value;
  }

  function setRewardsRecipient(address rewardsRecipient_) external restricted {
    require(rewardsRecipient_ != address(0), "zero adr");
    rewardsRecipient = rewardsRecipient_;
  }

  // *******************************************************
  //                      STRATEGY LOGIC
  // *******************************************************

  /// @dev Balance of staked LPs in the gauge
  function _rewardPoolBalance() internal override view returns (uint256) {
    return GAUGE.balanceOf(address(this));
  }

  /// @dev Rewards amount ready to claim
  function readyToClaim() external view override returns (uint256[] memory toClaim) {
    toClaim = new uint256[](_rewardTokens.length);
    for (uint i; i < toClaim.length; i++) {
      address rt = _rewardTokens[i];
      toClaim[i] = GAUGE.claimable_reward(address(this), rt);
    }
  }

  /// @dev Return TVL of the farmable pool
  function poolTotalAmount() external view override returns (uint256) {
    return IERC20(_underlying()).balanceOf(address(GAUGE));
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
      GAUGE.deposit(amount);
    }
  }

  /// @dev Withdraw LP tokens from gauge
  function withdrawAndClaimFromPool(uint256 amount) internal override {
    if (amount != 0) {
      GAUGE.withdraw(amount);
    }
  }

  /// @dev Emergency withdraw all from a gauge
  function emergencyWithdrawFromPool() internal override {
    GAUGE.withdraw(GAUGE.balanceOf(address(this)));
  }

  /// @dev Make something useful with rewards
  function doHardWork() external onlyNotPausedInvesting override hardWorkers {
    GAUGE.claim_rewards();
    liquidateReward();
  }

  /// @dev Part of rewards will go to bribes, another part will go to POL(tetuBAL)
  function liquidateReward() internal override {
    address[] memory rts = _rewardTokens;
    for (uint i = 0; i < rts.length; i++) {
      address rt = rts[i];
      if (rt == BAL_TOKEN) {
        continue;
      }
      uint amount = IERC20(rt).balanceOf(address(this));
      if (amount != 0) {
        _liquidate(rt, BAL_TOKEN, amount);
      }
    }

    uint balAmount = IERC20(BAL_TOKEN).balanceOf(address(this));
    uint toPol = balAmount * polRatio / 100;
    uint toBribes = balAmount - toPol;

    if (toPol != 0) {
      IERC20(BAL_TOKEN).safeTransfer(rewardsRecipient, toPol);
    }

    uint bb;
    if (toBribes != 0) {
      _liquidate(BAL_TOKEN, TETU_TOKEN, toBribes);
      bb = IERC20(TETU_TOKEN).balanceOf(address(this));
      IERC20(TETU_TOKEN).safeTransfer(bribeReceiver, bb);
    }
    IBookkeeper(IController(_controller()).bookkeeper()).registerStrategyEarned(bb);
  }

  function _liquidate(address tokenIn, address tokenOut, uint amount) internal {
    if (tokenIn != tokenOut && amount != 0) {
      _approveIfNeeds(tokenIn, amount, address(TETU_LIQUIDATOR));
      TETU_LIQUIDATOR.liquidate(tokenIn, tokenOut, amount, PRICE_IMPACT_TOLERANCE);
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
  uint256[47] private ______gap;
}
