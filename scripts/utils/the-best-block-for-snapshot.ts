import {ethers} from "hardhat";
import {IBVault__factory, IERC20__factory} from "../../typechain";
import {formatUnits} from "ethers/lib/utils";


const BALANCER_VAULT = '0xBA12222222228d8Ba445958a75a0704d566BF2C8';
const TETU_BAL_BPT_ID = '0xb797adfb7b268faeaa90cadbfed464c76ee599cd0002000000000000000005ba';
const TETU_BAL = '0x7fC9E0Aa043787BFad28e29632AdA302C790Ce33';
// check here https://snapshot.org/#/tetubal.eth
const LAST_VOTING_BLOCK = 37683800;

async function main() {
  const [signer] = await ethers.getSigners();

  const curBlock = await signer.provider?.getBlockNumber() || 0;
  console.log('curBlock', curBlock)

  const blockDiff = curBlock - LAST_VOTING_BLOCK;
  const steps = 100;

  let bestPercent = 0;
  let bestBlock = 0;

  for (let i = 0; i <= steps; i++) {
    const block = Math.round(LAST_VOTING_BLOCK + (blockDiff / steps * i));

    const balVault = IBVault__factory.connect(BALANCER_VAULT, signer);
    const data = await balVault.getPoolTokens(TETU_BAL_BPT_ID, {blockTag: block});
    const totalVeTetuPower = +formatUnits(data.balances[1]);
    const totalSupply = +formatUnits(await IERC20__factory.connect(TETU_BAL, signer).totalSupply({blockTag: block}));
    const percent = totalVeTetuPower / totalSupply * 100;
    console.log(block, 'percent', percent)

    if (bestPercent < percent) {
      bestPercent = percent;
      bestBlock = block;
    }

  }

  console.log(`best block is ${bestBlock} with percent of power ${bestPercent}`);

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
