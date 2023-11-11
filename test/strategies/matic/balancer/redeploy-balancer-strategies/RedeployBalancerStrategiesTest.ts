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

describe.skip("RedeployBalancerStrategiesTest @skip-on-coverage", () => {
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

  describe("Deploy tests", () => {
    it("deploySphereWmatic1", async () => {
      const r = await deploySphereWmatic1(signer);
      expect(!!r.strategy).eq(true);
    });
    it("deployUsdcTetu2", async () => {
      const r = await deployUsdcTetu2(signer);
      expect(!!r.strategy).eq(true);
    });
    it("deployTngblUsdc3", async () => {
      const r = await deployTngblUsdc3(signer);
      expect(!!r.strategy).eq(true);
    });
    it("deployWUsdrUsdc4", async () => {
      const r = await deployWUsdrUsdc4();
      expect(!!r.strategy).eq(true);
    });
    it("deployBoostedTetuStables5", async () => {
      const r = await deployBoostedTetuStables5();
      expect(!!r.strategy).eq(true);
    });
    it("deployMaticXWmaticAave3Boosted6", async () => {
      const r = await deployMaticXWmaticAave3Boosted6();
      expect(!!r.strategy).eq(true);
    });
    it("deployStMaticWMaticAave3Boosted7", async () => {
      const r = await deployStMaticWMaticAave3Boosted7();
      expect(!!r.strategy).eq(true);
    });
  });

  describe("Simulate upgrade of the strategies", () => {
    const CONTROLLER = "0x6678814c273d5088114b6e40cc49c8db04f9bc29";

    it("should upgrade all strategies and reinvest the money", async () => {
      // deploy all new strategies
      const r1 = await deploySphereWmatic1(signer);
      const r2 = await deployUsdcTetu2(signer);
      const r3 = await deployTngblUsdc3(signer);
      const r4 = await deployWUsdrUsdc4();
      const r5 = await deployBoostedTetuStables5();
      const r6 = await deployMaticXWmaticAave3Boosted6();
      const r7 = await deployStMaticWMaticAave3Boosted7();

      const controller = await IController__factory.connect(CONTROLLER, signer);
      const governanceAddress = await controller.governance();
      const governance = await DeployerUtilsLocal.impersonate(governanceAddress);
      const controllerAsGov = controller.connect(governance);
      const announcer = IAnnouncer__factory.connect(await controller.announcer(), governance);

      const vaultStateBefore = [
        await ISmartVault__factory.connect(r1.vault, signer).totalSupply(),
        await ISmartVault__factory.connect(r2.vault, signer).totalSupply(),
        await ISmartVault__factory.connect(r3.vault, signer).totalSupply(),
        await ISmartVault__factory.connect(r4.vault, signer).totalSupply(),
        await ISmartVault__factory.connect(r5.vault, signer).totalSupply(),
        await ISmartVault__factory.connect(r6.vault, signer).totalSupply(),
        await ISmartVault__factory.connect(r7.vault, signer).totalSupply(),
      ];
      const strategiesBefore = [
        await ISmartVault__factory.connect(r1.vault, signer).strategy(),
        await ISmartVault__factory.connect(r2.vault, signer).strategy(),
        await ISmartVault__factory.connect(r3.vault, signer).strategy(),
        await ISmartVault__factory.connect(r4.vault, signer).strategy(),
        await ISmartVault__factory.connect(r5.vault, signer).strategy(),
        await ISmartVault__factory.connect(r6.vault, signer).strategy(),
        await ISmartVault__factory.connect(r7.vault, signer).strategy(),
      ];
      const strategiesStateBefore = [
        await IStrategy__factory.connect(await ISmartVault__factory.connect(r1.vault, signer).strategy(), signer).investedUnderlyingBalance(),
        await IStrategy__factory.connect(await ISmartVault__factory.connect(r2.vault, signer).strategy(), signer).investedUnderlyingBalance(),
        await IStrategy__factory.connect(await ISmartVault__factory.connect(r3.vault, signer).strategy(), signer).investedUnderlyingBalance(),
        await IStrategy__factory.connect(await ISmartVault__factory.connect(r4.vault, signer).strategy(), signer).investedUnderlyingBalance(),
        await IStrategy__factory.connect(await ISmartVault__factory.connect(r5.vault, signer).strategy(), signer).investedUnderlyingBalance(),
        await IStrategy__factory.connect(await ISmartVault__factory.connect(r6.vault, signer).strategy(), signer).investedUnderlyingBalance(),
        await IStrategy__factory.connect(await ISmartVault__factory.connect(r7.vault, signer).strategy(), signer).investedUnderlyingBalance(),
      ];
      console.log("vaultStateBefore", vaultStateBefore);
      console.log("strategiesBefore", strategiesBefore);
      console.log("strategiesStateBefore", strategiesStateBefore);

      // announce strategies upgrades
      await announcer.announceStrategyUpgrades(
        [
          r1.vault,
          r2.vault,
          r3.vault,
          r4.vault,
          r5.vault,
          r6.vault,
          r7.vault,
        ], [
          r1.strategy,
          r2.strategy,
          r3.strategy,
          r4.strategy,
          r5.strategy,
          r6.strategy,
          r7.strategy
        ]
      );

      await TimeUtils.advanceBlocksOnTs(60 * 60 * 50);


      // upgrade strategies
      await controllerAsGov.setVaultStrategyBatch([
        r1.vault,
        r2.vault,
        r3.vault,
        r4.vault,
        r5.vault,
        r6.vault,
        r7.vault
      ], [
        r1.strategy,
        r2.strategy,
        r3.strategy,
        r4.strategy,
        r5.strategy,
        r6.strategy,
        r7.strategy
      ]);

      const vaultStateMiddle = [
        await ISmartVault__factory.connect(r1.vault, signer).totalSupply(),
        await ISmartVault__factory.connect(r2.vault, signer).totalSupply(),
        await ISmartVault__factory.connect(r3.vault, signer).totalSupply(),
        await ISmartVault__factory.connect(r4.vault, signer).totalSupply(),
        await ISmartVault__factory.connect(r5.vault, signer).totalSupply(),
        await ISmartVault__factory.connect(r6.vault, signer).totalSupply(),
        await ISmartVault__factory.connect(r7.vault, signer).totalSupply(),
      ];
      const strategiesStateMiddle = [
        await IStrategy__factory.connect(await ISmartVault__factory.connect(r1.vault, signer).strategy(), signer).investedUnderlyingBalance(),
        await IStrategy__factory.connect(await ISmartVault__factory.connect(r2.vault, signer).strategy(), signer).investedUnderlyingBalance(),
        await IStrategy__factory.connect(await ISmartVault__factory.connect(r3.vault, signer).strategy(), signer).investedUnderlyingBalance(),
        await IStrategy__factory.connect(await ISmartVault__factory.connect(r4.vault, signer).strategy(), signer).investedUnderlyingBalance(),
        await IStrategy__factory.connect(await ISmartVault__factory.connect(r5.vault, signer).strategy(), signer).investedUnderlyingBalance(),
        await IStrategy__factory.connect(await ISmartVault__factory.connect(r6.vault, signer).strategy(), signer).investedUnderlyingBalance(),
        await IStrategy__factory.connect(await ISmartVault__factory.connect(r7.vault, signer).strategy(), signer).investedUnderlyingBalance(),
      ];
      console.log("vaultStateMiddle", vaultStateMiddle);
      console.log("strategiesStateMiddle", strategiesStateMiddle);


      // invest amounts back from vaults to the strategies
      await (await ISmartVault__factory.connect(r1.vault, governance)).doHardWork();
      await (await ISmartVault__factory.connect(r2.vault, governance)).doHardWork();
      await (await ISmartVault__factory.connect(r3.vault, governance)).doHardWork();
      await (await ISmartVault__factory.connect(r4.vault, governance)).doHardWork();
      await (await ISmartVault__factory.connect(r5.vault, governance)).doHardWork();
      await (await ISmartVault__factory.connect(r6.vault, governance)).doHardWork();
      await (await ISmartVault__factory.connect(r7.vault, governance)).doHardWork();

      const vaultStateFinal = [
        await ISmartVault__factory.connect(r1.vault, signer).totalSupply(),
        await ISmartVault__factory.connect(r2.vault, signer).totalSupply(),
        await ISmartVault__factory.connect(r3.vault, signer).totalSupply(),
        await ISmartVault__factory.connect(r4.vault, signer).totalSupply(),
        await ISmartVault__factory.connect(r5.vault, signer).totalSupply(),
        await ISmartVault__factory.connect(r6.vault, signer).totalSupply(),
        await ISmartVault__factory.connect(r7.vault, signer).totalSupply(),
      ];
      const strategiesFinal = [
        await ISmartVault__factory.connect(r1.vault, signer).strategy(),
        await ISmartVault__factory.connect(r2.vault, signer).strategy(),
        await ISmartVault__factory.connect(r3.vault, signer).strategy(),
        await ISmartVault__factory.connect(r4.vault, signer).strategy(),
        await ISmartVault__factory.connect(r5.vault, signer).strategy(),
        await ISmartVault__factory.connect(r6.vault, signer).strategy(),
        await ISmartVault__factory.connect(r7.vault, signer).strategy(),
      ];
      const strategiesStateFinal = [
        await IStrategy__factory.connect(await ISmartVault__factory.connect(r1.vault, signer).strategy(), signer).investedUnderlyingBalance(),
        await IStrategy__factory.connect(await ISmartVault__factory.connect(r2.vault, signer).strategy(), signer).investedUnderlyingBalance(),
        await IStrategy__factory.connect(await ISmartVault__factory.connect(r3.vault, signer).strategy(), signer).investedUnderlyingBalance(),
        await IStrategy__factory.connect(await ISmartVault__factory.connect(r4.vault, signer).strategy(), signer).investedUnderlyingBalance(),
        await IStrategy__factory.connect(await ISmartVault__factory.connect(r5.vault, signer).strategy(), signer).investedUnderlyingBalance(),
        await IStrategy__factory.connect(await ISmartVault__factory.connect(r6.vault, signer).strategy(), signer).investedUnderlyingBalance(),
        await IStrategy__factory.connect(await ISmartVault__factory.connect(r7.vault, signer).strategy(), signer).investedUnderlyingBalance(),
      ];
      console.log("vaultStateFinal", vaultStateFinal);
      console.log("strategiesFinal", strategiesFinal);
      console.log("strategiesStateFinal", strategiesStateFinal);
    });
  });
});