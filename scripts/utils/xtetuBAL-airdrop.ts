import {DeployerUtilsLocal} from "../deploy/DeployerUtilsLocal";
import {Misc} from "./tools/Misc";
import {ethers} from "hardhat";
import {MaticAddresses} from "../addresses/MaticAddresses";
import {
  ERC20__factory,
  IERC20__factory,
  ISmartVault__factory, Multicall__factory,
  TetuBalVotingPower__factory,
  XtetuBALDistributor__factory,
} from '../../typechain';
import {formatUnits, parseUnits} from "ethers/lib/utils";
import {Web3Utils} from "./tools/Web3Utils";
import {BigNumber} from "ethers";
import {RunHelper} from "./tools/RunHelper";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {getPawnshopData, getSnapshotVoters} from "./tools/voting-utils";
import {expect} from "chai";
import {TransferEvent} from "../../typechain/contracts/third_party/IERC20Extended";
import { getAllUserBalanceByBlock } from '../graphql/graph-service';
import { UserBalanceHistoryEntity } from '../../generated/gql';
import { Addresses } from '../../addresses';

// After airdrop receiving from all sources you need to liquidate all tokens to USDC
// USDC should be on the dedicated msig - send it to BRIBER address
// Then launch this script on hardhat network.
// If you need xtetuBAL for distribute you will keep some USDC for perform buybacks and send xtetuBAL from remaining balance. If not enough - buyback right now, otherwise perform buybacks more wisly.
// After that send USDC and xtetuBAL tokens to EOA who will call this script.
// The POL holder will receive back some USDC - it is fine, we should distribute the whole amount throught distributor for properly calc TVL.
// This received USDC will be used for tetuBAL buybacks.
//
// veTETU part is another amount that should be added to tUSDC bribes on v2 (can be done after xtetuBAL distribution).

// ------------------ CHANGE ME ----------------------------

// MAKE SURE YOUR LOCAL SNAPSHOT BLOCK IS ACTUAL!
// the last snapshot https://snapshot.org/#/tetubal.eth
const PROPOSAL_ID = '0x4dc14ecac7137c2c4b186c562e7987a73627ad1ef83f71590c3685622cfbc45e';
// USDC amount received from all bribes
const USDC_AMOUNT = 35602;
// % of USDC amount that will be transfer as TETU tokens. calc it depending on protocol pools bribes where we used TETU as bribes.
const TETU_RATIO = Number(1);

// ----------------------------------------------
const xtetuBALPerfFee = 0.95;
const tetuBALPower = '0x8FFBa974Efa7C262C97b9521449Fd2B3c69bE4E6'.toLowerCase();
const POL_OWNER = '0x6672a074b98a7585a8549356f97db02f9416849e'.toLowerCase();
const DISTRIBUTOR = '0x6A5938e635C6AAada7c398b3EDc40e924B323D9F'; // 0x6DdD4dB035FC15F90D74C1E98ABa967D6b3Ce3Dd
const X_TETU_BAL_STRATEGY = '0xdade618E95F5E51198c69bA0A9CC3033874Fa643';
const TETU_BAL_HOLDER = '0x237114Ef61b27fdF57132e6c8C4244eeea8323D3';
const PAWNSHOP = '0x0c9FA52D7Ed12a6316d3738c80931eCbC6C49907';
const BRIBE_DISTRIBUTOR = '0xd1f8b86EfBA4bCEB0E2434337F2d504087F6C4d0';

const VALIDATE_USER_BALANCE_ON_CHAIN = process.env.TETU_VALIDATE_USER_BALANCE_ON_CHAIN === 'true';
const VALIDATE_TOTAL_SUPPLY = process.env.TETU_VALIDATE_TOTAL_SUPPLY === 'true';

