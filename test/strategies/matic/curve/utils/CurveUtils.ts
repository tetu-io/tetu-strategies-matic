import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {BigNumber, utils} from "ethers";
import {
  IAavePool,
  ICurve2Pool,
  IERC20,
  IERC20__factory,
  IRenBTCFtmPool,
  IRenBTCPool, IRenBTCPool__factory,
  ITricryptoPool, ITricryptoPool__factory,
  ITricryptoPoolFtm
} from "../../../../../typechain";
import {MaticAddresses} from "../../../../../scripts/addresses/MaticAddresses";
import {ethers} from "hardhat";
import {expect} from "chai";
import {UniswapUtils} from "../../../../UniswapUtils";
import {TokenUtils} from "../../../../TokenUtils";
import {DeployerUtilsLocal} from "../../../../../scripts/deploy/DeployerUtilsLocal";
import {parseUnits} from "ethers/lib/utils";

export class CurveUtils {

  public static async isCurve(signer: SignerWithAddress, token: string) {
    const name = await TokenUtils.tokenName(token);
    return name.startsWith('Curve');
  }

  public static async addLiquidity(signer: SignerWithAddress, token: string, amountN: number) {
    token = token.toLowerCase();
    if (token === MaticAddresses.AM3CRV_TOKEN) {
      await CurveUtils.addLiquidityAave(signer, amountN);
    } else if (token === MaticAddresses.USD_BTC_ETH_CRV_TOKEN) {
      await CurveUtils.addLiquidityTrirypto(signer, amountN);
    } else if (token === MaticAddresses.BTCCRV_TOKEN) {
      await CurveUtils.addLiquidityRen(signer, amountN);
    }
  }

  public static async addLiquidityAave(investor: SignerWithAddress, amountN: number) {
    await UniswapUtils.getTokenFromHolder(investor, MaticAddresses.SUSHI_ROUTER, MaticAddresses.USDC_TOKEN, utils.parseUnits('1000000'));
    const usdcUserBalance = await TokenUtils.balanceOf(MaticAddresses.USDC_TOKEN, investor.address);
    const aavePool = await ethers.getContractAt("IAavePool", MaticAddresses.CURVE_AAVE_POOL, investor) as IAavePool;
    const usdcToken = await ethers.getContractAt("IERC20", MaticAddresses.USDC_TOKEN, investor) as IERC20;
    await usdcToken.approve(MaticAddresses.CURVE_AAVE_POOL, usdcUserBalance, {from: investor.address});
    await aavePool.add_liquidity([0, usdcUserBalance, 0], 0, true);

  }

  public static async addLiquidityRen(investor: SignerWithAddress, amountN: number) {
    const dec = await TokenUtils.decimals(MaticAddresses.WBTC_TOKEN);
    const amount = utils.parseUnits('0.01', dec);
    await TokenUtils.getToken(MaticAddresses.WBTC_TOKEN, investor.address, amount);
    const renBTCPool = await ethers.getContractAt("IRenBTCPool", MaticAddresses.CURVE_renBTC_POOL, investor) as IRenBTCPool;
    await TokenUtils.approve(MaticAddresses.WBTC_TOKEN, investor, MaticAddresses.CURVE_renBTC_POOL, amount.toString());
    await renBTCPool.add_liquidity([amount, 0], 0, true);
  }

  public static async addLiquidityTrirypto(investor: SignerWithAddress, amountN: number) {
    console.log('try to deposit to atricrypto')
    await TokenUtils.getToken(MaticAddresses.USDC_TOKEN, investor.address, utils.parseUnits('10000', 6));
    const pool = await ethers.getContractAt("ITricryptoPool", MaticAddresses.CURVE_aTricrypto3_POOL, investor) as ITricryptoPool;
    const bal = await TokenUtils.balanceOf(MaticAddresses.USDC_TOKEN, investor.address);
    await TokenUtils.approve(MaticAddresses.USDC_TOKEN, investor, pool.address, bal.toString());
    await pool.add_liquidity([0, bal, 0, 0, 0], 0);
  }

  public static async swapTokens(trader: SignerWithAddress, token: string) {
    token = token.toLowerCase();
    if (token === MaticAddresses.AM3CRV_TOKEN) {
      await CurveUtils.swapTokensAAVE(trader);
    } else if (token === MaticAddresses.USD_BTC_ETH_CRV_TOKEN) {
      await CurveUtils.swapTricrypto(trader);
    } else if (token === MaticAddresses.BTCCRV_TOKEN) {
      await CurveUtils.swapRen(trader);
    } else {
      throw new Error('unknown token ' + token);
    }
  }

  public static async swapTokensAAVE(trader: SignerWithAddress) {
    await UniswapUtils.getTokenFromHolder(trader, MaticAddresses.SUSHI_ROUTER, MaticAddresses.WMATIC_TOKEN, utils.parseUnits('10000000')); // 100m wmatic
    await UniswapUtils.getTokenFromHolder(trader, MaticAddresses.SUSHI_ROUTER, MaticAddresses.USDC_TOKEN, utils.parseUnits('10000000'));

    const usdcToken = await ethers.getContractAt("ERC20", MaticAddresses.USDC_TOKEN, trader) as IERC20;
    const usdcUserBalance = await usdcToken.balanceOf(trader.address);
    expect(usdcUserBalance).is.not.eq("0", "user should have some USDC tokens to swap");
    const depContract = await ethers.getContractAt("IAavePool", MaticAddresses.CURVE_AAVE_POOL, trader) as IAavePool;
    await usdcToken.approve(MaticAddresses.CURVE_AAVE_POOL, usdcUserBalance, {from: trader.address});
    // swap usdc to dai
    await depContract.exchange_underlying(1, 0, usdcUserBalance, BigNumber.from("0"), {from: trader.address});
    const daiToken = await ethers.getContractAt("ERC20", MaticAddresses.DAI_TOKEN, trader) as IERC20;
    const daiTokenBalance = await daiToken.balanceOf(trader.address);
    await daiToken.approve(MaticAddresses.CURVE_AAVE_POOL, daiTokenBalance, {from: trader.address});
    // swap dai to usdc
    await depContract.exchange_underlying(0, 1, daiTokenBalance, BigNumber.from("0"), {from: trader.address});
  }

  public static async swapTricrypto(signer: SignerWithAddress) {
    console.log('swap tricrypto')
    const dec = 18;
    const token = MaticAddresses.DAI_TOKEN;
    const amount = parseUnits('10000', dec);
    await TokenUtils.getToken(token, signer.address, amount);
    const pool = ITricryptoPool__factory.connect(MaticAddresses.CURVE_aTricrypto3_POOL, signer);
    await TokenUtils.approve(token, signer, pool.address, amount.toString());
    await pool.exchange_underlying(0, 1, amount, 0, signer.address);
    console.log('swap tricrypto completed')
  }



  public static async swapRen(signer: SignerWithAddress) {
    console.log('swap ren')
    const amount = utils.parseUnits('1', 8);
    await TokenUtils.getToken(MaticAddresses.WBTC_TOKEN, signer.address, amount);
    const pool = IRenBTCPool__factory.connect(MaticAddresses.CURVE_renBTC_POOL, signer);
    await TokenUtils.approve(MaticAddresses.WBTC_TOKEN, signer, pool.address, amount.mul(2).toString());
    await pool.exchange_underlying(0, 1, amount, 0);
    console.log('swap ren completed')
  }

}
