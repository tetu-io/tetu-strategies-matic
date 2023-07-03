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

/// @title Base contract for farming Balancer pools with staking boost by GaugeDepositor
/// @author a17
abstract contract BalancerBoostStrategyBase is ProxyStrategyBase {
  using SafeERC20 for IERC20;

  // *******************************************************
  //                      CONSTANTS
  // *******************************************************

  /// @notice Strategy type for statistical purposes
  string public constant override STRATEGY_NAME = "BalancerBoostStrategyBase";
  /// @notice Version of the contract
  /// @dev Should be incremented when contract changed
  string public constant VERSION = "1.0.0";

  uint private constant PRICE_IMPACT_TOLERANCE = 10_000;
  IBVault public constant BALANCER_VAULT = IBVault(0xBA12222222228d8Ba445958a75a0704d566BF2C8);
  ITetuLiquidator public constant TETU_LIQUIDATOR = ITetuLiquidator(0xC737eaB847Ae6A92028862fE38b828db41314772);
  address public constant BAL_TOKEN = 0x9a71012B13CA4d3D0Cdc72A177DF3ef03b0E76A3;
  address internal constant DEFAULT_PERF_FEE_RECEIVER = 0x9Cc199D4353b5FB3e6C8EEBC99f5139e0d8eA06b;
  uint internal constant MAX_GAUGE_REWARDS = 8;

  // *******************************************************
  //                      VARIABLES
  // *******************************************************

  IAsset[] public poolTokens;
  uint public lastHw;
  IBalancerGauge public gauge;
  bytes32 public poolId;
  address public depositToken;
  address public gaugeDepositor;

  /// @notice Initialize contract after setup it as proxy implementation
  function initializeStrategy(
    address controller_,
    address vault_,
    bytes32 poolId_,
    address gauge_,
    uint _bbRatio,
    address depositToken_,
    address gaugeDepositor_
  ) public initializer {
    poolId = poolId_;
    depositToken = depositToken_;
    gauge = IBalancerGauge(gauge_);
    gaugeDepositor = gaugeDepositor_;

    (IERC20[] memory tokens,,) = BALANCER_VAULT.getPoolTokens(poolId_);
    uint len = tokens.length;
    IAsset[] memory tokenAssets = new IAsset[](len);
    for (uint i; i < len; ++i) {
      tokenAssets[i] = IAsset(address(tokens[i]));
    }
    poolTokens = tokenAssets;

    IERC20(_getPoolAddress(poolId_)).safeApprove(gaugeDepositor, type(uint).max);

    address[] memory rewardTokensTmp = new address[](MAX_GAUGE_REWARDS);
    uint rtsLength;
    for (uint i; i < MAX_GAUGE_REWARDS; ++i) {
      address rt = IBalancerGauge(gauge_).reward_tokens(i);
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
      _getPoolAddress(poolId_),
      vault_,
      rewardTokens_,
      _bbRatio
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

  // *******************************************************
  //                      STRATEGY LOGIC
  // *******************************************************

  /// @dev Balance of staked LPs in the gauge
  function _rewardPoolBalance() internal override view returns (uint256) {
    return IGaugeDepositor(gaugeDepositor).getBalance(address(this), address(gauge));
  }

  /// @dev Rewards amount ready to claim
  function readyToClaim() external view override returns (uint256[] memory toClaim) {
    uint len = _rewardTokens.length;
    toClaim = new uint256[](len);
    for (uint i; i < len; ++i) {
      address rt = _rewardTokens[i];
      if (rt == BAL_TOKEN) {
        uint total = gauge.integrate_fraction(gaugeDepositor);
        uint minted = IBalancerMinter(gauge.bal_pseudo_minter()).minted(gaugeDepositor, address(gauge));
        toClaim[i] = total > minted ? total - minted : 0;
      } else {
        toClaim[i] = gauge.claimable_reward(gaugeDepositor, rt);
      }
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
    uint len = poolTokens.length;
    address[] memory token = new address[](len);
    for (uint i; i < len; ++i) {
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
      IGaugeDepositor(gaugeDepositor).deposit(_underlying(), amount, address(gauge));
    }
  }

  /// @dev Withdraw LP tokens from gauge
  function withdrawAndClaimFromPool(uint256 amount) internal override {
    if (amount != 0) {
      IGaugeDepositor(gaugeDepositor).withdraw(amount, address(gauge));
    }
    _doHardWork(true, false);
  }

  /// @dev Emergency withdraw all from a gauge
  function emergencyWithdrawFromPool() internal override {
    IGaugeDepositor(gaugeDepositor).withdraw(gauge.balanceOf(gaugeDepositor), address(gauge));
  }

  /// @dev Make something useful with rewards
  function doHardWork() external onlyNotPausedInvesting override hardWorkers {
    _doHardWork(false, true);
  }

  function _doHardWork(bool silently, bool push) internal {
    _refreshRewardTokens();
    uint _lastHw = lastHw;
    if (push || _lastHw == 0 || block.timestamp - _lastHw > 12 hours) {
      IGaugeDepositor(gaugeDepositor).claimRewards(_rewardTokens, address(gauge));
      _liquidateRewards(silently);
      lastHw = block.timestamp;
    }
  }

  function _refreshRewardTokens() internal {
    delete _rewardTokens;

    for (uint i; i < MAX_GAUGE_REWARDS; ++i) {
      address rt = gauge.reward_tokens(i);
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

  function _liquidateRewards(bool silently) internal {
    address _depositToken = depositToken;
    uint bbRatio = _buyBackRatio();
    address[] memory rts = _rewardTokens;
    uint undBalanceBefore = IERC20(_underlying()).balanceOf(address(this));
    uint len = rts.length;
    for (uint i; i < len; ++i) {
      address rt = rts[i];
      uint amount = IERC20(rt).balanceOf(address(this));
      if (amount != 0) {
        uint toRewards = amount * (_BUY_BACK_DENOMINATOR - bbRatio) / _BUY_BACK_DENOMINATOR;
        uint toGov = amount - toRewards;

        if (toGov != 0) {
          IERC20(rt).safeTransfer(DEFAULT_PERF_FEE_RECEIVER, toGov);
        }

        if (toRewards != 0) {
          _liquidate(rt, _depositToken, toRewards, silently);
        }
      }
    }

    uint toPool = IERC20(_depositToken).balanceOf(address(this));
    if (toPool != 0) {
      _balancerJoin(poolTokens, poolId, _depositToken, toPool);
    }
    uint undBalance = IERC20(_underlying()).balanceOf(address(this)) - undBalanceBefore;
    if (undBalance != 0) {
      IGaugeDepositor(gaugeDepositor).deposit(_underlying(), undBalance, address(gauge));
    }

    IBookkeeper(IController(_controller()).bookkeeper()).registerStrategyEarned(0);
  }

  /// @dev Join to the given pool (exchange tokenIn to underlying BPT)
  function _balancerJoin(IAsset[] memory _poolTokens, bytes32 _poolId, address _tokenIn, uint _amountIn) internal {
    if (_amountIn != 0) {
      if (_poolHasPhantomBpt(_poolTokens, _poolId)) {
        // just swap for enter
        _balancerSwap(_poolId, _tokenIn, _getPoolAddress(_poolId), _amountIn);
      } else {
        uint len = _poolTokens.length;
        uint[] memory amounts = new uint[](len);
        for (uint i; i < len; ++i) {
          amounts[i] = address(_poolTokens[i]) == _tokenIn ? _amountIn : 0;
        }
        bytes memory userData = abi.encode(1, amounts, 1);
        IBVault.JoinPoolRequest memory request = IBVault.JoinPoolRequest({
          assets: _poolTokens,
          maxAmountsIn: amounts,
          userData: userData,
          fromInternalBalance: false
        });
        _approveIfNeeds(_tokenIn, _amountIn, address(BALANCER_VAULT));
        BALANCER_VAULT.joinPool(_poolId, address(this), address(this), request);
      }
    }
  }

  function _poolHasPhantomBpt(IAsset[] memory _poolTokens, bytes32 _poolId) internal pure returns (bool) {
    address poolAdr = _getPoolAddress(_poolId);
    uint len = _poolTokens.length;
    for (uint i; i < len; ++i) {
      if (address(_poolTokens[i]) == poolAdr) {
        return true;
      }
    }
    return false;
  }

  function _liquidate(address tokenIn, address tokenOut, uint amount, bool silently) internal {
    if (amount != 0) {
      _approveIfNeeds(tokenIn, amount, address(TETU_LIQUIDATOR));
      // don't revert on errors
      if (silently) {
        try TETU_LIQUIDATOR.liquidate(tokenIn, tokenOut, amount, PRICE_IMPACT_TOLERANCE) {} catch {}
      } else {
        TETU_LIQUIDATOR.liquidate(tokenIn, tokenOut, amount, PRICE_IMPACT_TOLERANCE);
      }
    }
  }

  /// @dev Swap _tokenIn to _tokenOut using pool identified by _poolId
  function _balancerSwap(bytes32 _poolId, address _tokenIn, address _tokenOut, uint _amountIn) internal {
    if (_amountIn != 0) {
      IBVault.SingleSwap memory singleSwapData = IBVault.SingleSwap({
        poolId: _poolId,
        kind: IBVault.SwapKind.GIVEN_IN,
        assetIn: IAsset(_tokenIn),
        assetOut: IAsset(_tokenOut),
        amount: _amountIn,
        userData: ""
      });

      IBVault.FundManagement memory fundManagementStruct = IBVault.FundManagement({
        sender: address(this),
        fromInternalBalance: false,
        recipient: payable(address(this)),
        toInternalBalance: false
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
  uint256[50 - 6] private ______gap;
}
