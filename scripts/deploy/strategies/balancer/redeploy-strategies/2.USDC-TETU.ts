import hre, {ethers} from "hardhat";
import {writeFileSync} from "fs";
import {deployUsdcTetu2} from "../../../../../test/strategies/matic/balancer/redeploy-balancer-strategies/2.USDC-TETU";

/**
 * npx hardhat run scripts/deploy/strategies/balancer/redeploy-strategies/2.USDC-TETU.ts
 * npx hardhat run --network localhost scripts/deploy/strategies/balancer/redeploy-strategies/2.USDC-TETU.ts
 */
async function main() {
  const signer = (await ethers.getSigners())[0];
  const {vault, strategy, undSymbol} = await deployUsdcTetu2(signer);

  if (hre.network.name !== 'hardhat') {
    const txt = `vault: ${vault}\nstrategy: ${strategy}`;
    writeFileSync(`tmp/deployed/balancer_POL${undSymbol.replace('/', '-')}.txt`, txt, 'utf8');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
