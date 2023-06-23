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

import "@tetu_io/tetu-contracts/contracts/openzeppelin/SafeMath.sol";
import "@tetu_io/tetu-contracts/contracts/base/strategies/StrategyBase.sol";
import "../../third_party/sushi/IMiniChefV2.sol";

/// @title Abstract contract for MasterChef strategy implementation
/// @author belbix
abstract contract MCv2StrategyAC is StrategyBase {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  // ************ VARIABLES **********************
  /// @notice Strategy type for statistical purposes
  string public constant override STRATEGY_NAME = "MCv2StrategyAC";
  /// @notice Version of the contract
  /// @dev Should be incremented when contract changed
  string public constant VERSION = "1.0.2";
  /// @dev 10% buyback
  uint256 private constant _BUY_BACK_RATIO = 10_00;
  address private constant _SUSHI = address(0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a);

  /// @notice MasterChef rewards pool
  address public mcRewardPool;
  /// @notice MasterChef rewards pool ID
  uint256 public poolID;
  /// @notice Uniswap router for underlying LP
  address public router;

  /// @notice Contract constructor using on strategy implementation
  /// @dev The implementation should check each parameter
  /// @param _controller Controller address
  /// @param _underlying Underlying token address
  /// @param _vault SmartVault address that will provide liquidity
  /// @param __rewardTokens Reward tokens that the strategy will farm
  /// @param _mcRewardPool MasterChef pool address
  /// @param _poolID Pool id
  constructor(
    address _controller,
    address _underlying,
    address _vault,
    address[] memory __rewardTokens,
    address _mcRewardPool,
    uint256 _poolID,
    address _router
  ) StrategyBase(_controller, _underlying, _vault, __rewardTokens, _BUY_BACK_RATIO) {
    require(_mcRewardPool != address(0), "zero address pool");
    mcRewardPool = _mcRewardPool;
    poolID = _poolID;
    router = _router;

    address _lpt = IMiniChefV2(_mcRewardPool).lpToken(_poolID);
    require(_lpt == _underlyingToken, "wrong underlying");
  }

  // ************* VIEWS *******************

  /// @notice Strategy balance in the Master Chef pool
  /// @return bal Balance amount in underlying tokens
  function rewardPoolBalance() public override view returns (uint256 bal) {
    (bal,) = IMiniChefV2(mcRewardPool).userInfo(poolID, address(this));
  }

  /// @notice Return approximately amount of reward tokens ready to claim in Master Chef pool
  /// @dev Don't use it in any internal logic, only for statistical purposes
  /// @return Array with amounts ready to claim
  function readyToClaim() external view override returns (uint256[] memory) {
    uint256[] memory toClaim = new uint256[](2);
    (uint256 bal, uint256 debt) = IMiniChefV2(mcRewardPool).userInfo(poolID, address(this));

    (uint256 accSushiPerShare, uint256 lastRewardTime, uint256 allocPoint)
    = IMiniChefV2(mcRewardPool).poolInfo(poolID);

    if (block.timestamp > lastRewardTime) {
      uint256 sushiPerSecond = IMiniChefV2(mcRewardPool).sushiPerSecond();
      uint256 totalAllocPoint = IMiniChefV2(mcRewardPool).totalAllocPoint();
      uint256 lpSupply = IERC20(IMiniChefV2(mcRewardPool).lpToken(poolID)).balanceOf(mcRewardPool);
      if (lpSupply > 0) {
        uint256 time = block.timestamp.sub(lastRewardTime);
        uint256 sushiReward = time.mul(sushiPerSecond).mul(allocPoint).div(totalAllocPoint);
        accSushiPerShare = accSushiPerShare.add(sushiReward.mul(1e12).div(lpSupply));
      }
    }

    uint256 accumulatedSushi = bal * accSushiPerShare / 1e12;
    if (accumulatedSushi < debt) {
      toClaim[0] = 0;
    } else {
      toClaim[0] = accumulatedSushi - debt;
    }

    IRewarder _rewarder = IMiniChefV2(mcRewardPool).rewarder(poolID);
    if (address(_rewarder) != address(0)) {
      // we can't calculate more accurate because totalAllocPoint is private in the rewarder contract
      toClaim[1] = _rewarder.pendingToken(poolID, address(this));
    }

    return toClaim;
  }

  /// @notice TVL of the underlying in the Master Chef pool
  /// @dev Only for statistic
  /// @return Pool TVL
  function poolTotalAmount() external view override returns (uint256) {
    return IERC20(_underlyingToken).balanceOf(mcRewardPool);
  }

  // ************ GOVERNANCE ACTIONS **************************

  /// @notice Claim rewards from external project and send them to FeeRewardForwarder
  function doHardWork() external onlyNotPausedInvesting override hardWorkers {
    IMiniChefV2(mcRewardPool).harvest(poolID, address(this));
    liquidateReward();
  }

  // ************ INTERNAL LOGIC IMPLEMENTATION **************************

  /// @dev Deposit underlying to Master Chef pool
  /// @param amount Deposit amount
  function depositToPool(uint256 amount) internal override {
    IERC20(_underlyingToken).safeApprove(mcRewardPool, 0);
    IERC20(_underlyingToken).safeApprove(mcRewardPool, amount);
    IMiniChefV2(mcRewardPool).deposit(poolID, amount, address(this));
  }

  /// @dev Deposit underlying to Master Chef pool
  /// @param amount Deposit amount
  function withdrawAndClaimFromPool(uint256 amount) internal override {
    (uint256 bal, uint256 debt) = IMiniChefV2(mcRewardPool).userInfo(poolID, address(this));
    (uint256 accSushiPerShare, ,) = IMiniChefV2(mcRewardPool).poolInfo(poolID);
    uint256 accumulatedSushi = bal * accSushiPerShare / 1e12;

    IRewarder rewarder = IMiniChefV2(mcRewardPool).rewarder(poolID);
    (IERC20[] memory tokens,) = rewarder.pendingTokens(poolID, address(this), 0);
    uint256 rewarderBal = tokens[0].balanceOf(address(rewarder));
    uint256 sushiBal = IERC20(_SUSHI).balanceOf(mcRewardPool);

    if (
    // sushi has a bug with rounding, in some cases we can't withdrawAndHarvest
      accumulatedSushi < debt
      // if mc or rewarder doesn't have enough balance make emergency withdraw
      || rewarderBal < 10 * 1e18
      || sushiBal < 10 * 1e18
    ) {
      IMiniChefV2(mcRewardPool).emergencyWithdraw(poolID, address(this));
    } else {
      IMiniChefV2(mcRewardPool).withdrawAndHarvest(poolID, amount, address(this));
    }
  }

  /// @dev Exit from external project without caring about rewards
  ///      For emergency cases only!
  function emergencyWithdrawFromPool() internal override {
    IMiniChefV2(mcRewardPool).emergencyWithdraw(poolID, address(this));
  }

  /// @dev Do something useful with farmed rewards
  function liquidateReward() internal override {
    autocompoundLP(router);
    // if we have not enough balance for buybacks we will autocompound 100%
    liquidateRewardSilently();
  }
}
