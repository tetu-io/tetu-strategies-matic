import {DoHardWorkLoopBase} from "../../DoHardWorkLoopBase";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {DeployerUtilsLocal} from "../../../../scripts/deploy/DeployerUtilsLocal";
import {MaticAddresses} from "../../../../scripts/addresses/MaticAddresses";
import {
  IstKlima,
  IRewardToken,
  IRewardToken__factory,
  IstKlima__factory
} from "../../../../typechain";
import {utils} from "ethers";
import {TokenUtils} from "../../../TokenUtils";

const {expect} = chai;
chai.use(chaiAsPromised);


export class VesqStakingDoHardWork extends DoHardWorkLoopBase {

  public async loopStartActions(i: number) {
    await super.loopStartActions(i);
    const gov = await DeployerUtilsLocal.impersonate(MaticAddresses.GOV_ADDRESS);
    await this.vault.connect(gov).changeProtectionMode(true);

    const dec = await TokenUtils.decimals(MaticAddresses.VSQ_TOKEN);
    const amount = utils.parseUnits('10000', dec);

    const treasury = await DeployerUtilsLocal.impersonate(MaticAddresses.VESQ_TREASURY);
    const klimaCtr = IRewardToken__factory.connect(MaticAddresses.VSQ_TOKEN, treasury);
    await klimaCtr.mint(MaticAddresses.VESQ_STAKING, amount);

    const klimaStaking = await DeployerUtilsLocal.impersonate(MaticAddresses.VESQ_STAKING);
    const stKlimaCtr = IstKlima__factory.connect(MaticAddresses.sVESQ, klimaStaking);
    await stKlimaCtr.rebase(amount, 1);
  }


  public async loopEndActions(i: number) {
    const dec = await TokenUtils.decimals(MaticAddresses.VSQ_TOKEN);
    const amount = utils.parseUnits('10000', dec);

    const treasury = await DeployerUtilsLocal.impersonate(MaticAddresses.VESQ_TREASURY);
    const klimaCtr = IRewardToken__factory.connect(MaticAddresses.VSQ_TOKEN, treasury);
    await klimaCtr.mint(MaticAddresses.VESQ_STAKING, amount);

    const klimaStaking = await DeployerUtilsLocal.impersonate(MaticAddresses.VESQ_STAKING);
    const stKlimaCtr = IstKlima__factory.connect(MaticAddresses.sVESQ, klimaStaking);
    await stKlimaCtr.rebase(amount, 1);

    await super.loopEndActions(i);
  }

}
