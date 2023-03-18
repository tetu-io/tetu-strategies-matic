import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {BigNumber} from "ethers";
import {MaticAddresses} from "../../../../scripts/addresses/MaticAddresses";
import {DForcePriceOracleMock, IDForceController__factory} from "../../../../typechain";
import {DForceHelper} from "./DForceHelper";
import {DeployerUtilsLocal} from "../../../../scripts/deploy/DeployerUtilsLocal";
import {Misc} from "../../../../scripts/utils/tools/Misc";

export class DForceChangePriceUtils {
  public static async setupPriceOracleMock(deployer: SignerWithAddress, copyPrices: boolean = true) : Promise<DForcePriceOracleMock> {
    const cTokensList = [
      MaticAddresses.dForce_iDAI,
      MaticAddresses.dForce_iMATIC,
      MaticAddresses.dForce_iUSDC,
      MaticAddresses.dForce_iWETH,
      MaticAddresses.dForce_iUSDT,
      MaticAddresses.dForce_iWBTC,
      MaticAddresses.dForce_iEUX,
      MaticAddresses.dForce_iCRV,
      MaticAddresses.dForce_iDF,
      MaticAddresses.DF_TOKEN
    ];
    const priceOracle = await DForceHelper.getPriceOracle(await DForceHelper.getController(deployer), deployer);

    const comptroller = await DForceHelper.getController(deployer);
    const owner = await comptroller.owner();

    // deploy mock
    const mock = (await DeployerUtilsLocal.deployContract(deployer, "DForcePriceOracleMock")) as DForcePriceOracleMock;

    // copy current prices from real price oracle to the mock
    const comptrollerAsAdmin = await DForceHelper.getController(
      await DeployerUtilsLocal.impersonate(owner)
    );
    if (copyPrices) {
      for (const cToken of cTokensList) {
        const price = await priceOracle.getUnderlyingPrice(cToken);
        await mock.setUnderlyingPrice(cToken, price);
      }
    }

    // install the mock to the protocol
    console.log("Change price oracle...");
    await comptrollerAsAdmin._setPriceOracle(mock.address);
    console.log("Price oracle is changed");

    return mock;
  }

  public static async changeCTokenPrice(
    oracle: DForcePriceOracleMock,
    signer: SignerWithAddress,
    cToken: string,
    inc: boolean,
    times: number
  ) {
    console.log("changeCTokenPrice");
    const currentPrice: BigNumber = await oracle.getUnderlyingPrice(cToken);
    const newPrice = inc
      ? currentPrice.mul(times)
      : currentPrice.div(times);
    await oracle.setUnderlyingPrice(
      cToken,
      newPrice
    );
    console.log(`Price of asset ${cToken} was changed from ${currentPrice} to ${newPrice}`);
  }

  public static async setBorrowCapacity(
    deployer: SignerWithAddress,
    cToken: string,
    amount: BigNumber
  ) {
    const comptroller = await DForceHelper.getController(deployer);
    const owner = await comptroller.owner();

    const comptrollerAsOwner = IDForceController__factory.connect(
      comptroller.address,
      await DeployerUtilsLocal.impersonate(owner)
    );
    await comptrollerAsOwner._setBorrowCapacity(cToken, amount);
  }

  public static async setSupplyCapacity(
    deployer: SignerWithAddress,
    cToken: string,
    amount: BigNumber
  ) {
    const comptroller = await DForceHelper.getController(deployer);
    const owner = await comptroller.owner();

    const comptrollerAsOwner = IDForceController__factory.connect(
      comptroller.address,
      await DeployerUtilsLocal.impersonate(owner)
    );
    await comptrollerAsOwner._setSupplyCapacity(cToken, amount);
  }

  public static async setMintPaused(deployer: SignerWithAddress, cToken: string, paused: boolean = true) {
    const comptroller = await DForceHelper.getController(deployer);
    const owner = await comptroller.owner();

    const comptrollerAsOwner = IDForceController__factory.connect(
      comptroller.address,
      await DeployerUtilsLocal.impersonate(owner)
    );
    await comptrollerAsOwner._setMintPaused(cToken, paused);
  }

  public static async setRedeemPaused(deployer: SignerWithAddress, cToken: string, paused: boolean = true) {
    const comptroller = await DForceHelper.getController(deployer);
    const owner = await comptroller.owner();

    const comptrollerAsOwner = IDForceController__factory.connect(
      comptroller.address,
      await DeployerUtilsLocal.impersonate(owner)
    );
    await comptrollerAsOwner._setRedeemPaused(cToken, paused);
  }

  public static async setBorrowPaused(deployer: SignerWithAddress, cToken: string, paused: boolean = true) {
    const comptroller = await DForceHelper.getController(deployer);
    const owner = await comptroller.owner();

    const comptrollerAsOwner = IDForceController__factory.connect(
      comptroller.address,
      await DeployerUtilsLocal.impersonate(owner)
    );
    await comptrollerAsOwner._setBorrowPaused(cToken, paused);
  }
}
