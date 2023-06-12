import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {DoHardWorkLoopBase} from "../../../DoHardWorkLoopBase";
import {ConvexUtils} from "./ConvexUtils";
import {ethers} from "hardhat";

const {expect} = chai;
chai.use(chaiAsPromised);

export class ConvexDoHardWork extends DoHardWorkLoopBase {

  public async loopStartActions(i: number) {
    await super.loopStartActions(i);
    await ConvexUtils.swapTokens((await ethers.getSigners())[3], this.underlying);
  }
}
