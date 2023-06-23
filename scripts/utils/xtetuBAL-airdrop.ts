import {DeployerUtilsLocal} from "../deploy/DeployerUtilsLocal";
import {Misc} from "./tools/Misc";
import {ethers} from "hardhat";
import {MaticAddresses} from "../addresses/MaticAddresses";
import {
  IERC20__factory,
  ISmartVault__factory,
  TetuBalVotingPower__factory,
  XtetuBALDistributor__factory
} from "../../typechain";
import {formatUnits, parseUnits} from "ethers/lib/utils";
import {Web3Utils} from "./tools/Web3Utils";
import {TransferEvent} from "../../typechain/IERC20";
import {BigNumber} from "ethers";
import {RunHelper} from "./tools/RunHelper";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {getSnapshotVoters} from "./tools/voting-utils";
import {expect} from "chai";

// After airdrop receiving from all sources you need to liquidate all tokens to USDC
// Then launch this script on hardhat network and make sure that you have enough tokens.
// If you need xtetuBAL for distribute you will keep some USDC for perform buybacks and send xtetuBAL from remaining balance. If not enough - buyback right now, otherwise perform buybacks more wisly.
// After that send USDC and xtetuBAL tokens to EOA who will call this script.
// The POL holder will receive back some USDC - it is fine, we should distribute the whole amount throught distributor for properly calc TVL.
// This received USDC will be used for tetuBAL buybacks.

// ------------------ CHANGE ME ----------------------------

// MAKE SURE YOUR LOCAL SNAPSHOT BLOCK IS ACTUAL!
// the last snapshot https://snapshot.org/#/tetubal.eth
const PROPOSAL_ID = '0x7e0a1851b24e9d39f4600125b5c04bfad02873dc7fa6398c493bb6e33e51d96f';
// USDC amount received from all bribes
const USDC_AMOUNT = 6278;

// ----------------------------------------------
const xtetuBALPerfFee = 0.85;
const tetuBALPower = '0x8FFBa974Efa7C262C97b9521449Fd2B3c69bE4E6'.toLowerCase();
const POL_OWNER = '0x6672a074b98a7585a8549356f97db02f9416849e'.toLowerCase();
const DISTRIBUTOR = '0x6DdD4dB035FC15F90D74C1E98ABa967D6b3Ce3Dd';
const X_TETU_BAL_STRATEGY = '0xdade618E95F5E51198c69bA0A9CC3033874Fa643';

