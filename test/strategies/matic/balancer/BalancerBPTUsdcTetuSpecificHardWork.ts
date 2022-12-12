import {DoHardWorkLoopBase} from "../../DoHardWorkLoopBase";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {
  IBalancerGauge__factory,
  IChildChainStreamer__factory, IERC20__factory,
  StrategyBalancerStMaticWmatic__factory, StrategyBalancerTetuUsdc__factory
} from "../../../../typechain";
import {MaticAddresses} from "../../../../scripts/addresses/MaticAddresses";
import {TokenUtils} from "../../../TokenUtils";
import {parseUnits} from "ethers/lib/utils";
import {DeployerUtilsLocal} from "../../../../scripts/deploy/DeployerUtilsLocal";
import {BigNumber} from "ethers";

const {expect} = chai;
chai.use(chaiAsPromised);


export class BalancerBPTUsdcTetuSpecificHardWork extends DoHardWorkLoopBase {

  tetuBalHolderLastBalance = BigNumber.from(0);
  controllerLastBalance = BigNumber.from(0);
  currentLoop = 0;

  protected async loopStartActions(i: number) {
    await super.loopStartActions(i);
    this.currentLoop = i;

    const strat = StrategyBalancerTetuUsdc__factory.connect(this.strategy.address, this.signer);
    const gauge = IBalancerGauge__factory.connect(await strat.GAUGE(), this.signer);
    const streamerAdr = await gauge.reward_contract();

    const owner = await DeployerUtilsLocal.impersonate('0xC128468b7Ce63eA702C1f104D55A2566b13D3ABD');
    const streamer = IChildChainStreamer__factory.connect(streamerAdr, owner);
    await TokenUtils.getToken(MaticAddresses.BAL_TOKEN, streamer.address, parseUnits('100'));
    await streamer.notify_reward_amount(MaticAddresses.BAL_TOKEN)

    const tetuBalHolder = await strat.tetuBalHolder()
    this.tetuBalHolderLastBalance = await IERC20__factory.connect(MaticAddresses.tetuBAL, this.signer).balanceOf(tetuBalHolder);
    this.controllerLastBalance = await IERC20__factory.connect(MaticAddresses.TETU_TOKEN, this.signer).balanceOf(this.core.controller.address);
  }

  protected async loopEndCheck() {
    await super.loopEndCheck();

    if (this.currentLoop !== 0) {
      const strat = StrategyBalancerTetuUsdc__factory.connect(this.strategy.address, this.signer);
      const tetuBalHolder = await strat.tetuBalHolder()
      const balanceTetuBal = await IERC20__factory.connect(MaticAddresses.tetuBAL, this.signer).balanceOf(tetuBalHolder);
      console.log('balanceTetuBal', balanceTetuBal.toString())
      expect(balanceTetuBal.gt(this.tetuBalHolderLastBalance)).eq(true);

      const ctrlBal = await IERC20__factory.connect(MaticAddresses.TETU_TOKEN, this.signer).balanceOf(this.core.controller.address);
      expect(ctrlBal.gt(this.controllerLastBalance)).eq(true);
    }
  }


}
