import {
  IBalancerGauge__factory,
  IERC20__factory,
  IERC20Metadata__factory
} from "../../../typechain";
import {ethers} from "hardhat";
import {DeployerUtilsLocal} from "../../../scripts/deploy/DeployerUtilsLocal";
import {parseUnits} from "ethers/lib/utils";
import {TokenUtils} from "../../TokenUtils";
import {Misc} from "../../../scripts/utils/tools/Misc";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

export class UtilsBalancerGaugeV2 {
  static async registerRewardTokens(signer: SignerWithAddress, gaugeAddress: string, rewardToken: string) {
    // Set up BalancerGauge
    // register TETU as reward token in the GAUGE
    const gauge = await IBalancerGauge__factory.connect(gaugeAddress, signer);
    const rt = IERC20Metadata__factory.connect(rewardToken, signer);

    // register new rewards distributor
    const rewardsDistributor = ethers.Wallet.createRandom().address;
    await gauge.connect(
      await DeployerUtilsLocal.impersonate(await gauge.authorizer_adaptor())
    ).add_reward(rewardToken, rewardsDistributor);
    await gauge.connect(
      await DeployerUtilsLocal.impersonate(await gauge.authorizer_adaptor())
    ).set_reward_distributor(rewardToken, rewardsDistributor);
  }

  static async depositRewardTokens(signer: SignerWithAddress, gaugeAddress: string, rts: string[], amountNum: string = "1000") {
    const gauge = await IBalancerGauge__factory.connect(gaugeAddress, signer);

    for (const rt of rts) {
      const rewardData = await gauge.reward_data(rt);
      const rewardToken = IERC20Metadata__factory.connect(rt, signer);

      // deposit some amount of the rewards to the gauge
      const amount = parseUnits(amountNum, await rewardToken.decimals());
      await TokenUtils.getToken(rt, rewardData.distributor, amount);

      await IERC20__factory.connect(rt, await DeployerUtilsLocal.impersonate(rewardData.distributor)).approve(gauge.address, Misc.MAX_UINT);
      console.log('>>> Add rewards', rt, amountNum);
      await gauge.connect(
        await DeployerUtilsLocal.impersonate(rewardData.distributor)
      ).deposit_reward_token(rt, amount);
    }
  }
}
