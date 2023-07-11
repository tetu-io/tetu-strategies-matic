import {MaticAddresses} from "../../../../addresses/MaticAddresses";
import {
  deployBalancerBoostStrategyOnly,
} from "../DeployVaultAndBalancerBoostStrategy";
import {DeployerUtilsLocal} from "../../../DeployerUtilsLocal";
import hre, {ethers} from "hardhat";
import {mkdir, writeFileSync} from "fs";

async function main() {
  mkdir('./tmp/deployed', {recursive: true}, (err) => {
    if (err) throw err;
  });

  const targets = [
    [MaticAddresses.BALANCER_USD_TETU_BOOSTED, MaticAddresses.BALANCER_USD_TETU_BOOSTED_ID, MaticAddresses.BALANCER_USD_TETU_BOOSTED_GAUGE, MaticAddresses.bb_t_USDC_TOKEN, ],
  ]
  const signer = (await ethers.getSigners())[0];
  let txt = ''
  for (const t of targets) {
    const underlying = t[0];
    const poolId = t[1];
    const gauge = t[2];
    const depositToken = t[3];
    const buyBackRatio = 10_00;
    const vault = await DeployerUtilsLocal.findVaultUnderlyingInBookkeeper(signer, underlying);

    if (vault) {
      const {strategy, undSymbol} = await deployBalancerBoostStrategyOnly(
        underlying,
        poolId,
        gauge,
        depositToken,
        buyBackRatio,
        vault
      );
      txt += `vault: ${vault} ${undSymbol}\nstrategy: ${strategy}\n`;
    } else {
      console.error('Vault not found')
    }
  }

  if (hre.network.name !== 'hardhat') {
    writeFileSync(`tmp/deployed/balancerboost_strategies_tusd.txt`, txt, 'utf8');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
