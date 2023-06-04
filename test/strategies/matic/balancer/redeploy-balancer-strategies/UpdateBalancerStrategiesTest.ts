import {deploySphereWmatic1} from "./1.SPHERE-WMATIC";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {TimeUtils} from "../../../../TimeUtils";
import {ethers} from "hardhat";
import {expect} from "chai";
import {deployUsdcTetu2} from "./2.USDC-TETU";
import {deployTngblUsdc3} from "./3.TNGBL-USDC";
import {deployWUsdrUsdc4} from "./4.wUSDR-USDC";
import {deployBoostedTetuStables5} from "./5.boosted_TETU_Stables";
import {deployMaticXWmaticAave3Boosted6} from "./6.MaticX-WMATIC-aave3-boosted";
import {deployStMaticWMaticAave3Boosted7} from "./7.stMATIC-WMATIC-aave3-boosted";
import {
  IAnnouncer__factory,
  IController__factory,
  ISmartVault__factory,
  IStrategy__factory
} from "../../../../../typechain";
import {DeployerUtilsLocal} from "../../../../../scripts/deploy/DeployerUtilsLocal";

describe("UpdateBalancerStrategiesTest @skip-on-coverage", () => {
  let snapshot: string;
  let snapshotForEach: string;
  let signer: SignerWithAddress;

//region before, after
  before(async function () {
    this.timeout(1200000);
    snapshot = await TimeUtils.snapshot();
    const signers = await ethers.getSigners();
    signer = signers[0];
  });

  after(async function () {
    await TimeUtils.rollback(snapshot);
  });

  beforeEach(async function () {
    snapshotForEach = await TimeUtils.snapshot();
  });

  afterEach(async function () {
    await TimeUtils.rollback(snapshotForEach);
  });
//endregion before, after

  describe("Simulate upgrade of the strategies", () => {
    const CONTROLLER = "0x6678814c273d5088114b6e40cc49c8db04f9bc29";

    it("should upgrade implementation of all strategies", async () => {
      const s1 = "0xC9aB3F1A7CBe45C329Ae93bC97cAd63c27D49799";
      const s2 = "0x0c7362685473A571DBEe086f10F34B8b9dB9E56b";
      const s3 = "0x47525f14809bc6713dAb01e4E1720e71506C90CE";
      const s4 = "0xD10FAD8D77B11220Ad59c62D14e1dBcA26fb6ed7";
      const s5 = "0x69532344A2FC9BE12c4e642b1D604738E2051898";
      const s6 = "0x59ba881fea01A94b032D727C9eCEB20ED87d02A0";
      const s7 = "0x8C50B7348e16804e31817de271D12C6a0c4c70A5";

      // deploy all new strategies
      const r1 = await DeployerUtilsLocal.deployContract(signer, "StrategyBalancerSphereWmatic");
      const r2 = await DeployerUtilsLocal.deployContract(signer, "StrategyBalancerTetuUsdc");
      const r3 = await DeployerUtilsLocal.deployContract(signer, "StrategyBalancerTngblUsdc");
      const r4 = await DeployerUtilsLocal.deployContract(signer, "StrategyBalancerBPT");
      const r5 = await DeployerUtilsLocal.deployContract(signer, "StrategyBalancerBPT");
      const r6 = await DeployerUtilsLocal.deployContract(signer, "StrategyBalancerUniversal");
      const r7 = await DeployerUtilsLocal.deployContract(signer, "StrategyBalancerUniversal");

      const controller = await IController__factory.connect(CONTROLLER, signer);
      const governanceAddress = await controller.governance();
      const governance = await DeployerUtilsLocal.impersonate(governanceAddress);
      const controllerAsGov = controller.connect(governance);
      const announcer = IAnnouncer__factory.connect(await controller.announcer(), governance);

      const strategiesStateBefore = [
        await IStrategy__factory.connect(s1, signer).investedUnderlyingBalance(),
        await IStrategy__factory.connect(s2, signer).investedUnderlyingBalance(),
        await IStrategy__factory.connect(s3, signer).investedUnderlyingBalance(),
        await IStrategy__factory.connect(s4, signer).investedUnderlyingBalance(),
        await IStrategy__factory.connect(s5, signer).investedUnderlyingBalance(),
        await IStrategy__factory.connect(s6, signer).investedUnderlyingBalance(),
        await IStrategy__factory.connect(s7, signer).investedUnderlyingBalance(),
      ];
      console.log("strategiesStateBefore", strategiesStateBefore);

      // announce strategies upgrades
      await announcer.announceTetuProxyUpgradeBatch(
        [s1, s2, s3, s4, s5, s6, s7],
        [r1.address, r2.address, r3.address, r4.address, r5.address, r6.address, r7.address]
      );

      await TimeUtils.advanceBlocksOnTs(60 * 60 * 50);


      // upgrade strategies
      await controllerAsGov.upgradeTetuProxyBatch(
        [s1, s2, s3, s4, s5, s6, s7],
        [r1.address, r2.address, r3.address, r4.address, r5.address, r6.address, r7.address]
      );

      const strategiesStateMiddle = [
        await IStrategy__factory.connect(s1, signer).investedUnderlyingBalance(),
        await IStrategy__factory.connect(s2, signer).investedUnderlyingBalance(),
        await IStrategy__factory.connect(s3, signer).investedUnderlyingBalance(),
        await IStrategy__factory.connect(s4, signer).investedUnderlyingBalance(),
        await IStrategy__factory.connect(s5, signer).investedUnderlyingBalance(),
        await IStrategy__factory.connect(s6, signer).investedUnderlyingBalance(),
        await IStrategy__factory.connect(s7, signer).investedUnderlyingBalance(),
      ];
      console.log("strategiesStateMiddle", strategiesStateMiddle);
      //
      //
      // // invest amounts back from vaults to the strategies
      // await (await ISmartVault__factory.connect(r1.vault, governance)).doHardWork();
      // await (await ISmartVault__factory.connect(r2.vault, governance)).doHardWork();
      // await (await ISmartVault__factory.connect(r3.vault, governance)).doHardWork();
      // await (await ISmartVault__factory.connect(r4.vault, governance)).doHardWork();
      // await (await ISmartVault__factory.connect(r5.vault, governance)).doHardWork();
      // await (await ISmartVault__factory.connect(r6.vault, governance)).doHardWork();
      // await (await ISmartVault__factory.connect(r7.vault, governance)).doHardWork();
      //
      // const strategiesStateFinal = [
      //   await IStrategy__factory.connect(s1, signer).investedUnderlyingBalance(),
      //   await IStrategy__factory.connect(s2, signer).investedUnderlyingBalance(),
      //   await IStrategy__factory.connect(s3, signer).investedUnderlyingBalance(),
      //   await IStrategy__factory.connect(s4, signer).investedUnderlyingBalance(),
      //   await IStrategy__factory.connect(s5, signer).investedUnderlyingBalance(),
      //   await IStrategy__factory.connect(s6, signer).investedUnderlyingBalance(),
      //   await IStrategy__factory.connect(s7, signer).investedUnderlyingBalance(),
      // ];
      // console.log("strategiesStateFinal", strategiesStateFinal);
    });
  });
});