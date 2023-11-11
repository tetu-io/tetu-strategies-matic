import {writeFileSync} from "fs";
import {
  deploySphereWmatic1
} from "../../../../../test/strategies/matic/balancer/redeploy-balancer-strategies/1.SPHERE-WMATIC";
import hre, {ethers} from "hardhat";

/**
 * npx hardhat run scripts/deploy/strategies/balancer/redeploy-strategies/1.SPHERE-WMATIC.ts
 * npx hardhat run --network localhost scripts/deploy/strategies/balancer/redeploy-strategies/1.SPHERE-WMATIC.ts
 */
async function main() {
  const signer = (await ethers.getSigners())[0];
  const {vault, strategy, undSymbol} = await deploySphereWmatic1(signer);

  if (hre.network.name !== 'hardhat') {
    const txt = `vault: ${vault}\nstrategy: ${strategy}`;
    writeFileSync(`tmp/deployed/balancer_${undSymbol.replace('/', '-')}.txt`, txt, 'utf8');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
