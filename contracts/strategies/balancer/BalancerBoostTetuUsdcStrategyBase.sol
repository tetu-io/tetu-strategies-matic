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
import "../../third_party/balancer/IBalancerMinter.sol";
import "../../interfaces/ITetuLiquidator.sol";
import "./IGaugeDepositor.sol";

/// @title Base contract for farming USDC-TETU with staking boost by GaugeDepositor where all rewards will be converted to tetuBAL in POL contract
/// @author a17
abstract contract BalancerBoostTetuUsdcStrategyBase is ProxyStrategyBase {
  using SafeERC20 for IERC20;

  event EmergencyStop();

  // *******************************************************
  //                      CONSTANTS
  // *******************************************************

  /// @notice Strategy type for statistical purposes
  string public constant override STRATEGY_NAME = "BalancerBoostTetuUsdcStrategyBase";
  /// @notice Version of the contract
  /// @dev Should be incremented when contract changed
  string public constant VERSION = "1.0.0";

  uint private constant PRICE_IMPACT_TOLERANCE = 10_000;
  IBVault public constant BALANCER_VAULT = IBVault(0xBA12222222228d8Ba445958a75a0704d566BF2C8);
  ITetuLiquidator public constant TETU_LIQUIDATOR = ITetuLiquidator(0xC737eaB847Ae6A92028862fE38b828db41314772);
  address public constant BAL_TOKEN = 0x9a71012B13CA4d3D0Cdc72A177DF3ef03b0E76A3;
  uint internal constant MAX_GAUGE_REWARDS = 8;

  /// @dev USDC-TETU pool id
  bytes32 public constant POOL_ID = 0xe2f706ef1f7240b803aae877c9c762644bb808d80002000000000000000008c2;
  IBalancerGauge public constant GAUGE = IBalancerGauge(0xa86e8e8CfAe8C9847fA9381d4631c13c7b3466bd);
  address public constant TETU_TOKEN = 0x255707B70BF90aa112006E1b07B9AeA6De021424;
  address public constant anyTETU = 0x652fAE511Be0A529B422945594a2a727B64Af1af;
  uint public constant EXPECTED_LOCKED_AMOUNT = 373_673_000e18;

  // *******************************************************
  //                      VARIABLES
  // *******************************************************

  IAsset[] public poolTokens;
  address public gaugeDepositor;
  address public rewardsRecipient;
  address public bribeReceiver;
  /// @dev In case of emergency stop we will write virtual balance instead of real.
  ///      Non zero value indicates that emergency stop is activated.
  uint public virtualBptBalance;

  /// @notice Initialize contract after setup it as proxy implementation
  function initializeStrategy(
    address controller_,
    address vault_,
    address rewardsRecipient_,
    address bribeReceiver_,
    address gaugeDepositor_
  ) public initializer {
    require(rewardsRecipient_ != address(0) && bribeReceiver_ != address(0), "zero adr");
    rewardsRecipient = rewardsRecipient_;
    bribeReceiver = bribeReceiver_;

    gaugeDepositor = gaugeDepositor_;

    (IERC20[] memory tokens,,) = BALANCER_VAULT.getPoolTokens(POOL_ID);
    uint len = tokens.length;
    IAsset[] memory tokenAssets = new IAsset[](len);
    for (uint i; i < len; ++i) {
      tokenAssets[i] = IAsset(address(tokens[i]));
    }
    poolTokens = tokenAssets;

    IERC20(_getPoolAddress(POOL_ID)).safeApprove(gaugeDepositor, type(uint).max);

    address[] memory rewardTokensTmp = new address[](MAX_GAUGE_REWARDS);
    uint rtsLength;
    for (uint i; i < MAX_GAUGE_REWARDS; ++i) {
      address rt = IBalancerGauge(GAUGE).reward_tokens(i);
      if (rt == address(0)) {
        break;
      }
      rewardTokensTmp[i] = rt;
      rtsLength++;
    }
    address[] memory rewardTokens_ = new address[](rtsLength + 1);
    for (uint i; i < rtsLength; ++i) {
      rewardTokens_[i] = rewardTokensTmp[i];
    }
    // BAL token is special, it's not registered inside gauge.reward_tokens, we claim it through pseudo-minter
    rewardTokens_[rtsLength] = BAL_TOKEN;


    ProxyStrategyBase.initializeStrategyBase(
      controller_,
      _getPoolAddress(POOL_ID),
      vault_,
      rewardTokens_,
      5_00
    );
  }

  // *******************************************************
  //                      GOV ACTIONS
  // *******************************************************

  /// @dev Set new reward tokens
  function setRewardTokens(address[] memory rts) external restricted {
    delete _rewardTokens;
    uint len = rts.length;
    for (uint i; i < len; ++i) {
      _rewardTokens.push(rts[i]);
      _unsalvageableTokens[rts[i]] = true;
    }
  }

  function setRewardsRecipient(address rewardsRecipient_) external restricted {
    require(rewardsRecipient_ != address(0), "zero adr");
    rewardsRecipient = rewardsRecipient_;
  }

  // *******************************************************
  //                      MULTICHAIN RUG PREVENTION
  // *******************************************************

  function emergencyStop() external {
    require(isEmergencyStopAvailable() && virtualBptBalance == 0, "not available");

    // withdraw everything from gauge
    IGaugeDepositor(gaugeDepositor).withdraw(_rewardPoolBalance(), address(GAUGE));

    address bpt = _underlying();
    uint amountForUnwrap = IERC20(bpt).balanceOf(address(this));

    require(amountForUnwrap > 0, "zero amount");

    // write virtual balance for keep vault share price on the same level
    virtualBptBalance = amountForUnwrap;

    IERC20[] memory tokens = new IERC20[](2);
    (tokens,,) = BALANCER_VAULT.getPoolTokens(POOL_ID);
    IAsset[] memory _poolTokens = new IAsset[](2);

    for (uint i; i < 2; ++i) {
      _poolTokens[i] = IAsset(address(tokens[i]));
    }

    BALANCER_VAULT.exitPool(
      POOL_ID,
      address(this),
      payable(address(this)),
      IBVault.ExitPoolRequest({
        assets: _poolTokens,
        minAmountsOut: new uint[](2),
        userData: abi.encode(1, amountForUnwrap),
        toInternalBalance: false
      })
    );

    // we will keep unwrapped USDC and TETU on this contract
    // in case of emergency stop we will upgrade this contract with necessary logic

    emit EmergencyStop();
  }

  function isEmergencyStopAvailable() public view returns (bool) {
    uint lockedAmount = IERC20(TETU_TOKEN).balanceOf(anyTETU);
    return lockedAmount < EXPECTED_LOCKED_AMOUNT;
  }

  // *******************************************************
  //                      STRATEGY LOGIC
  // *******************************************************

  /// @dev Balance of staked LPs in the gauge
  function _rewardPoolBalance() internal override view returns (uint256) {
    return IGaugeDepositor(gaugeDepositor).getBalance(address(this), address(GAUGE));
  }

  /// @dev Rewards amount ready to claim
  function readyToClaim() external view override returns (uint256[] memory toClaim) {
    uint len = _rewardTokens.length;
    toClaim = new uint256[](len);
    for (uint i; i < len; ++i) {
      address rt = _rewardTokens[i];
      if (rt == BAL_TOKEN) {
        uint total = GAUGE.integrate_fraction(gaugeDepositor);
        uint minted = IBalancerMinter(GAUGE.bal_pseudo_minter()).minted(gaugeDepositor, address(GAUGE));
        toClaim[i] = total > minted ? total - minted : 0;
      } else {
        toClaim[i] = GAUGE.claimable_reward(gaugeDepositor, rt);
      }
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
    uint len = poolTokens.length;
    address[] memory token = new address[](len);
    for (uint i; i < len; ++i) {
      token[i] = address(poolTokens[i]);
    }
    return token;
  }

  /// @dev Deposit LP tokens to gauge
  function depositToPool(uint256 amount) internal override {
    require(virtualBptBalance == 0, "emergency stopped");

    if (amount != 0) {
      IGaugeDepositor(gaugeDepositor).deposit(_underlying(), amount, address(GAUGE));
    }
  }

  /// @dev Withdraw LP tokens from gauge
  function withdrawAndClaimFromPool(uint256 amount) internal override {
    require(virtualBptBalance == 0, "emergency stopped");
    if (amount != 0) {
      IGaugeDepositor(gaugeDepositor).withdraw(amount, address(GAUGE));
    }
  }

  /// @dev Emergency withdraw all from a gauge
  function emergencyWithdrawFromPool() internal override {
    require(virtualBptBalance == 0, "emergency stopped");
    IGaugeDepositor(gaugeDepositor).withdraw(GAUGE.balanceOf(gaugeDepositor), address(GAUGE));
  }

  /// @dev Make something useful with rewards
  function doHardWork() external onlyNotPausedInvesting override hardWorkers {
    _doHardWork();
  }

  function _doHardWork() internal {
    _refreshRewardTokens();
    IGaugeDepositor(gaugeDepositor).claimRewards(_rewardTokens, address(GAUGE));
    _liquidateRewards();
  }

  function _refreshRewardTokens() internal {
    delete _rewardTokens;

    for (uint i; i < MAX_GAUGE_REWARDS; ++i) {
      address rt = GAUGE.reward_tokens(i);
      if (rt == address(0)) {
        break;
      }
      _rewardTokens.push(rt);
      if (!_unsalvageableTokens[rt]) {
        _unsalvageableTokens[rt] = true;
      }
    }

    // BAL token is special, it's not registered inside gauge.reward_tokens, we claim it through pseudo-minter
    _rewardTokens.push(BAL_TOKEN);
    if (!_unsalvageableTokens[BAL_TOKEN]) {
      _unsalvageableTokens[BAL_TOKEN] = true;
    }
  }

  /// @dev Deprecated
  function liquidateReward() internal override {
    // noop
  }

  function _liquidateRewards() internal {
    uint bbRatio = _buyBackRatio();
    address[] memory rts = _rewardTokens;
    uint len = rts.length;
    for (uint i; i < len; ++i) {
      address rt = rts[i];
      if (rt != BAL_TOKEN) {
        uint amount = IERC20(rt).balanceOf(address(this));
        if (amount != 0) {
          _liquidate(rt, BAL_TOKEN, amount);
        }
      }
    }


    uint amountBal = IERC20(BAL_TOKEN).balanceOf(address(this));
    uint balToPerfFee = amountBal * bbRatio / _BUY_BACK_DENOMINATOR;
    uint balToBribes = amountBal - (amountBal * bbRatio / _BUY_BACK_DENOMINATOR);

    if (balToPerfFee != 0) {
      IERC20(BAL_TOKEN).safeTransfer(rewardsRecipient, balToPerfFee);
    }


    if (balToBribes != 0) {
      IERC20(BAL_TOKEN).safeTransfer(bribeReceiver, balToBribes);
    }

    IBookkeeper(IController(_controller()).bookkeeper()).registerStrategyEarned(0);
  }

  function _liquidate(address tokenIn, address tokenOut, uint amount) internal {
    if (amount != 0) {
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
  uint256[50 - 6] private ______gap;
}
