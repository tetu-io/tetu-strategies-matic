import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {ethers} from "hardhat";
import {TimeUtils} from "../TimeUtils";
import {
  IBVault__factory,
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
const TETU_BAL = '0x7fC9E0Aa043787BFad28e29632AdA302C790Ce33';
const TETU_BAL_BPT = MaticAddresses.BALANCER_POOL_tetuBAL_BPT;
const TETU_BAL_BPT_ID = MaticAddresses.BALANCER_POOL_tetuBAL_BPT_ID;
const BALANCER_VAULT = '0xBA12222222228d8Ba445958a75a0704d566BF2C8';
const POL_VOTER = '0x6672A074B98A7585A8549356F97dB02f9416849E';

describe("TetuBalVotingPowerTests", function () {
  let snapshotBefore: string;
  let snapshot: string;
  let signer: SignerWithAddress;
  let gov: SignerWithAddress;
  let core: CoreAddresses;

  let power: TetuBalVotingPower;
  let veTetu: IVeTetu;
  let veTetuERC: IERC20;
  let bpt: IERC20;
  let tetuBal: IERC20;

  before(async function () {
    [signer] = await ethers.getSigners()
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

  it("test power", async () => {
    expect(await tetuBal.balanceOf(signer.address)).eq(0);
    expect(await bpt.balanceOf(signer.address)).eq(0);

    await TokenUtils.getToken(TETU_BAL, signer.address, parseUnits('0.5'))
    await TokenUtils.getToken(MaticAddresses.BALANCER_TETU_USDC, signer.address, parseUnits('1000'))

    await TokenUtils.approve(MaticAddresses.BALANCER_TETU_USDC, signer, VE_TETU, Misc.MAX_UINT)
    await IVeTetu__factory.connect(VE_TETU, signer).createLockFor(MaticAddresses.BALANCER_TETU_USDC, parseUnits('1000'), 60 * 60 * 24 * 90, signer.address);

    const tetuBalBalance = await tetuBal.balanceOf(signer.address);
    const bptTokens = await IBVault__factory.connect(BALANCER_VAULT, signer).getPoolTokens(TETU_BAL_BPT_ID);
    const bptBal = bptTokens.balances[1];

    console.log('bptBal', formatUnits(bptBal));
    console.log('tetuBalBalance', formatUnits(tetuBalBalance));


    expect(await power.tetuBalPower(signer.address)).eq(tetuBalBalance);

    const userVeTetuPower = +formatUnits(await power.veTetuPower(signer.address));
    console.log('userVeTetuPower', userVeTetuPower);
    expect(userVeTetuPower).approximately(4.523841344729467, 0.000001);

    const userPowerWithoutCut = +formatUnits(await power.balanceOf(signer.address));
    console.log('userPowerWithoutCut', userPowerWithoutCut);
    expect(userPowerWithoutCut).eq(userVeTetuPower + +formatUnits(tetuBalBalance));


    const polVoterPowerBeforeCute = +formatUnits(await power.balanceOf(POL_VOTER));
    console.log('polVoterPowerBeforeCute', polVoterPowerBeforeCute);

    await power.connect(gov).setVeTetuPowerCut(20);
    const userPower = +formatUnits(await power.balanceOf(signer.address));
    console.log('userPower', userPower);
    expect(userPower).approximately((userVeTetuPower * 0.8) + +formatUnits(tetuBalBalance), 0.00001);

    const polVoterPower = +formatUnits(await power.balanceOf(POL_VOTER));
    console.log('polVoterPower', polVoterPower);
  });

  it("test veTETU power", async () => {
    const amount = await power.veTetuPower('0xbbbbb8C4364eC2ce52c59D2Ed3E56F307E529a94')
    console.log(formatUnits(amount))
  });


});
