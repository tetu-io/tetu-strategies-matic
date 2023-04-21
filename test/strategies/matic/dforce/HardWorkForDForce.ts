import {DoHardWorkLoopBase} from "../../DoHardWorkLoopBase";
import {DForceChangePriceUtils} from "./DForceChangePriceUtils";
import {DForcePriceOracleMock} from "../../../../typechain";

export class HardWorkForDForce extends DoHardWorkLoopBase {
  priceOracleMock?: DForcePriceOracleMock;
  rTokenAddress?: string;

  protected async init() {
    await super.init();
    this.priceOracleMock = await DForceChangePriceUtils.setupPriceOracleMock(this.signer);
  }

  public async loopStartActions(i: number) {

    console.log("DForceChangePriceUtils.changeCTokenPrice");
    if (this.priceOracleMock && this.rTokenAddress) {
      await DForceChangePriceUtils.changeCTokenPrice(
        this.priceOracleMock,
        this.signer,
        this.rTokenAddress,
        false,
        1
      );
    }
  }

}
