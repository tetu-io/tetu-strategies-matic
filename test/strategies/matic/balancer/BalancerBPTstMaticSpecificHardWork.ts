import {DoHardWorkLoopBase} from "../../DoHardWorkLoopBase";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {
  IBalancerGauge__factory,
  IChildChainStreamer__factory,
  StrategyBalancerBPT__factory, StrategyBalancerStMaticWmatic__factory
} from "../../../../typechain";
import {MaticAddresses} from "../../../../scripts/addresses/MaticAddresses";
import {TokenUtils} from "../../../TokenUtils";
import {parseUnits} from "ethers/lib/utils";
import {DeployerUtilsLocal} from "../../../../scripts/deploy/DeployerUtilsLocal";

const {expect} = chai;
chai.use(chaiAsPromised);


export class BalancerBPTstMaticSpecificHardWork extends DoHardWorkLoopBase {

  protected async loopStartActions(i: number) {
    await super.loopStartActions(i);

    const strat = StrategyBalancerStMaticWmatic__factory.connect(this.strategy.address, this.signer);
    const gauge = IBalancerGauge__factory.connect(await strat.GAUGE(), this.signer);
    const streamerAdr = await gauge.reward_contract();

    const owner = await DeployerUtilsLocal.impersonate('0xC128468b7Ce63eA702C1f104D55A2566b13D3ABD');
    const streamer = IChildChainStreamer__factory.connect(streamerAdr, owner);
    await TokenUtils.getToken(MaticAddresses.BAL_TOKEN, streamer.address, parseUnits('100'));
    await streamer.notify_reward_amount(MaticAddresses.BAL_TOKEN)
  }


}