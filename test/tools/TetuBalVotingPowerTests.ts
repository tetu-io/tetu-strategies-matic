import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {ethers} from "hardhat";
import {TimeUtils} from "../TimeUtils";
import {
  IERC20,
  IERC20__factory,
  IVeTetu,
  IVeTetu__factory,
  TetuBalVotingPower,
  TetuBalVotingPower__factory
} from "../../typechain";
import {DeployerUtilsLocal} from "../../scripts/deploy/DeployerUtilsLocal";
import {TokenUtils} from "../TokenUtils";
import {formatUnits, parseUnits} from "ethers/lib/utils";
import {MaticAddresses} from "../../scripts/addresses/MaticAddresses";
import {CoreAddresses} from "../../scripts/models/CoreAddresses";
import {Misc} from "../../scripts/utils/tools/Misc";


const {expect} = chai;
chai.use(chaiAsPromised);


const VE_TETU = '0x6FB29DD17fa6E27BD112Bc3A2D0b8dae597AeDA4';
const TETU_BAL = MaticAddresses.tetuBAL;
const TETU_BAL_BPT = MaticAddresses.BALANCER_POOL_tetuBAL_BPT;
const TETU_BAL_BPT_ID = MaticAddresses.BALANCER_POOL_tetuBAL_BPT_ID;
const BALANCER_VAULT = '0xBA12222222228d8Ba445958a75a0704d566BF2C8';

describe("TetuBalVotingPowerTests", function () {
  let snapshotBefore: string;
  let snapshot: string;
  let signer: SignerWithAddress;
  let gov: SignerWithAddress;
  let pol: SignerWithAddress;
  let core: CoreAddresses;

  let power: TetuBalVotingPower;
  let veTetu: IVeTetu;
  let veTetuERC: IERC20;
  let bpt: IERC20;
  let tetuBal: IERC20;

  before(async function () {
    [signer, pol] = await ethers.getSigners()
    gov = await DeployerUtilsLocal.impersonate()
    snapshotBefore = await TimeUtils.snapshot();

    core = await DeployerUtilsLocal.getCoreAddresses();

    const p = await DeployerUtilsLocal.deployTetuProxyControlled(signer, 'TetuBalVotingPower');
    power = TetuBalVotingPower__factory.connect(p[0].address, signer);
    await power.initialize(core.controller)
    veTetu = IVeTetu__factory.connect(VE_TETU, signer)
    veTetuERC = IERC20__factory.connect(VE_TETU, signer)
    bpt = IERC20__factory.connect(TETU_BAL_BPT, signer)
    tetuBal = IERC20__factory.connect(TETU_BAL, signer)
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

  it("test power as is", async () => {
    await check(
      signer,
      pol,
      gov,
      power,
      bpt,
      tetuBal,
    )
  });

  it("test power without cut", async () => {
    const total = +formatUnits(await tetuBal.totalSupply());
    await TokenUtils.getToken(TETU_BAL, BALANCER_VAULT, parseUnits((total * 0.15).toFixed()))

    await check(
      signer,
      pol,
      gov,
      power,
      bpt,
      tetuBal,
    )
  });

  it("test power with partially cut", async () => {
    const total = +formatUnits(await tetuBal.totalSupply());
    await TokenUtils.getToken(TETU_BAL, BALANCER_VAULT, parseUnits((total * 0.07).toFixed()))

    await check(
      signer,
      pol,
      gov,
      power,
      bpt,
      tetuBal,
    )
  });

  it("check total power", async () => {
    await power.connect(gov).setXtetuBalBriber(pol.address);

    const delegated = new Set([

      BALANCER_VAULT.toLowerCase(),
    ])

    const topHolders = [
      '0x36cc7b13029b5dee4034745fb4f24034f3f2ffc6', // humpy
      '0xdade618e95f5e51198c69ba0a9cc3033874fa643'.toLowerCase(), // xtetuBAL strategy
      pol.address, // briber
      '0xcbb90e432be81d9fdd6384412118b7dba57f29ba',
      '0x252812c33b9f13ffcb64564797231d755495a6a5',
      '0xe2e3fce1b7712c0faba08e72990b5094c666ef5c',
      '0xe8c95b6dcacf93c6d1459949bfe932143a6ca50c',
    ]

    let powerSum = 0;
    for (const h of topHolders) {
      if (delegated.has(h.toLowerCase())) {
        continue;
      }
      powerSum += (+formatUnits(await power.balanceOf(h)));
    }

    const total = +formatUnits(await tetuBal.totalSupply());

    expect(powerSum).approximately(total, total * 0.02);
    expect(powerSum).lte(total);

  });

  // it("test veTETU power", async () => {
  //   await power.connect(gov).setVeTetuPowerCut(20);
  //   const amount = await power.balanceOf('0xbbbbb8C4364eC2ce52c59D2Ed3E56F307E529a94')
  //   console.log(formatUnits(amount))
  //   expect(amount).eq(0);
  // });


});


async function check(
  signer: SignerWithAddress,
  pol: SignerWithAddress,
  gov: SignerWithAddress,
  power: TetuBalVotingPower,
  bpt: IERC20,
  tetuBal: IERC20,
) {
  expect(await tetuBal.balanceOf(signer.address)).eq(0);
  expect(await bpt.balanceOf(signer.address)).eq(0);

  await TokenUtils.getToken(TETU_BAL, signer.address, parseUnits('0.5'))
  await TokenUtils.getToken(MaticAddresses.BALANCER_TETU_USDC, signer.address, parseUnits('1000'))

  await TokenUtils.approve(MaticAddresses.BALANCER_TETU_USDC, signer, VE_TETU, Misc.MAX_UINT)
  await IVeTetu__factory.connect(VE_TETU, signer).createLockFor(MaticAddresses.BALANCER_TETU_USDC, parseUnits('1000'), 60 * 60 * 24 * 90, signer.address);

  const total = +formatUnits(await tetuBal.totalSupply());
  const tetuBalBalance = +formatUnits(await tetuBal.balanceOf(signer.address));
  const balancerTetuBal = +formatUnits(await tetuBal.balanceOf(BALANCER_VAULT));
  const tetuBalReducing = +formatUnits(await power.tetuBalReducing());
  const p1 = +formatUnits(await power.tetuBalPower(signer.address));

  console.log('total', total);
  console.log('balancerTetuBal', balancerTetuBal);
  console.log('tetuBalBalance', tetuBalBalance);
  console.log('tetuBalReducing', tetuBalReducing);
  console.log('p1', p1);

  expect(p1).eq(tetuBalBalance * (1 - tetuBalReducing));

  expect((await power.balanceOf(pol.address)).isZero()).eq(true);
  await power.connect(gov).setXtetuBalBriber(pol.address);
  const polPower = +formatUnits(await power.balanceOf(pol.address));
  console.log('polPower', polPower);
  expect(polPower).lte(total * 0.30);
  expect(polPower).approximately(balancerTetuBal + ((total - balancerTetuBal) * tetuBalReducing), 0.0001);
}
