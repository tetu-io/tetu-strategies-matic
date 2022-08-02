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

import "../../strategies/penrose/PenroseStrategyBase.sol";

contract StrategyPenroseTetuQi is PenroseStrategyBase {

  address private constant _QI = 0x580A84C73811E1839F75d86d75d88cCa0c241fF4;
  address private constant _TETU_QI = 0x4Cd44ced63d9a6FEF595f6AD3F7CED13fCEAc768;
  address private constant _DYSTOPIA_tetuQI_QI_PAIR = 0x42c0cc5f1827C5d908392654389E5D93da426378;

  function initialize(
    address _controller,
    address _vault
  ) external initializer {
    (ISmartVault(_vault).underlying() == _DYSTOPIA_tetuQI_QI_PAIR, "!underlying");
    PenroseStrategyBase.initializeStrategy(_controller, _vault);
  }

  /// @dev Collect profit and do something useful with them
  function doHardWork() external override hardWorkers onlyNotPausedInvesting {
    // we should handle all possible rewards
    _updateRewardTokens();
    // invest all for avoid users funds liquidation
    _investAllUnderlying();
    // claim all rewards
    userProxy.claimStakingRewards(stakingAddress);
    liquidateReward();
    _forwardPoolRewards();
  }

  function _forwardPoolRewards() internal {
    ISmartVault(_TETU_QI).getAllRewardsAndRedirect(_underlying());
    address v = _vault();
    address[] memory rts = ISmartVault(_TETU_QI).rewardTokens();
    for (uint i; i < rts.length; i++) {
      address rt = rts[i];
      uint balance = IERC20(rt).balanceOf(address(this));
      _approveIfNeeds(rt, balance, v);
      ISmartVault(v).notifyTargetRewardAmount(rt, balance);
    }
  }

  function assets() external pure override returns (address[] memory) {
    address[] memory _assets = new address[](2);
    _assets[0] = _QI;
    _assets[1] = _TETU_QI;
    return _assets;
  }
}
