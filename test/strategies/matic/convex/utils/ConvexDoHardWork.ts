import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {DoHardWorkLoopBase} from "../../../DoHardWorkLoopBase";
import {ConvexUtils} from "./ConvexUtils";
import {ethers} from "hardhat";
import {
  ConvexStrategyBase__factory, IConvexGauge__factory
} from "../../../../../typechain";
import {UtilsBalancerGaugeV2} from "../../../../baseUtils/balancer/utilsBalancerGaugeV2";
import {MaticAddresses} from "../../../../../scripts/addresses/MaticAddresses";
import {DeployerUtilsLocal} from "../../../../../scripts/deploy/DeployerUtilsLocal";


const {expect} = chai;
chai.use(chaiAsPromised);

export class ConvexDoHardWork extends DoHardWorkLoopBase {

  public async loopStartActions(i: number) {
    await this.refuelRewards();
    await super.loopStartActions(i);
    await ConvexUtils.swapTokens((await ethers.getSigners())[3], this.underlying);
    await this.refuelRewards();
  }

  async refuelRewards() {
    const strat = ConvexStrategyBase__factory.connect(this.strategy.address, this.signer);
    const gauge = IConvexGauge__factory.connect(await strat.gauge(), this.signer);
    if ((await gauge.reward_count()).toNumber() === 0) {
      await ConvexUtils.registerRewardTokens(this.signer, gauge.address, MaticAddresses.TETU_TOKEN);
      await strat.connect(await DeployerUtilsLocal.impersonate(await strat.controller())).setRewardTokens([MaticAddresses.TETU_TOKEN]);
    }
    await ConvexUtils.depositRewardTokens(this.signer, gauge.address, await strat.rewardTokens());
  }
}