async function main() {
  let signer: SignerWithAddress;
  if (Misc.getChainName() === 'hardhat') {
    signer = await DeployerUtilsLocal.impersonate('0xbbbbb8c4364ec2ce52c59d2ed3e56f307e529a94');

    // const distributorGov = XtetuBALDistributor__factory.connect(DISTRIBUTOR, await DeployerUtilsLocal.impersonate());
    // await distributorGov.changeOperatorStatus(signer.address, true);
  } else {
    signer = (await ethers.getSigners())[0];
  }

  // --------- collect proposal data

  const snapshotData = await getSnapshotVoters(PROPOSAL_ID, POL_OWNER);
  console.log('PROPOSAL DATA', snapshotData.proposal.title);
  const curDate = Math.floor(new Date().getTime() / 1000);
  const sinceProposal = (curDate - +snapshotData.created);
  console.log('sinceProposal days', sinceProposal / 60 / 60 / 24);
  if (sinceProposal > 17 * 60 * 60 * 24) throw new Error('Wrong proposal');
  const votedPower = snapshotData.vp;
  console.log('PROPOSAL votedPower', votedPower);

  const BLOCK = +snapshotData.proposal.snapshot;
  console.log('BLOCK', BLOCK);

  // --------- collect proposal data

  const pawnshopData = await getPawnshopData(BLOCK);
  let expectedPawnshopPower = 0;
  for (const pos of pawnshopData) {
    expectedPawnshopPower += +formatUnits(pos.collateral.collateralAmount);
  }

  // ----------------

  const tools = await DeployerUtilsLocal.getToolsAddressesWrapper(signer);

  const xtetuBalPrice = await tools.calculator.getPriceWithDefaultOutput(MaticAddresses.xtetuBAL_TOKEN, {blockTag: BLOCK});
  const tetuPrice = await tools.calculator.getPriceWithDefaultOutput(MaticAddresses.TETU_TOKEN, /*{blockTag: BLOCK}*/); // use actual price
  const xtetuBalTVL = await ISmartVault__factory.connect(MaticAddresses.xtetuBAL_TOKEN, signer).underlyingBalanceWithInvestment({blockTag: BLOCK});
  const xtetuBalTVLUSD = +formatUnits(xtetuBalPrice.mul(xtetuBalTVL), 36);
  console.log('tetuPrice', +formatUnits(tetuPrice));

  const distributor = XtetuBALDistributor__factory.connect(DISTRIBUTOR, signer);

  const usersForUSDC: string[] = [];
  const usersForUSDCAmounts: BigNumber[] = [];
  const usersForXtetuBAL: string[] = [];
  const usersForXtetuBALAmounts: BigNumber[] = [];
  const usersForTetu: string[] = [];
  const usersForTetuAmounts: BigNumber[] = [];
  let amountForBuyingTetuBal = 0;
  let usdcAmountForDistributing = 0;
  let tetuAmountForDistributing = 0;
  let xtetuBalAmountForDistributing = 0;

  const power = TetuBalVotingPower__factory.connect(tetuBALPower, signer);
  const xtetuBALStrategyPower = await power.balanceOf(X_TETU_BAL_STRATEGY, {blockTag: BLOCK});
  console.log('X_TETU_BAL_STRATEGY power', +formatUnits(xtetuBALStrategyPower));


  const tetuBalReducing = +formatUnits(await power.tetuBalReducing({blockTag: BLOCK}));
  console.log('tetuBalReducing power', tetuBalReducing);

  expectedPawnshopPower = expectedPawnshopPower * (1 - tetuBalReducing);

  const tetuBalTotalSupply = +formatUnits(await power.totalSupply({blockTag: BLOCK}));
  console.log('tetuBalTotalSupply', tetuBalTotalSupply);

  const tetuBalInBalancer = +formatUnits(await power.tetuBalInBalancer({blockTag: BLOCK}));
  const tetuBalHolderPower = +formatUnits(await power.balanceOf(TETU_BAL_HOLDER, {blockTag: BLOCK}));
  const pawnshopPower = +formatUnits(await power.balanceOf(PAWNSHOP, {blockTag: BLOCK}));
  console.log('briber delegated power for veTETU(tetuBAL balance in the balancer vault)', tetuBalInBalancer);
  console.log('tetuBalHolderPower', tetuBalHolderPower);
  console.log('pawnshopPower', pawnshopPower);
  expect(pawnshopPower).is.eq(expectedPawnshopPower);

  const totalPureTetuBal = tetuBalTotalSupply - tetuBalInBalancer;
  const extraFromTetuBalCut = totalPureTetuBal * tetuBalReducing;
  console.log('totalPureTetuBal', totalPureTetuBal);
  console.log('extraFromTetuBalCut', extraFromTetuBalCut);

  const expectedStrategyRatio = (+votedPower - tetuBalInBalancer - tetuBalHolderPower - pawnshopPower - extraFromTetuBalCut) / votedPower;
  console.log('expectedStrategyRatio', expectedStrategyRatio);

  const xtetuBalStrategyRatio = +formatUnits(xtetuBALStrategyPower) / +votedPower
  console.log('xtetuBalStrategyRatio', xtetuBalStrategyRatio);
  // the difference could be from other delegations, need to check the reason
  expect(xtetuBalStrategyRatio).is.approximately(expectedStrategyRatio, 0.000001);

  const usdcFromStrategy = USDC_AMOUNT * xtetuBalStrategyRatio;
  console.log('Received from votes from strategy: ', usdcFromStrategy)

  const pawnshopRatio = pawnshopPower / +votedPower;
  console.log('pawnshopRatio', pawnshopRatio);

  const usdcFromPawnshop = USDC_AMOUNT * pawnshopRatio;
  console.log('Received from votes from pawnshop: ', usdcFromPawnshop)

  const extraFromTetuBalCutRatio = extraFromTetuBalCut / +votedPower;
  console.log('extraFromTetuBalCutRatio', extraFromTetuBalCutRatio);

  const usdcFromTetuBalCut = USDC_AMOUNT * extraFromTetuBalCutRatio;
  console.log('Received from votes from the cut: ', usdcFromTetuBalCut)
  console.log('>>> cut for adding liquidity', usdcFromTetuBalCut / 2)

  const veTETUPart = USDC_AMOUNT - usdcFromStrategy - usdcFromPawnshop - (usdcFromTetuBalCut / 2);
  const veTetuPartOfTetu = (veTETUPart * TETU_RATIO) / +formatUnits(tetuPrice);
  console.log(`>>> veTETU $ part of rewards(add as bribes on v2) ${veTETUPart - (veTETUPart * TETU_RATIO)} USDC and ${veTetuPartOfTetu} TETU}`);

  const usdcForDistribute = usdcFromStrategy * xtetuBALPerfFee;
  const usdcPerfFee = usdcFromStrategy - usdcForDistribute;
  console.log('Pure USDC to distribute: ', usdcForDistribute);
  console.log('usdc Perf Fee', usdcPerfFee);

  const usdcForDistributePS = usdcFromPawnshop * xtetuBALPerfFee;
  const usdcPerfFeePS = usdcFromPawnshop - usdcForDistributePS;
  console.log('Pure USDC to distribute PS: ', usdcForDistributePS);
  console.log('usdc Perf Fee PS', usdcPerfFeePS);

  console.log('To distribute USDC amount (will need to cut xtetubal bb part): ', usdcForDistribute + usdcForDistributePS + veTETUPart);

  const usersBalances = await collectUsers2(BLOCK);
  console.log('User balances size: ', usersBalances.length);
  let usersBalancesOnChain: string[] = [];
  if (VALIDATE_USER_BALANCE_ON_CHAIN) {
    usersBalancesOnChain = (await getAllBalance(usersBalances, BLOCK)).returnData;
  }

  console.log('VALIDATE_TOTAL_SUPPLY', VALIDATE_TOTAL_SUPPLY);
  if (VALIDATE_TOTAL_SUPPLY) {
    const totalSupply = await totalSupplyAt(MaticAddresses.xtetuBAL_TOKEN, BLOCK);
    const totalSupplyFormatted = +formatUnits(totalSupply);
    const sumBalance = usersBalances.map(userBalance => +formatUnits(userBalance.balance)).reduce((accumulator: number, currentValue: number) => accumulator + currentValue, 0);
    console.log('xtetuBAL total supply', totalSupplyFormatted);
    console.log('xtetuBAL sum balance from subgraph', sumBalance);
    if (totalSupplyFormatted.toFixed(2) !== sumBalance.toFixed(2)) {
      console.log('Total supply and sum balance are not equal');
    }
  }

  let index = 0;
  console.log('VALIDATE_USER_BALANCE_ON_CHAIN', VALIDATE_USER_BALANCE_ON_CHAIN);

  for (const userBalance of usersBalances) {
    const amount = +formatUnits(userBalance.balance);

    // validate on chain balance
    if (VALIDATE_USER_BALANCE_ON_CHAIN) {
      const onChainAmount = +formatUnits(BigInt(usersBalancesOnChain[index]));
      index++;
      // console.log(`User ${userBalance.user.id} balance: ${amount} on chain: ${onChainAmount}`)
      if (onChainAmount !== amount) {
        console.error('on chain amount', userBalance.user.id, onChainAmount, '!==', amount);
      }
    }

    const user = userBalance.user.id;
    const userRatio = amount / +formatUnits(xtetuBalTVL);
    const isUseXtetuBal = await XtetuBALDistributor__factory.connect(DISTRIBUTOR, signer).useXtetuBal(user);

    const usdcAmountForUser = usdcForDistribute * userRatio;

    if (usdcAmountForUser > 0) {
      if (isUseXtetuBal) {
        usersForXtetuBAL.push(user);
        const a = usdcAmountForUser / +formatUnits(xtetuBalPrice);
        xtetuBalAmountForDistributing += a;
        // console.log('xtetuBAL => ', user, a);
        usersForXtetuBALAmounts.push(parseUnits(a.toFixed(18)));
        amountForBuyingTetuBal += usdcAmountForUser;
      } else {
        // console.log('USDC => ', user, usdcAmountForUser);
        let usdcAmountFinal = usdcAmountForUser;
        let tetuAmountFinal = 0;
        if (TETU_RATIO !== 0) {
          usdcAmountFinal = usdcAmountForUser - (usdcAmountForUser * TETU_RATIO);
          tetuAmountFinal = (usdcAmountForUser - usdcAmountFinal) / +formatUnits(tetuPrice);

          usersForTetu.push(user);
          usersForTetuAmounts.push(parseUnits(tetuAmountFinal.toFixed(18), 18));
          tetuAmountForDistributing += tetuAmountFinal;
        }
        if (TETU_RATIO < 1) {
          usersForUSDC.push(user);
          usersForUSDCAmounts.push(parseUnits(usdcAmountFinal.toFixed(6), 6));
          usdcAmountForDistributing += usdcAmountFinal;
        }
      }
    }
  }

  for (const pos of pawnshopData) {
    const user = pos.borrower;
    const amount = +formatUnits(pos.collateral.collateralAmount);
    const userRatio = amount / expectedPawnshopPower;

    const usdcAmountForUser = usdcForDistributePS * userRatio;

    if (usdcAmountForUser > 0) {
      console.log('pawnshop USDC => ', user, usdcAmountForUser);

      let usdcAmountFinal = usdcAmountForUser;
      let tetuAmountFinal = 0;
      if (TETU_RATIO !== 0) {
        usdcAmountFinal = usdcAmountForUser - (usdcAmountForUser * TETU_RATIO);
        tetuAmountFinal = (usdcAmountForUser - usdcAmountFinal) / +formatUnits(tetuPrice);

        usersForTetu.push(user);
        usersForTetuAmounts.push(parseUnits(tetuAmountFinal.toFixed(18), 18));
        tetuAmountForDistributing += tetuAmountFinal;
      }

      if (TETU_RATIO < 1) {
        usersForUSDC.push(user);
        usersForUSDCAmounts.push(parseUnits(usdcAmountFinal.toFixed(6), 6));
        usdcAmountForDistributing += usdcAmountFinal;
      }
    }
  }

  console.log('xtetuBal vault TVL at the moment of snapshot:', xtetuBalTVLUSD);

  console.log('>>> USDC to distribute(send do deployer): ', usdcAmountForDistributing);
  console.log('>>> TETU to distribute(send do deployer): ', tetuAmountForDistributing + veTetuPartOfTetu);
  console.log('>>> xtetuBal to distribute(send to deployer)', xtetuBalAmountForDistributing);

  console.log(`Need to buy TetuBal on ${amountForBuyingTetuBal}$`);


  const balanceXtetuBal = await IERC20__factory.connect(MaticAddresses.xtetuBAL_TOKEN, signer).balanceOf(signer.address);
  const balanceUSDC = await IERC20__factory.connect(MaticAddresses.USDC_TOKEN, signer).balanceOf(signer.address);
  const balanceTETU = await IERC20__factory.connect(MaticAddresses.TETU_TOKEN, signer).balanceOf(signer.address);

  console.log('balanceXtetuBal', +formatUnits(balanceXtetuBal));
  console.log('balanceTETU', +formatUnits(balanceTETU));
  console.log('balanceUSDC', +formatUnits(balanceUSDC, 6));

  if (+formatUnits(balanceTETU) < (tetuAmountForDistributing + veTetuPartOfTetu)) {
    throw new Error('not enough TETU');
  }
  if (+formatUnits(balanceXtetuBal) < xtetuBalAmountForDistributing) {
    throw new Error('not enough xtetuBal');
  }

  await distributeBribes(signer, veTetuPartOfTetu);

  const usdcAllowance = await IERC20__factory.connect(MaticAddresses.USDC_TOKEN, signer).allowance(signer.address, distributor.address);
  const xtetuBALAllowance = await IERC20__factory.connect(MaticAddresses.xtetuBAL_TOKEN, signer).allowance(signer.address, distributor.address);
  const tetuAllowance = await IERC20__factory.connect(MaticAddresses.TETU_TOKEN, signer).allowance(signer.address, distributor.address);

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

  if (tetuAllowance.lt(parseUnits((tetuAmountForDistributing + 1).toFixed(18)))) {
    console.log('APPROVE tetu', tetuAmountForDistributing);
    await RunHelper.runAndWait(() => IERC20__factory.connect(MaticAddresses.TETU_TOKEN, signer).approve(
        distributor.address,
        parseUnits((tetuAmountForDistributing + 1).toFixed(18)).add(1)
      )
    );
  }

  // console.log('xtetuBalAmountForDistributing', xtetuBalAmountForDistributing)
  // console.log('tetuAmountForDistributing', tetuAmountForDistributing)
  // console.log('usersForUSDC', usersForUSDC)
  // console.log('usersForXtetuBAL', usersForXtetuBAL)
  // console.log('usersForTetu', usersForTetu)
  //
  // console.log('usersForXtetuBALAmounts', usersForXtetuBALAmounts.map(b => b.toString()))
  // console.log('usersForTetuAmounts', usersForTetuAmounts.map(b => b.toString()))

  if (
    balanceUSDC.gte(parseUnits(usdcAmountForDistributing.toFixed(6), 6))
    && balanceXtetuBal.gte(parseUnits((xtetuBalAmountForDistributing).toFixed(18)))
    && balanceTETU.gte(parseUnits((tetuAmountForDistributing).toFixed(18)))
  ) {
    const tp = await DeployerUtilsLocal.txParams();
    await RunHelper.runAndWait(() => distributor.distribute(
      [
        usersForUSDC,
        usersForXtetuBAL,
        usersForTetu
      ],
      [
        usersForUSDCAmounts,
        usersForXtetuBALAmounts,
        usersForTetuAmounts
      ],
      parseUnits(xtetuBalTVLUSD.toFixed(18)),
      {...tp}
    ));

    // 1.640059157153047501
    const apr = formatUnits(await distributor.lastAPR());
    console.log('APR', apr);
    // expect(+apr).is.greaterThan(10);
    // expect(+apr).is.lessThan(100);

  } else {
    console.error('not enough tokens');
    if (Misc.getChainName() !== 'hardhat') {
      throw new Error('not enough tokens');
    }
  }
}

