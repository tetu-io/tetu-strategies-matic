import {DoHardWorkLoopBase} from "../../DoHardWorkLoopBase";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {MaticAddresses} from "../../../../scripts/addresses/MaticAddresses";
import {BigNumber, utils} from "ethers";
import {TokenUtils} from "../../../TokenUtils";
import {StrategyTestUtils} from "../../StrategyTestUtils";
import {IERC20__factory} from "../../../../typechain";

const {expect} = chai;
chai.use(chaiAsPromised);


export class QiStakingDoHardWork extends DoHardWorkLoopBase {

  bptVaultRewardsBefore = BigNumber.from(0);

  public async loopStartActions(i: number) {
    await super.loopStartActions(i);
    this.bptVaultRewardsBefore = await IERC20__factory.connect(MaticAddresses.TETU_TOKEN, this.signer).balanceOf('0x190cA39f86ea92eaaF19cB2acCA17F8B2718ed58')
    const ppfsBefore = await this.vault.getPricePerFullShare();
    console.log('ppfs before transfer QI', ppfsBefore.toString());
    await TokenUtils.getToken(MaticAddresses.QI_TOKEN, this.strategy.address, utils.parseUnits('1000'))
    const ppfsAfter = await this.vault.getPricePerFullShare();
    console.log('ppfs after transfer QI', ppfsAfter.toString());
    expect(ppfsBefore).is.eq(ppfsAfter);
  }


  public async loopEndActions(i: number) {
    console.log('loopEndActions - no withdraw actions')
  }

  protected async postLoopCheck() {
    await this.vault.doHardWork();

    await this.vault.connect(this.signer).getAllRewards();
    await this.vault.connect(this.user).getAllRewards();

    // strategy should not contain any tokens in the end
    const stratRtBalances = await StrategyTestUtils.saveStrategyRtBalances(this.strategy);
    for (const rtBal of stratRtBalances) {
      expect(rtBal).is.eq(0, 'Strategy contains not liquidated rewards');
    }

    // check vault balance
    const vaultBalanceAfter = await TokenUtils.balanceOf(this.core.psVault.address, this.vault.address);
    expect(vaultBalanceAfter.sub(this.vaultRTBal)).is.not.eq("0", "vault reward should increase");

    // check bpt vault rewards
    const bptVaultRewardsAfter = await IERC20__factory.connect(MaticAddresses.TETU_TOKEN, this.signer).balanceOf('0x190cA39f86ea92eaaF19cB2acCA17F8B2718ed58')
    expect(bptVaultRewardsAfter.sub(this.bptVaultRewardsBefore)).is.not.eq("0", "bpt vault rewards should increase");

    // check reward for user
    const rewardBalanceAfter = await TokenUtils.balanceOf(this.core.psVault.address, this.user.address);
    expect(rewardBalanceAfter.sub(this.userRTBal).toString())
      .is.not.eq("0", "should have earned xTETU rewards");
  }

}
