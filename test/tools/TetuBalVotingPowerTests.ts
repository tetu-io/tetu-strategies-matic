import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {ethers} from "hardhat";
import {TimeUtils} from "../TimeUtils";
import {
  IBVault, IBVault__factory,
  IERC20,
  IERC20__factory,
  TetuBalVotingPower,
  TetuBalVotingPower__factory
} from "../../typechain";
import {DeployerUtilsLocal} from "../../scripts/deploy/DeployerUtilsLocal";
import {TokenUtils} from "../TokenUtils";
import {formatUnits, parseUnits} from "ethers/lib/utils";
import {MaticAddresses} from "../../scripts/addresses/MaticAddresses";


const {expect} = chai;
chai.use(chaiAsPromised);

const DX_TETU = '0xAcEE7Bd17E7B04F7e48b29c0C91aF67758394f0f';
const TETU_BAL = '0x7fC9E0Aa043787BFad28e29632AdA302C790Ce33';
const TETU_BAL_BPT = MaticAddresses.BALANCER_POOL_tetuBAL_BPT;
const TETU_BAL_BPT_ID = MaticAddresses.BALANCER_POOL_tetuBAL_BPT_ID;
const BALANCER_VAULT = '0xBA12222222228d8Ba445958a75a0704d566BF2C8';

describe("Base Vaults tests", function () {
  let snapshotBefore: string;
  let snapshot: string;
  let signer: SignerWithAddress;

  let power: TetuBalVotingPower;
  let dxTetu: IERC20;
  let bpt: IERC20;
  let tetuBal: IERC20;

  before(async function () {
    [signer] = await ethers.getSigners()
    snapshotBefore = await TimeUtils.snapshot();

    const p = await DeployerUtilsLocal.deployTetuProxyControlled(signer, 'TetuBalVotingPower');
    power = TetuBalVotingPower__factory.connect(p[0].address, signer);
    dxTetu = IERC20__factory.connect(DX_TETU, signer)
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
    expect(await dxTetu.balanceOf(signer.address)).eq(0);
    expect(await tetuBal.balanceOf(signer.address)).eq(0);
    expect(await bpt.balanceOf(signer.address)).eq(0);

    await TokenUtils.getToken(DX_TETU, signer.address, parseUnits('1'))
    await TokenUtils.getToken(TETU_BAL, signer.address, parseUnits('0.5'))


    const dxTetuTotalSupply = await dxTetu.totalSupply();
    const tetuBalBalance = await tetuBal.balanceOf(signer.address);
    const bptTokens = await IBVault__factory.connect(BALANCER_VAULT, signer).getPoolTokens(TETU_BAL_BPT_ID);
    const bptBal = bptTokens.balances[1];

    console.log('dxTetuTotalSupply', formatUnits(dxTetuTotalSupply));
    console.log('bptBal', formatUnits(bptBal));
    console.log('tetuBalBalance', formatUnits(tetuBalBalance));

    expect(+formatUnits(await power.dxTetuPower(signer.address))).above(0.00001);
    expect(+formatUnits(await power.dxTetuPower(signer.address))).below(0.0001);
    expect(await power.tetuBalPower(signer.address)).eq(tetuBalBalance);
    expect(+formatUnits(await power.balanceOf(signer.address))).above(1.00001);
  });


});