async function distributeBribes(
  signer: SignerWithAddress,
  amount: number,
) {

  console.log('--------- Start distribute veTETU bribes', amount);

  const balanceTETU = await IERC20__factory.connect(MaticAddresses.TETU_TOKEN, signer).balanceOf(signer.address);

  console.log('balanceTETU', +formatUnits(balanceTETU));

  if (amount <= +formatUnits(balanceTETU)) {
    console.log('transfer tetu');
    const tp = await DeployerUtilsLocal.txParams();
    await RunHelper.runAndWait(() => IERC20__factory.connect(MaticAddresses.TETU_TOKEN, signer).transfer(
      BRIBE_DISTRIBUTOR,
      parseUnits(amount.toFixed(18)),
      {...tp}
    ));
  } else {
    throw new Error('not enough tokens');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

async function collectUsers2(block: number) {
  const userBalancesHistory = await getAllUserBalanceByBlock(block);
  const uniqueRecords: { [key: string]: UserBalanceHistoryEntity } = {};

  for (const record of userBalancesHistory) {
    if (uniqueRecords[record.user.id]) {
      if (uniqueRecords[record.user.id].blockNumber < record.blockNumber) {
        uniqueRecords[record.user.id] = record;
      }
    } else {
      uniqueRecords[record.user.id] = record;
    }
  }
  return Object.values(uniqueRecords);
}

async function collectUsers(block: number) {
  const logs = await Web3Utils.parseLogs(
    [MaticAddresses.xtetuBAL_TOKEN],
    [IERC20__factory.createInterface().getEventTopic('Transfer')],
    41527426,
    block
  );

  console.log('logs', logs.length);
  const TARGET_FOR_CHECK = '0'.toLowerCase();

  const balances = new Map<string, number>();

  for (const log of logs) {
    const transfer = IERC20__factory.createInterface().parseLog(log) as unknown as TransferEvent;

    if (transfer.args.from.toLowerCase() === TARGET_FOR_CHECK || transfer.args.to.toLowerCase() === TARGET_FOR_CHECK) {
      console.log('TARGET transfer', +formatUnits(transfer.args.value));
    }

    balances.set(transfer.args.from, (balances.get(transfer.args.from) ?? 0) - +formatUnits(transfer.args.value));
    balances.set(transfer.args.to, (balances.get(transfer.args.to) ?? 0) + +formatUnits(transfer.args.value));
  }

  balances.delete(MaticAddresses.xtetuBAL_TOKEN);
  balances.delete(Misc.ZERO_ADDRESS);

  const result = new Map<string, number>();

  for (const acc of balances.keys()) {
    const actualBalance = await IERC20__factory.connect(MaticAddresses.xtetuBAL_TOKEN, ethers.provider).balanceOf(acc, {blockTag: block});
    if (+formatUnits(actualBalance) !== balances.get(acc)) {
      // console.error('actual balance', acc, balances.get(acc), '!==', +formatUnits(actualBalance));
    }
    result.set(acc, +formatUnits(actualBalance));

    if (acc.toLowerCase() === TARGET_FOR_CHECK) {
      console.log('TARGET balance', +formatUnits(actualBalance));
    }
  }

  return result;
}

async function getAllBalance(userBalances: UserBalanceHistoryEntity[], block: number) {
  const multicall = Addresses.TOOLS.get(Misc.getChainId() + '')?.multicall;
  if (!multicall) {
    throw new Error(`Multicall address not found for chainId ${Misc.getChainId()}`);
  }
  const cals = userBalances.map(b => {
    return {
      target: MaticAddresses.xtetuBAL_TOKEN,
      callData: ERC20__factory.createInterface().encodeFunctionData('balanceOf', [b.user.id]),
    };
  });
  return Multicall__factory.connect(multicall, (await ethers.getSigners())[0]).callStatic.aggregate(cals, {blockTag: block});
}

async function totalSupplyAt(address: string, block: number) {
  return IERC20__factory.connect(address, ethers.provider).totalSupply({blockTag: block});
}