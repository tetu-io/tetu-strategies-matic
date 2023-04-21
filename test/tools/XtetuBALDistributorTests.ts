import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {ethers} from "hardhat";
import {TimeUtils} from "../TimeUtils";
import {
  IERC20Extended,
  IERC20Extended__factory,
  XtetuBALDistributor,
  XtetuBALDistributor__factory
} from "../../typechain";
import {DeployerUtilsLocal} from "../../scripts/deploy/DeployerUtilsLocal";
import {CoreAddresses} from "../../scripts/models/CoreAddresses";
import {MaticAddresses} from "../../scripts/addresses/MaticAddresses";
import {TokenUtils} from "../TokenUtils";
import {formatUnits, parseUnits} from "ethers/lib/utils";
import {Misc} from "../../scripts/utils/tools/Misc";


const {expect} = chai;
chai.use(chaiAsPromised);

describe("XtetuBALDistributorTests", function () {
  let snapshotBefore: string;
  let snapshot: string;
  let signer: SignerWithAddress;
  let signer2: SignerWithAddress;
  let gov: SignerWithAddress;
  let core: CoreAddresses;

  let distributor: XtetuBALDistributor;
  let usdc: IERC20Extended;
  let xtetuBAL: IERC20Extended;

  before(async function () {
    [signer, signer2] = await ethers.getSigners()
    gov = await DeployerUtilsLocal.impersonate()
    snapshotBefore = await TimeUtils.snapshot();

    core = await DeployerUtilsLocal.getCoreAddresses();

    const p = await DeployerUtilsLocal.deployTetuProxyControlled(signer, 'XtetuBALDistributor');
    distributor = XtetuBALDistributor__factory.connect(p[0].address, signer);
    await distributor.initialize(core.controller)

    usdc = IERC20Extended__factory.connect(MaticAddresses.USDC_TOKEN, signer);
    xtetuBAL = IERC20Extended__factory.connect(MaticAddresses.xtetuBAL_TOKEN, signer);

    await TokenUtils.getToken(usdc.address, signer.address, parseUnits('100000', 6));
    await TokenUtils.getToken(xtetuBAL.address, signer.address, parseUnits('100'));

    await usdc.approve(distributor.address, Misc.MAX_UINT);
    await xtetuBAL.approve(distributor.address, Misc.MAX_UINT);

    await distributor.connect(gov).changeOperatorStatus(signer.address, true);
  });

  after(async function () {
    await TimeUtils.rollback(snapshotBefore);
  });

  beforeEach(async function () {
    snapshot = await TimeUtils.snapshot();
  });

  afterEach(async function () {
    await TimeUtils.rollback(snapshot);
  });

  it("test distribute", async () => {

    const r1 = '0x00000000000000000010c000b000000000000001';
    const r2 = '0x00000000000000000010c000b000000000000002';
    const r3 = '0x00000000000000000010c000b000000000000003';
    const r4 = '0x00000000000000000010c000b000000000000004';

    await distributor.distribute(
      [r1, r2],
      [parseUnits('100', 6), parseUnits('200', 6)],
      [r2, r3, r4],
      [parseUnits('2'), parseUnits('3'), parseUnits('4')],
      parseUnits('10000')
    );

    expect(await usdc.balanceOf(r1)).to.be.eq(parseUnits('100', 6));
    expect(await usdc.balanceOf(r2)).to.be.eq(parseUnits('200', 6));

    expect(await xtetuBAL.balanceOf(r2)).to.be.eq(parseUnits('2'));
    expect(await xtetuBAL.balanceOf(r3)).to.be.eq(parseUnits('3'));
    expect(await xtetuBAL.balanceOf(r4)).to.be.eq(parseUnits('4'));

    let epochCounter = (await distributor.epochCounter()).toNumber();
    expect(epochCounter).to.be.eq(1);


    const epochTS = await distributor.epochTS(epochCounter);
    const epochAPR = await distributor.epochAPR(epochCounter);
    const epochDistributedUSD = await distributor.epochDistributedUSD(epochCounter);
    const epochTVLUSD = await distributor.epochTVLUSD(epochCounter);

    console.log(`Distribution:
    epochTS: ${epochTS}
    epochAPR: ${formatUnits(epochAPR)}
    epochDistributedUSD: ${formatUnits(epochDistributedUSD)}
    epochTVLUSD: ${formatUnits(epochTVLUSD)}
    `)

    expect(epochTS).to.be.gt(0);
    expect(epochAPR).to.be.gt(0);
    expect(epochDistributedUSD).to.be.gt(0);
    expect(epochTVLUSD).to.be.eq(parseUnits('10000'));

    await expect(distributor.distribute([], [], [], [], 0)).revertedWith("!TIME");

    await TimeUtils.advanceBlocksOnTs(60 * 60 * 24 * 14);

    await distributor.distribute(
      [r1, r2],
      [parseUnits('200', 6), parseUnits('300', 6)],
      [r2, r3, r4],
      [parseUnits('3'), parseUnits('4'), parseUnits('5')],
      parseUnits('10000')
    );

    epochCounter = (await distributor.epochCounter()).toNumber();
    expect(epochCounter).to.be.eq(2);

    const epochTS2 = await distributor.epochTS(epochCounter);
    const epochAPR2 = await distributor.epochAPR(epochCounter);
    const epochDistributedUSD2 = await distributor.epochDistributedUSD(epochCounter);
    const epochTVLUSD2 = await distributor.epochTVLUSD(epochCounter);

    console.log(`Distribution 2:
    epochTS: ${epochTS2}
    epochAPR: ${formatUnits(epochAPR2)}
    epochDistributedUSD: ${formatUnits(epochDistributedUSD2)}
    epochTVLUSD: ${formatUnits(epochTVLUSD2)}
    `)

    expect(epochTS2).to.be.gt(0);
    expect(epochAPR2).to.be.gt(0);
    expect(epochDistributedUSD2).to.be.gt(0);
    expect(epochTVLUSD2).to.be.eq(parseUnits('10000'));


    await distributor.setEpochMeta(
      epochCounter,
      epochTS2,
      parseUnits('100'),
      parseUnits('10000')
    );

    console.log('lastAPR', formatUnits(await distributor.lastAPR()))

  });


});
