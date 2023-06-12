import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {BigNumber, utils} from "ethers";
import {
  IERC20,
  IERC20__factory,
  IConvexPool, ICurveLpToken, IConvexMinter__factory
} from "../../../../../typechain";
import {MaticAddresses} from "../../../../../scripts/addresses/MaticAddresses";
import {ethers} from "hardhat";
import {expect} from "chai";
import {UniswapUtils} from "../../../../UniswapUtils";
import {TokenUtils} from "../../../../TokenUtils";
import {DeployerUtilsLocal} from "../../../../../scripts/deploy/DeployerUtilsLocal";
import {parseUnits} from "ethers/lib/utils";

export class ConvexUtils {

  public static async isConvex(signer: SignerWithAddress, token: string) {
    const name = await TokenUtils.tokenName(token);
    return name.startsWith('Convex');
  }

  public static async addLiquidity(signer: SignerWithAddress, token: string, amountN: number) {
    token = token.toLowerCase();
    if (token === MaticAddresses.AM3CRV_TOKEN) {
      await ConvexUtils.addLiquidityUSDRam3CRV(signer, amountN);
    } else if (token === MaticAddresses.AM3CRV_AMWBTC_AMWETH_TOKEN) {
      await ConvexUtils.addLiquidityAm3CRVaMWBTCaMWETH(signer, amountN);
    }
  }

  public static async addLiquidityUSDRam3CRV(investor: SignerWithAddress, amountN: number) {
    const amount = utils.parseUnits('1000', 18);
    await TokenUtils.getToken(MaticAddresses.AM3CRV_TOKEN, investor.address, amount);
    const am3CRVUserBalance = await TokenUtils.balanceOf(MaticAddresses.AM3CRV_TOKEN, investor.address);
    const usdrAm3CRVPool = await ethers.getContractAt("IConvexPool", MaticAddresses.CURVE_USDR_am3CRV_TOKEN, investor) as IConvexPool;
    const am3CRVToken = await ethers.getContractAt("IERC20", MaticAddresses.AM3CRV_TOKEN, investor) as IERC20;
    await am3CRVToken.approve(MaticAddresses.CURVE_USDR_am3CRV_TOKEN, am3CRVUserBalance, {from: investor.address});
    await usdrAm3CRVPool.add_liquidity([0, am3CRVUserBalance], 0);

  }

  public static async addLiquidityAm3CRVaMWBTCaMWETH(investor: SignerWithAddress, amountN: number) {
    const amount = utils.parseUnits('1000', 18);
    await TokenUtils.getToken(MaticAddresses.AM3CRV_TOKEN, investor.address, amount);
    const am3CRVUserBalance = await TokenUtils.balanceOf(MaticAddresses.AM3CRV_TOKEN, investor.address);

    const lpToken = await ethers.getContractAt("ICurveLpToken", MaticAddresses.AM3CRV_AMWBTC_AMWETH_TOKEN, investor) as ICurveLpToken;
    const minterAddress = await lpToken.minter();

    await TokenUtils.approve(MaticAddresses.AM3CRV_TOKEN, investor, minterAddress, amount.toString());
    await IConvexMinter__factory.connect(minterAddress, investor).add_liquidity([am3CRVUserBalance, 0, 0], 0);
  }

  public static async swapTokens(trader: SignerWithAddress, token: string) {
    token = token.toLowerCase();
    if (token === MaticAddresses.CURVE_USDR_am3CRV_TOKEN) {
      await ConvexUtils.swapToUSDR(trader);
    } else if (token === MaticAddresses.AM3CRV_AMWBTC_AMWETH_TOKEN) {
      await ConvexUtils.swapToAmWBTC(trader);
    } else {
      throw new Error('unknown token ' + token);
    }
  }

  public static async swapToUSDR(signer: SignerWithAddress) {
    const amount = utils.parseUnits('1000', 18);
    await TokenUtils.getToken(MaticAddresses.AM3CRV_TOKEN, signer.address, amount);

    const pool = IConvexMinter__factory.connect(MaticAddresses.CURVE_USDR_am3CRV_TOKEN, signer);
    await TokenUtils.approve(MaticAddresses.AM3CRV_TOKEN, signer, pool.address, amount.toString());

    await pool.exchange(1, 0, amount, 0);
    console.log('swap am3CRV to USDR completed')
  }

  public static async swapToAmWBTC(signer: SignerWithAddress) {
    const amount = utils.parseUnits('1000', 18);
    await TokenUtils.getToken(MaticAddresses.AM3CRV_TOKEN, signer.address, amount);

    const lpToken = await ethers.getContractAt("ICurveLpToken", MaticAddresses.AM3CRV_AMWBTC_AMWETH_TOKEN, signer) as ICurveLpToken;
    const minterAddress = await lpToken.minter();

    await TokenUtils.approve(MaticAddresses.AM3CRV_TOKEN, signer, minterAddress, amount.toString());
    const minter = IConvexMinter__factory.connect(minterAddress, signer).exchange(0, 1, amount, 0);
    console.log('swap am3CRV to amWBTC completed')
  }
}
