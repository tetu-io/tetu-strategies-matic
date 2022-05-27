import {DoHardWorkLoopBase} from "../../DoHardWorkLoopBase";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {
  IBalancerGauge__factory,
  IChildChainStreamer__factory,
  IERC20__factory,
  StrategyBalancerPool__factory
} from "../../../../typechain";
import {MaticAddresses} from "../../../../scripts/addresses/MaticAddresses";
import {TokenUtils} from "../../../TokenUtils";
import {parseUnits} from "ethers/lib/utils";

const {expect} = chai;
chai.use(chaiAsPromised);


export class BalancerLpSpecificHardWork extends DoHardWorkLoopBase {

  protected async loopStartActions(i: number) {
    await super.loopStartActions(i);
    //
    // const strat = StrategyBalancerPool__factory.connect(this.strategy.address, this.signer);
    // const gauge = IBalancerGauge__factory.connect(await strat.gauge(), this.signer);
    //
    // // const owner = await DeployerUtilsLocal.impersonate();
    // const streamer = IChildChainStreamer__factory.connect('0x6f5a2ee11e7a772aeb5114a20d0d7c0ff61eb8a0', this.signer);
    //
    // await TokenUtils.getToken(MaticAddresses.BAL_TOKEN, streamer.address, parseUnits('100000'));
    // const balToken = IERC20__factory.connect(MaticAddresses.BAL_TOKEN, this.signer);
    // await streamer.notify_reward_amount(MaticAddresses.BAL_TOKEN)
  }


}
