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

describe("RedeployBalancerStrategiesTest", () => {
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
});