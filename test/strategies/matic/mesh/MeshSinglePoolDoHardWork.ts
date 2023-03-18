import {DoHardWorkLoopBase} from "../../DoHardWorkLoopBase";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {BigNumber, utils} from "ethers";
import {TokenUtils} from "../../../TokenUtils";
import {StrategyTestUtils} from "../../StrategyTestUtils";
import {Misc} from "../../../../scripts/utils/tools/Misc";
import {VaultUtils} from "../../../VaultUtils";

const {expect} = chai;
chai.use(chaiAsPromised);


export class MeshSinglePoolDoHardWork extends DoHardWorkLoopBase {
  // protected async userCheckBalanceInVault() {
  //   // assume that at this point we deposited all expected amount except userWithdrew amount
  //   const userBalance = await this.vault.underlyingBalanceWithInvestmentForHolder(this.user.address);
  //   // avoid rounding errors (add 2 instead of 1 for WBTC token)
  //   const userBalanceN = +utils.formatUnits(userBalance.add(2), this.undDec);
  //   const userBalanceExpectedN = +utils.formatUnits(this.userDeposited.sub(this.userWithdrew), this.undDec);
  //
  //   console.log('User balance +-:', DoHardWorkLoopBase.toPercent(userBalanceN, userBalanceExpectedN));
  //   expect(userBalanceN).is.greaterThanOrEqual(userBalanceExpectedN - (userBalanceExpectedN * this.balanceTolerance),
  //     'User has wrong balance inside the vault.\n' +
  //     'If you expect not zero balance it means the vault has a nature of PPFS decreasing.\n' +
  //     'It is not always wrong but you should triple check behavior and reasonable tolerance value.\n' +
  //     'If you expect zero balance and it has something inside IT IS NOT GOOD!\n');
  // }
}
