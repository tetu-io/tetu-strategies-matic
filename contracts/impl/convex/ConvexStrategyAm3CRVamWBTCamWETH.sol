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

import "../../third_party/curve/ICurveLpToken.sol";
import "../../third_party/convex/IConvexMinter.sol";
import "../../strategies/convex/ConvexStrategyBase.sol";


/// @title Contract for Curve aave strategy implementation
/// @author Oleg N
contract ConvexStrategyAm3CRVamWBTCamWETH is ConvexStrategyBase {
  using SafeERC20 for IERC20;

  /// rewards
  address private constant CRV = address(0x172370d5Cd63279eFa6d502DAB29171933a610AF);
  address private constant CVX = address(0x4257EA7637c355F81616050CbB6a9b709fd72683);
  address[] private poolRewards = [CRV, CVX];

  /// deposit tokens
  address private constant AM3CRV = address(0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171);
  address private constant AMWBTC = address(0x5c2ed810328349100A66B82b78a1791B101C9D61);
  address private constant AMWETH = address(0x28424507fefb6f7f8E9D3860F56504E4e5f5f390);

  /// @notice Convex gauge rewards pool
  address private constant _GAUGE = address(0xBb1B19495B8FE7C402427479B9aC14886cbbaaeE);
  address private constant _POOL =  address(0xdAD97F7713Ae9437fa9249920eC8507e5FbB23d3);

  address[] private _assets = [AM3CRV, AMWBTC, AMWETH];

  /// @notice Contract constructor using on strategy implementation
  /// @dev The implementation should check each parameter
  /// @param _controller Controller address
  /// @param _underlying Underlying token address
  /// @param _vault SmartVault address that will provide liquidity
  constructor(
    address _controller,
    address _underlying,
    address _vault
  ) ConvexStrategyBase(_controller, _underlying, _vault, poolRewards, _GAUGE) {}

  /// assets should reflect underlying tokens need to investing
  function assets() external override view returns (address[] memory) {
    return _assets;
  }

  function rtToUnderlying(address rt, uint toCompound) internal override {
    if (toCompound == 0) {
      return;
    }
    address forwarder = IController(controller()).feeRewardForwarder();
    // use am3CRV for autocompound
    IERC20(rt).safeApprove(forwarder, 0);
    IERC20(rt).safeApprove(forwarder, toCompound);
    uint amount = IFeeRewardForwarder(forwarder).liquidate(rt, AM3CRV, toCompound);
    require(amount != 0, "CS: Liquidated zero");
    address minter = ICurveLpToken(_POOL).minter();
    IERC20(AM3CRV).safeApprove(minter, 0);
    IERC20(AM3CRV).safeApprove(minter, amount);
    // first token is am3CRV
    IConvexMinter(minter).add_liquidity([amount, 0, 0], 0);
    // now we have underlying tokens
  }
}
