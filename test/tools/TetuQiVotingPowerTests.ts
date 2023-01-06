import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {ethers} from "hardhat";
import {TimeUtils} from "../TimeUtils";
import {
  IBVault, IBVault__factory,
  IERC20,
  IERC20__factory, IVeTetu, IVeTetu__factory,
  TetuBalVotingPower,
  TetuBalVotingPower__factory
} from "../../typechain";
import {DeployerUtilsLocal} from "../../scripts/deploy/DeployerUtilsLocal";
import {TokenUtils} from "../TokenUtils";
import {formatUnits, parseUnits} from "ethers/lib/utils";
import {MaticAddresses} from "../../scripts/addresses/MaticAddresses";


const {expect} = chai;
chai.use(chaiAsPromised);

const VE_TETU = '0x6FB29DD17fa6E27BD112Bc3A2D0b8dae597AeDA4';
const TETU_BAL = '0x7fC9E0Aa043787BFad28e29632AdA302C790Ce33';
const TETU_BAL_BPT = MaticAddresses.BALANCER_tetuQi_QI;
const TETU_BAL_BPT_ID = MaticAddresses.BALANCER_tetuQi_QI_ID;
const BALANCER_VAULT = '0xBA12222222228d8Ba445958a75a0704d566BF2C8';

describe("TetuQiVotingPowerTests", function () {
  let snapshotBefore: string;
  let snapshot: string;
  let signer: SignerWithAddress;

  let power: TetuBalVotingPower;
  let veTetu: IVeTetu;
  let veTetuERC: IERC20;
  let bpt: IERC20;
  let tetuBal: IERC20;

  before(async function () {
    [signer] = await ethers.getSigners()
    snapshotBefore = await TimeUtils.snapshot();

    const p = await DeployerUtilsLocal.deployTetuProxyControlled(signer, 'TetuQiVotingPower');
    power = TetuBalVotingPower__factory.connect(p[0].address, signer);
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

  it.skip("test power", async () => {
    expect(await tetuBal.balanceOf(signer.address)).eq(0);
    expect(await bpt.balanceOf(signer.address)).eq(0);

    await TokenUtils.getToken(TETU_BAL, signer.address, parseUnits('0.5'))

    const tetuBalBalance = await tetuBal.balanceOf(signer.address);
    const bptTokens = await IBVault__factory.connect(BALANCER_VAULT, signer).getPoolTokens(TETU_BAL_BPT_ID);
    const bptBal = bptTokens.balances[1];

    console.log('bptBal', formatUnits(bptBal));
    console.log('tetuBalBalance', formatUnits(tetuBalBalance));

    expect(+formatUnits(await power.dxTetuPower(signer.address))).above(0.00001);
    expect(+formatUnits(await power.dxTetuPower(signer.address))).below(0.0001);
    expect(await power.tetuBalPower(signer.address)).eq(tetuBalBalance);
    expect(+formatUnits(await power.balanceOf(signer.address))).above(1.00001);
  });

  it("test veTETU power", async () => {
    const amount = await power.balanceOf('0xbbbbb8C4364eC2ce52c59D2Ed3E56F307E529a94')
    console.log(formatUnits(amount))
  });


});
