import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {BigNumber, utils} from "ethers";
import {
  IERC20,
  IERC20Metadata__factory, IERC20__factory,
  IConvexPool, ICurveLpToken, IConvexMinter__factory, IConvexGauge__factory
} from "../../../../../typechain";
import {MaticAddresses} from "../../../../../scripts/addresses/MaticAddresses";
import {ethers} from "hardhat";
import {expect} from "chai";
import {UniswapUtils} from "../../../../UniswapUtils";
import {TokenUtils} from "../../../../TokenUtils";
import {DeployerUtilsLocal} from "../../../../../scripts/deploy/DeployerUtilsLocal";
import {parseUnits} from "ethers/lib/utils";
import {Misc} from "../../../../../scripts/utils/tools/Misc";

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

  static async registerRewardTokens(signer: SignerWithAddress, gaugeAddress: string, rewardToken: string) {
    // Set up ConvexGauge
    // register TETU as reward token in the GAUGE
    const managerAddress = await IConvexGauge__factory.connect(gaugeAddress, signer).manager();
    const manager = await DeployerUtilsLocal.impersonate(managerAddress);

    // register new rewards distributor
    const rewardsDistributor = ethers.Wallet.createRandom().address;
    const gauge = await IConvexGauge__factory.connect(gaugeAddress, manager);
    await gauge.add_reward(rewardToken, rewardsDistributor);
    await gauge.set_reward_distributor(rewardToken, rewardsDistributor);
  }

  static async depositRewardTokens(signer: SignerWithAddress, gaugeAddress: string, rts: string[], amountNum: string = "1000") {
    const gauge = await IConvexGauge__factory.connect(gaugeAddress, signer);

    for (const rt of rts) {
      const rewardData = await gauge.reward_data(rt);
      const rewardToken = IERC20Metadata__factory.connect(rt, signer);
      // deposit some amount of the rewards to the gauge
      const amount = parseUnits(amountNum, await rewardToken.decimals());
      await TokenUtils.getToken(rt, rewardData.distributor, amount);

      await IERC20__factory.connect(rt, await DeployerUtilsLocal.impersonate(rewardData.distributor)).approve(gauge.address, Misc.MAX_UINT);
      await gauge.connect(
          await DeployerUtilsLocal.impersonate(rewardData.distributor)
      ).deposit_reward_token(rt, amount);
    }
  }
}
