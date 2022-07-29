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

import "@tetu_io/tetu-contracts/contracts/base/strategies/FoldingBase.sol";
import "../../third_party/IWmatic.sol";
import "../../third_party/dforce/IiToken.sol";
import "../../third_party/dforce/IRewardDistributorV3.sol";
import "../../third_party/dforce/IDForcePriceOracle.sol";

/// @title Abstract contract for dForce lending strategy implementation with folding functionality
/// @author belbix
abstract contract DForceFoldStrategyBase is FoldingBase {
  using SafeERC20 for IERC20;

  // ************ CONSTANTS **********************

  /// @notice Version of the contract
  /// @dev Should be incremented when contract is changed
  string public constant VERSION = "1.0.0";
  /// @notice Strategy type for statistical purposes
  string public constant override STRATEGY_NAME = "DForceFoldStrategyBase";
  /// @dev Placeholder, for non full buyback need to implement liquidation
  uint private constant _BUY_BACK_RATIO = 100_00;

  /// @dev precision for the folding profitability calculation
  uint private constant _PRECISION = 10 ** 18;
  /// @dev approximate number of seconds per year
  uint private constant _SECONDS_PER_YEAR = 365 days;

  address public constant W_MATIC = 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270;
  IRewardDistributorV3 public constant REWARD_DISTRIBUTOR = IRewardDistributorV3(0x47C19A2ab52DA26551A22e2b2aEED5d19eF4022F);
  IDForcePriceOracle public constant PRICE_ORACLE = IDForcePriceOracle(payable(0x9E8B68E17441413b26C2f18e741EAba69894767c));
  address public constant DF_USDC_PAIR = 0x84c6B5b5CB47f117ff442C44d25E379e06Df5d8a;

  // ************ VARIABLES **********************

  IiToken public iToken;

  /// @notice Contract constructor using on strategy implementation
  constructor(
    address _controller,
    address _underlying,
    address _vault,
    address[] memory __rewardTokens,
    uint _borrowTargetFactorNumerator,
    uint _collateralFactorNumerator,
    address _iToken
  ) FoldingBase(
    _controller,
    _underlying,
    _vault,
    __rewardTokens,
    _BUY_BACK_RATIO,
    _borrowTargetFactorNumerator,
    _collateralFactorNumerator
  ) {
    iToken = IiToken(_iToken);
  }

  /////////////////////////////////////////////
  ////////////BASIC STRATEGY FUNCTIONS/////////
  /////////////////////////////////////////////

  /// @notice Return approximately amount of reward tokens ready to claim in AAVE Lending pool
  /// @dev Don't use it in any internal logic, only for statistical purposes
  /// @return Array with amounts ready to claim
  function readyToClaim() external view override returns (uint[] memory) {
    uint[] memory rewards = new uint[](1);
    rewards[0] = REWARD_DISTRIBUTOR.reward(address(this));
    return rewards;
  }

  /// @notice TVL of the underlying in the aToken contract
  /// @dev Only for statistic
  /// @return Pool TVL
  function poolTotalAmount() external view override returns (uint) {
    return iToken.getCash() + iToken.totalBorrows() - iToken.totalReserves();
  }

  /// @dev Do something useful with farmed rewards
  function liquidateReward() internal override {
    liquidateRewardDefault();
  }

  ///////////////////////////////////////////////////////////////////////////////////////
  ///////////// internal functions require specific implementation for each platforms ///
  ///////////////////////////////////////////////////////////////////////////////////////

  function _getInvestmentData() internal override returns (uint supplied, uint borrowed){
    supplied = iToken.balanceOfUnderlying(address(this));
    borrowed = iToken.borrowBalanceCurrent(address(this));
  }

  /// @dev Return true if we can gain profit with folding
  function _isFoldingProfitable() internal view override returns (bool) {
    (uint supplyRewardsInUSDC,
    uint borrowRewardsInUSDC,
    uint supplyUnderlyingProfitInUSDC,
    uint debtUnderlyingCostInUSDC) = totalRewardPredictionInUSDC();

    uint foldingProfitPerToken = supplyRewardsInUSDC + borrowRewardsInUSDC + supplyUnderlyingProfitInUSDC;
    return foldingProfitPerToken > debtUnderlyingCostInUSDC;
  }

  /// @dev Claim distribution rewards
  function _claimReward() internal override {
    address[] memory holders = new address[](1);
    holders[0] = address(this);
    address[] memory rts = new address[](1);
    rts[0] = address(iToken);
    REWARD_DISTRIBUTOR.claimReward(holders, rts);
  }

  function _supply(uint amount) internal override {
    amount = Math.min(IERC20(_underlyingToken).balanceOf(address(this)), amount);
    if (_isMatic()) {
      revert("S: ETH Not supported");
      //      wmaticWithdraw(amount);
      //      iTokenEth.mint{value : amount}();
    } else {
      IERC20(_underlyingToken).safeApprove(address(iToken), 0);
      IERC20(_underlyingToken).safeApprove(address(iToken), amount);
      iToken.mintForSelfAndEnterMarket(amount);
    }
  }

  function _borrow(uint amountUnderlying) internal override {
    iToken.borrow(amountUnderlying);
    if (_isMatic()) {
      revert("S: ETH Not supported");
      //      IWmatic(W_MATIC).deposit{value : address(this).balance}();
    }
  }

  function _redeemUnderlying(uint amountUnderlying) internal override {
    amountUnderlying = Math.min(amountUnderlying, _maxRedeem());
    if (amountUnderlying > 0) {
      iToken.redeemUnderlying(address(this), amountUnderlying);
      if (_isMatic()) {
        revert("S: ETH Not supported");
        //        IWmatic(W_MATIC).deposit{value : address(this).balance}();
      }
    }
  }

  function _repay(uint amountUnderlying) internal override {
    if (amountUnderlying != 0) {
      if (_isMatic()) {
        revert("S: ETH Not supported");
        //        wmaticWithdraw(amountUnderlying);
        //        IRMatic(rToken).repayBorrow{value : amountUnderlying}();
      } else {
        IERC20(_underlyingToken).safeApprove(address(iToken), 0);
        IERC20(_underlyingToken).safeApprove(address(iToken), amountUnderlying);
        iToken.repayBorrow(amountUnderlying);
      }
    }
  }

  /// @dev Redeems the maximum amount of underlying. Either all of the balance or all of the available liquidity.
  function _redeemMaximumWithLoan() internal override {
    uint supplied = iToken.balanceOfUnderlying(address(this));
    uint borrowed = iToken.borrowBalanceCurrent(address(this));
    uint balance = supplied - borrowed;
    _redeemPartialWithLoan(balance);

    // we have a little amount of supply after full exit
    // better to redeem rToken amount for avoid rounding issues
    uint iTokenBalance = iToken.balanceOf(address(this));
    if (iTokenBalance > 0) {
      iToken.redeem(address(this), iTokenBalance);
    }
  }

  /////////////////////////////////////////////
  ////////////SPECIFIC INTERNAL FUNCTIONS//////
  /////////////////////////////////////////////

  function decimals() private view returns (uint8) {
    return iToken.decimals();
  }

  function underlyingDecimals() private view returns (uint8) {
    return IERC20Extended(_underlyingToken).decimals();
  }

  /// @notice returns forecast of all rewards
  function totalRewardPrediction() private view returns (
    uint supplyRewards,
    uint borrowRewards,
    uint supplyUnderlyingProfit,
    uint debtUnderlyingCost
  ){
    // get reward per token for both - suppliers and borrowers
    uint rewardSpeed = REWARD_DISTRIBUTOR.distributionSpeed(address(iToken));
    // get total supply, cash and borrows, and normalize them to 18 decimals
    uint totalSupply = iToken.totalSupply() * 1e18 / (10 ** decimals());
    uint totalBorrows = iToken.totalBorrows() * 1e18 / (10 ** underlyingDecimals());
    if (totalSupply == 0 || totalBorrows == 0) {
      return (0, 0, 0, 0);
    }

    // exchange rate between iToken and underlyingToken
    uint iTokenExchangeRate = iToken.exchangeRateStored() * (10 ** decimals()) / (10 ** underlyingDecimals());

    // amount of reward tokens per block for 1 supplied underlyingToken
    supplyRewards = rewardSpeed * 1e18 / iTokenExchangeRate * 1e18 / totalSupply;
    // amount of reward tokens per block for 1 borrowed underlyingToken
    borrowRewards = rewardSpeed * 1e18 / totalBorrows;
    supplyUnderlyingProfit = iToken.supplyRatePerBlock();
    debtUnderlyingCost = iToken.borrowRatePerBlock();
    return (supplyRewards, borrowRewards, supplyUnderlyingProfit, debtUnderlyingCost);
  }

  function getRewardTokenUsdPrice() internal view returns (uint) {
    return getPriceFromLp(DF_USDC_PAIR, _rewardTokens[0]);
  }

  function getPriceFromLp(address lpAddress, address token) internal view returns (uint256) {
    IUniswapV2Pair pair = IUniswapV2Pair(lpAddress);
    address token0 = pair.token0();
    address token1 = pair.token1();
    (uint256 reserve0, uint256 reserve1,) = pair.getReserves();
    uint256 token0Decimals = IERC20Extended(token0).decimals();
    uint256 token1Decimals = IERC20Extended(token1).decimals();

    // both reserves should have the same decimals
    reserve0 = reserve0 * 1e18 / (10 ** token0Decimals);
    reserve1 = reserve1 * 1e18 / (10 ** token1Decimals);

    if (token == token0) {
      return reserve1 * 1e18 / reserve0;
    } else if (token == token1) {
      return reserve0 * 1e18 / reserve1;
    } else {
      revert("S: Token not in lp");
    }
  }

  /// @notice returns forecast of all rewards (ICE and underlying)
  ///         for the given period of time in USDC token using ICE price oracle
  function totalRewardPredictionInUSDC() private view returns (
    uint supplyRewardsInUSDC,
    uint borrowRewardsInUSDC,
    uint supplyUnderlyingProfitInUSDC,
    uint debtUnderlyingCostInUSDC
  ){
    uint rewardTokenUSDC = getRewardTokenUsdPrice();
    uint iTokenUSDC = iTokenUnderlyingPrice();
    (uint supplyRewards,
    uint borrowRewards,
    uint supplyUnderlyingProfit,
    uint debtUnderlyingCost) = totalRewardPrediction();

    supplyRewardsInUSDC = supplyRewards * rewardTokenUSDC / _PRECISION;
    borrowRewardsInUSDC = borrowRewards * rewardTokenUSDC / _PRECISION;
    supplyUnderlyingProfitInUSDC = supplyUnderlyingProfit * iTokenUSDC / _PRECISION;
    debtUnderlyingCostInUSDC = debtUnderlyingCost * iTokenUSDC / _PRECISION;
  }

  /// @dev Return iToken price from Oracle solution. Can be used on-chain safely
  function iTokenUnderlyingPrice() public view returns (uint){
    uint _iTokenPrice = PRICE_ORACLE.getUnderlyingPrice(address(iToken));
    // normalize token price to 1e18
    if (underlyingDecimals() < 18) {
      _iTokenPrice = _iTokenPrice / (10 ** (18 - underlyingDecimals()));
    }
    return _iTokenPrice;
  }

  function wmaticWithdraw(uint amount) private {
    require(IERC20(W_MATIC).balanceOf(address(this)) >= amount, "S: Not enough wmatic");
    IWmatic(W_MATIC).withdraw(amount);
  }

  function _isMatic() internal pure returns (bool) {
    // not yet implemented
    return false;
  }

  function platform() external override pure returns (IStrategy.Platform) {
    return IStrategy.Platform.D_FORCE;
  }

}
