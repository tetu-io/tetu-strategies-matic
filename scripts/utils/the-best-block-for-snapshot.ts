import {ethers} from "hardhat";
import {IBVault__factory, IERC20__factory, ISmartVault__factory} from "../../typechain";
import {formatUnits} from "ethers/lib/utils";
import {MaticAddresses} from "../addresses/MaticAddresses";
import {getSnapshotData} from "./tools/voting-utils";
import {Misc} from "./tools/Misc";

// check here https://snapshot.org/#/tetubal.eth
const PREVIOUS_PROPOSAL = '0x45e8c0e3df0c4ae63a133570fa30653b1d86ec2d5da89147b50c77725d0f0a07';

async function main() {
  const BALANCER_VAULT = '0xBA12222222228d8Ba445958a75a0704d566BF2C8';
  const TETU_BAL = '0x7fC9E0Aa043787BFad28e29632AdA302C790Ce33';
  const TETU_BAL_POWER = '0x8FFBa974Efa7C262C97b9521449Fd2B3c69bE4E6';
  const BRIBER = '0x6672A074B98A7585A8549356F97dB02f9416849E';

  const curBlock = await ethers.provider?.getBlockNumber() || 0;
  console.log('curBlock', curBlock)

  const snapshotData = await getSnapshotData(PREVIOUS_PROPOSAL)
  console.log('PREVIOUS PROPOSAL', snapshotData.title);
  const snapshotDate = +snapshotData.end;

  const curDate = Math.floor(new Date().getTime() / 1000);
  const sinceProposal = (curDate - snapshotDate);
  console.log('sinceProposal days', sinceProposal / 60 / 60 / 24);
  if (sinceProposal < 7 * 60 * 60 * 24 || sinceProposal > 17 * 60 * 60 * 24) throw new Error('Wrong proposal');

  const previousVotingStartBlock = await Misc.findBlockByDate(snapshotDate, curBlock - Math.floor(sinceProposal / (await Misc.getAverageBlockTime())) + 20000);
  console.log('previousVotingStartBlock', previousVotingStartBlock);


  const blockDiff = curBlock - previousVotingStartBlock;
  const steps = 100;
  const balVault = IBVault__factory.connect(BALANCER_VAULT, ethers.provider);

  let bestPercent = 0;
  let bestPercentXtetuBal = 0;
  let bestBlock = 0;
  let bestBlockXtetubal = 0;
  let xtetuBalPercentForBestBlock = 0;
  let percentForBestxtetuBalBlock = 0;

  for (let i = 0; i <= steps; i++) {
    const block = Math.round(previousVotingStartBlock + (blockDiff / steps * i));
    const bbb = await IERC20__factory.connect(TETU_BAL, ethers.provider).balanceOf(BALANCER_VAULT, {blockTag: block});
    const totalVeTetuPower = +formatUnits(bbb);
    let xtetuBALPower = 0;
    if (block > 41527426) {
      xtetuBALPower = +formatUnits(await IERC20__factory.connect(TETU_BAL_POWER, ethers.provider).balanceOf(BRIBER, {blockTag: block}));
    }

    const totalSupply = +formatUnits(await IERC20__factory.connect(TETU_BAL, ethers.provider).totalSupply({blockTag: block}));
    const percent = totalVeTetuPower / totalSupply * 100;
    const percentXtetuBal = xtetuBALPower / totalSupply * 100;
    console.log(block, 'veTETU power ', percent.toFixed(4), 'xtetuBal power', percentXtetuBal.toFixed(4));

    if (bestPercent < percent) {
      bestPercent = percent;
      bestBlock = block;
      xtetuBalPercentForBestBlock = percentXtetuBal;
    }
    if (bestPercentXtetuBal < percentXtetuBal) {
      bestPercentXtetuBal = percentXtetuBal;
      bestBlockXtetubal = block;
      percentForBestxtetuBalBlock = percent;
    }

  }

  console.log(`best block is ${bestBlock} with percent of veTETU power ${bestPercent.toFixed(4)}% and xtetuBAL power ${xtetuBalPercentForBestBlock.toFixed(4)}%,
  xtetuBal had the best power of ${bestPercentXtetuBal.toFixed(4)}% at block ${bestBlockXtetubal} with veTETU power ${percentForBestxtetuBalBlock.toFixed(4)}`);

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
