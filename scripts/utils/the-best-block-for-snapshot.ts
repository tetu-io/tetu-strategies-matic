import {ethers} from "hardhat";
import {IBVault__factory, IERC20__factory, ISmartVault__factory} from "../../typechain";
import {formatUnits} from "ethers/lib/utils";
import {MaticAddresses} from "../addresses/MaticAddresses";


const BALANCER_VAULT = '0xBA12222222228d8Ba445958a75a0704d566BF2C8';
const TETU_BAL_BPT_ID = '0xb797adfb7b268faeaa90cadbfed464c76ee599cd0002000000000000000005ba';
const TETU_BAL = '0x7fC9E0Aa043787BFad28e29632AdA302C790Ce33';
// check here https://snapshot.org/#/tetubal.eth
const LAST_VOTING_BLOCK = 41399011;

async function main() {
  const [signer] = await ethers.getSigners();

  const curBlock = await signer.provider?.getBlockNumber() || 0;
  console.log('curBlock', curBlock)

  const blockDiff = curBlock - LAST_VOTING_BLOCK;
  const steps = 100;
  const balVault = IBVault__factory.connect(BALANCER_VAULT, signer);

  let bestPercent = 0;
  let bestPercentXtetuBal = 0;
  let bestBlock = 0;
  let bestBlockXtetubal = 0;
  let xtetuBalPercentForBestBlock = 0;
  let percentForBestxtetuBalBlock = 0;

  for (let i = 0; i <= steps; i++) {
    const block = Math.round(LAST_VOTING_BLOCK + (blockDiff / steps * i));
    const data = await balVault.getPoolTokens(TETU_BAL_BPT_ID, {blockTag: block});
    const totalVeTetuPower = +formatUnits(data.balances[1]);
    let xtetuBALPower = 0;
    if(block > 41527426) {
      xtetuBALPower = +formatUnits(await ISmartVault__factory.connect(MaticAddresses.xtetuBAL_TOKEN, signer).underlyingBalanceWithInvestment({blockTag: block}));
    }

    const totalSupply = +formatUnits(await IERC20__factory.connect(TETU_BAL, signer).totalSupply({blockTag: block}));
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
