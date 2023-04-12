import {DoHardWorkLoopBase} from "../../DoHardWorkLoopBase";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {
  IBalancerGauge__factory,
  IChildChainStreamer__factory,
  StrategyBalancerBPT__factory,
  StrategyBalancerTetuBoostedStMaticWmatic__factory
} from "../../../../typechain";
import {MaticAddresses} from "../../../../scripts/addresses/MaticAddresses";
import {TokenUtils} from "../../../TokenUtils";
import {parseUnits} from "ethers/lib/utils";
import {DeployerUtilsLocal} from "../../../../scripts/deploy/DeployerUtilsLocal";
import {TimeUtils} from "../../../TimeUtils";

const {expect} = chai;
chai.use(chaiAsPromised);


export class BalancerBPTSpecificHardWork extends DoHardWorkLoopBase {

  protected async loopStartActions(i: number) {
    await this.refuelRewards();
    await super.loopStartActions(i);
  }

  protected async loopEndActions(i: number) {
    await this.refuelRewards();
    await super.loopEndActions(i);
  }

  async refuelRewards() {
    const strat = StrategyBalancerBPT__factory.connect(this.strategy.address, this.signer);
    let gauge;
    const stratName = await strat.STRATEGY_NAME();
    if (stratName === 'BalancerBPTstMaticTetuBoostedStrategyBase' || stratName === 'BalancerBPTstMaticStrategyBase'|| stratName === 'BalancerBPTSphereWmaticStrategyBase') {
      gauge = IBalancerGauge__factory.connect(await StrategyBalancerTetuBoostedStMaticWmatic__factory.connect(strat.address, this.signer).GAUGE(), this.signer);
    } else {
      gauge = IBalancerGauge__factory.connect(await strat.gauge(), this.signer);
    }

    const streamerAdr = await gauge.reward_contract();
    // console.log(">>> streamer adr", streamerAdr);

    const owner = await DeployerUtilsLocal.impersonate('0xC128468b7Ce63eA702C1f104D55A2566b13D3ABD');
    const streamer = IChildChainStreamer__factory.connect(streamerAdr, owner);
    await TokenUtils.getToken(MaticAddresses.BAL_TOKEN, streamer.address, parseUnits('100'));
    await streamer.notify_reward_amount(MaticAddresses.BAL_TOKEN)

    // const data = await streamer.reward_data(MaticAddresses.BAL_TOKEN)
    // console.log(">>> data", data);

    // need for new gauges
    await TimeUtils.advanceBlocksOnTs(60 * 60 * 24 * 7)

    // await TokenUtils.getToken(MaticAddresses.BAL_TOKEN, streamer.address, parseUnits('100'));
    // await streamer.notify_reward_amount(MaticAddresses.BAL_TOKEN)

    // console.log(">>> data", data);
  }


}
