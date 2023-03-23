import {DoHardWorkLoopBase} from "../../DoHardWorkLoopBase";
import {ethers} from "hardhat";
import {IOToken, ZerovixStrategy} from "../../../../typechain";

export class HardWorkForZerovix extends DoHardWorkLoopBase {
    protected async afterBlockAdvance() {
        const strategy = await ethers.getContractAt('ZerovixStrategy', this.strategy.address) as ZerovixStrategy
        const oToken = await ethers.getContractAt('IOToken', await strategy.oToken()) as IOToken
        await oToken.accrueInterest()
        await super.afterBlockAdvance()
    }
}