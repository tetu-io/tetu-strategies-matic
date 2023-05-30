import {deployBalancerStrategyOnly} from "../DeployBPTVaultAndStrategy";
import {MaticAddresses} from "../../../../addresses/MaticAddresses";
import {BalancerConstants} from "../BalancerConstants";
import hre from "hardhat";
import {writeFileSync} from "fs";
import {
  deployWUsdrUsdc4
} from "../../../../../test/strategies/matic/balancer/redeploy-balancer-strategies/4.wUSDR-USDC";

/**
 * npx hardhat run scripts/deploy/strategies/balancer/redeploy-strategies/4.wUSDR-USDC.ts
 * npx hardhat run --network localhost scripts/deploy/strategies/balancer/redeploy-strategies/4.wUSDR-USDC.ts
 */
async function main() {
  const {vault, strategy, undSymbol} = await deployWUsdrUsdc4();

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
