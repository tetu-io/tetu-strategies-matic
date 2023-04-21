import {DoHardWorkLoopBase} from "../../DoHardWorkLoopBase";
import {ethers} from "hardhat";
import {ILDORewardsDistribution, IOToken, ZerovixstMaticStrategy} from "../../../../typechain";
import {DeployerUtilsLocal} from "../../../../scripts/deploy/DeployerUtilsLocal";
import {parseUnits} from "ethers/lib/utils";

export class HardWorkForZerovixstMatic extends DoHardWorkLoopBase {
    protected async loopStartActions(i: number) {
        console.log("TRY TO SETUP 0VIX rewards", i);
        const strategy = await ethers.getContractAt('ZerovixstMaticStrategy', this.strategy.address) as ZerovixstMaticStrategy
        const oToken = await ethers.getContractAt('IOToken', await strategy.oToken()) as IOToken
        await oToken.accrueInterest()

        const rewardsDistributor = await ethers.getContractAt('ILDORewardsDistribution', await strategy.REWARD_DISTRIBUTOR()) as ILDORewardsDistribution
        const newEpoch = (await rewardsDistributor.epochNumber()).add(1)
        const rewardsDistributorOwner = await DeployerUtilsLocal.impersonate(await rewardsDistributor.owner())

        // need users with borrowed stMATIC to prevent division by zero in contract
        const users = [
            '0xf08C640A2aeAbad749ee939935AB7E8665CDd32f',
            '0xF13FB1113138b94deEcb91E1ca27CEc90b062835',
            '0xf2DfBC45655BaB1c86d082789DA65ecDe91B2Ec0',
            '0xF324A3a4C3F6b7FA498d49f663E3f9adb58a8064',
            '0xf351D914F2500DB0E3d51D521fB0d29185F68Ab8',
            strategy.address,
        ]
        await rewardsDistributor.connect(rewardsDistributorOwner).updateUsersPosition(users, newEpoch)
        await rewardsDistributor.connect(rewardsDistributorOwner).updateEpochParams(newEpoch, parseUnits('100'), parseUnits('100'))
        await rewardsDistributor.connect(rewardsDistributorOwner).updateUsersRewards(users, newEpoch)

        await super.loopStartActions(i)
    }
}