async function main() {

  let signer: SignerWithAddress;
  if (Misc.getChainName() === 'hardhat') {
    signer = await DeployerUtilsLocal.impersonate('0xbbbbb8c4364ec2ce52c59d2ed3e56f307e529a94');

    const distributorGov = XtetuBALDistributor__factory.connect('0x6DdD4dB035FC15F90D74C1E98ABa967D6b3Ce3Dd', await DeployerUtilsLocal.impersonate());
    await distributorGov.changeOperatorStatus(signer.address, true);
  } else {
    signer = (await ethers.getSigners())[0];
  }

  // --------- collect proposal data

  const snapshotData = await getSnapshotVoters(PROPOSAL_ID, POL_OWNER);
  console.log('PROPOSAL DATA', snapshotData.proposal.title);
  const curDate = Math.floor(new Date().getTime() / 1000);
  const sinceProposal = (curDate - +snapshotData.created);
  console.log('sinceProposal days', sinceProposal / 60 / 60 / 24);
  if (sinceProposal > 8 * 60 * 60 * 24) throw new Error('Wrong proposal');
  const votedPower = snapshotData.vp;
  console.log('PROPOSAL votedPower', votedPower);

  const BLOCK = +snapshotData.proposal.snapshot;
  console.log('BLOCK', BLOCK);

  // ----------------

  const tools = await DeployerUtilsLocal.getToolsAddressesWrapper(signer);

  const xtetuBalPrice = await tools.calculator.getPriceWithDefaultOutput(MaticAddresses.xtetuBAL_TOKEN, {blockTag: BLOCK});
  const xtetuBalTVL = await ISmartVault__factory.connect(MaticAddresses.xtetuBAL_TOKEN, signer).underlyingBalanceWithInvestment({blockTag: BLOCK});
  const xtetuBalTVLUSD = +formatUnits(xtetuBalPrice.mul(xtetuBalTVL), 36);

  const distributor = XtetuBALDistributor__factory.connect(DISTRIBUTOR, signer);
  const usersBalance = await collectUsers(BLOCK);

  const usersForUSDC: string[] = [];
  const usersForUSDCAmounts: BigNumber[] = [];
  const usersForXtetuBAL: string[] = [];
  const usersForXtetuBALAmounts: BigNumber[] = [];
  let amountForBuyingTetuBal = 0;
  let usdcAmountForDistributing = 0;
  let xtetuBalAmountForDistributing = 0;

  const power = TetuBalVotingPower__factory.connect(tetuBALPower, signer);
  const xtetuBALStrategyPower = await power.balanceOf(X_TETU_BAL_STRATEGY, {blockTag: BLOCK});
  console.log('X_TETU_BAL_STRATEGY power', formatUnits(xtetuBALStrategyPower));

  const veTETUCut = +formatUnits(xtetuBALStrategyPower) / +votedPower
  console.log('veTETUCut', veTETUCut);

  const usdcFromStrategy = USDC_AMOUNT * veTETUCut;
  console.log('Received from votes from strategy: ', usdcFromStrategy)
  const usdcForDistribute = usdcFromStrategy * xtetuBALPerfFee;
  console.log('Pure USDC to distribute: ', usdcForDistribute);

  for (const [user, amount] of usersBalance) {
    const userRatio = amount / +formatUnits(xtetuBalTVL);
    const isUseXtetuBal = await distributor.useXtetuBal(user);

    const usdcAmountForUser = usdcForDistribute * userRatio;

    if (isUseXtetuBal) {
      usersForXtetuBAL.push(user);
      const a = usdcAmountForUser / +formatUnits(xtetuBalPrice);
      xtetuBalAmountForDistributing += a;
      // console.log('xtetuBAL => ', user, a);
      usersForXtetuBALAmounts.push(parseUnits(a.toFixed(18)));
      amountForBuyingTetuBal += usdcAmountForUser;
    } else {
      // console.log('USDC => ', user, usdcAmountForUser);
      usersForUSDC.push(user);
      usersForUSDCAmounts.push(parseUnits(usdcAmountForUser.toFixed(6), 6));
      usdcAmountForDistributing += usdcAmountForUser;
    }
  }

  console.log('xtetuBal vault TVL at the moment of snapshot:', xtetuBalTVLUSD);

  console.log('>>> USDC to distribute: ', usdcAmountForDistributing);
  console.log('>>> xtetuBal to distribute', xtetuBalAmountForDistributing);

  console.log(`Need to buy TetuBal on ${amountForBuyingTetuBal}$`);


  const balanceXtetuBal = await IERC20__factory.connect(MaticAddresses.xtetuBAL_TOKEN, signer).balanceOf(signer.address);
  const balanceUSDC = await IERC20__factory.connect(MaticAddresses.USDC_TOKEN, signer).balanceOf(signer.address);

  console.log('balanceXtetuBal', +formatUnits(balanceXtetuBal));
  console.log('balanceUSDC', +formatUnits(balanceUSDC, 6));

  const usdcAllowance = await IERC20__factory.connect(MaticAddresses.USDC_TOKEN, signer).allowance(signer.address, distributor.address);
  const xtetuBALAllowance = await IERC20__factory.connect(MaticAddresses.xtetuBAL_TOKEN, signer).allowance(signer.address, distributor.address);

  if (usdcAllowance.lt(parseUnits(usdcAmountForDistributing.toFixed(6), 6))) {
    console.log('APPROVE USDC', usdcAmountForDistributing);
    await RunHelper.runAndWait(() =>
      IERC20__factory.connect(MaticAddresses.USDC_TOKEN, signer)
        .approve(
          distributor.address,
          parseUnits((usdcAmountForDistributing + 1).toFixed(6), 6)
        )
    );
  }

  if (xtetuBALAllowance.lt(parseUnits((xtetuBalAmountForDistributing + 1).toFixed(18)))) {
    console.log('APPROVE xtetuBAL', xtetuBalAmountForDistributing);
    await RunHelper.runAndWait(() => IERC20__factory.connect(MaticAddresses.xtetuBAL_TOKEN, signer).approve(
        distributor.address,
        parseUnits((xtetuBalAmountForDistributing + 1).toFixed(18)).add(1)
      )
    );
  }

  /// remove later
  // const gov = await DeployerUtilsLocal.impersonate();
  // const newLogic = await DeployerUtilsLocal.deployContract(gov, 'XtetuBALDistributor')
  // const core = await DeployerUtilsLocal.getCoreAddressesWrapper(gov);
  // await core.announcer.announceTetuProxyUpgrade(distributor.address, newLogic.address);
  // await TimeUtils.advanceBlocksOnTs(60 * 60 * 24 * 2);
  // await core.controller.upgradeTetuProxyBatch([distributor.address], [newLogic.address]);
  //////////////////////

  if (
    balanceUSDC.gte(parseUnits(usdcAmountForDistributing.toFixed(6), 6))
    && balanceXtetuBal.gte(parseUnits((xtetuBalAmountForDistributing).toFixed(18)))
  ) {
    await RunHelper.runAndWait(() => distributor.distribute(
      usersForUSDC,
      usersForUSDCAmounts,
      usersForXtetuBAL,
      usersForXtetuBALAmounts,
      parseUnits(xtetuBalTVLUSD.toFixed(18))
    ));

    // 1.640059157153047501
    const apr = formatUnits(await distributor.lastAPR());
    console.log('APR', apr);
    expect(+apr).is.greaterThan(10);
    expect(+apr).is.lessThan(30);

  } else {
    console.error('not enough tokens');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });


async function collectUsers(block: number) {
  const logs = await Web3Utils.parseLogs(
    [MaticAddresses.xtetuBAL_TOKEN],
    [IERC20__factory.createInterface().getEventTopic('Transfer')],
    41527426,
    block
  );

  console.log('logs', logs.length);

  const balances = new Map<string, number>();

  for (const log of logs) {
    const transfer = IERC20__factory.createInterface().parseLog(log) as unknown as TransferEvent;

    // console.log('transfer', transfer);

    balances.set(transfer.args.from, (balances.get(transfer.args.from) ?? 0) - +formatUnits(transfer.args.value));
    balances.set(transfer.args.to, (balances.get(transfer.args.to) ?? 0) + +formatUnits(transfer.args.value));
  }

  balances.delete(MaticAddresses.xtetuBAL_TOKEN);
  balances.delete(Misc.ZERO_ADDRESS);

  const result = new Map<string, number>();

  for (const acc of balances.keys()) {
    const actualBalance = await IERC20__factory.connect(MaticAddresses.xtetuBAL_TOKEN, ethers.provider).balanceOf(acc, {blockTag: block});
    if (+formatUnits(actualBalance) !== balances.get(acc)) {
      console.error('actual balance', acc, balances.get(acc), '!==', +formatUnits(actualBalance));
    }
    result.set(acc, +formatUnits(actualBalance));
  }

  return result;
}
