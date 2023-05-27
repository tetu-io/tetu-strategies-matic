import {MaticAddresses} from "../../../../addresses/MaticAddresses";
import hre, {ethers} from "hardhat";
import {DeployerUtilsLocal} from "../../../DeployerUtilsLocal";
import {TokenUtils} from "../../../../../test/TokenUtils";
import {RunHelper} from "../../../../utils/tools/RunHelper";
import {
  StrategyBalancerTetuUsdc__factory
} from "../../../../../typechain";
import {writeFileSync} from "fs";
import {BalancerConstants} from "../BalancerConstants";

/**
 * npx hardhat run scripts/deploy/strategies/balancer/redeploy-strategies/2.USDC-TETU.ts
 * npx hardhat run --network localhost scripts/deploy/strategies/balancer/redeploy-strategies/2.USDC-TETU.ts
 */
async function main() {
  const signer = (await ethers.getSigners())[0];
  const core = await DeployerUtilsLocal.getCoreAddresses();

  const vault = BalancerConstants.BALANCER_VAULT_USDC_TETU;
  const UNDERLYING = MaticAddresses.BALANCER_TETU_USDC
  const undSymbol = await TokenUtils.tokenSymbol(UNDERLYING)

  const vaultDetected = await DeployerUtilsLocal.findVaultUnderlyingInBookkeeper(signer, UNDERLYING);
  if (vaultDetected?.toLowerCase() !== vault.toLowerCase()) {
    throw Error(`Wrong vault ${vaultDetected} !== ${vault}`);
  }

  const strategy = await DeployerUtilsLocal.deployContract(signer, "StrategyBalancerTetuUsdc");
  const tetuBalHolder = (await DeployerUtilsLocal.deployTetuProxyControlled(signer, 'TetuBalHolder'))[0];
  console.log('tetuBalHolder', tetuBalHolder.address);

  const strategyProxy = await DeployerUtilsLocal.deployContract(signer, "TetuProxyControlled", strategy.address);
  await RunHelper.runAndWait(() => StrategyBalancerTetuUsdc__factory.connect(strategyProxy.address, signer).initialize(
    core.controller,
    vault,
    tetuBalHolder.address,
    '0x6672A074B98A7585A8549356F97dB02f9416849E' // EOA temporally
  ));

  if (hre.network.name !== 'hardhat') {
    const txt = `vault: ${vault}\nstrategy: ${strategyProxy.address}`;
    writeFileSync(`tmp/deployed/balancer_POL${undSymbol.replace('/', '-')}.txt`, txt, 'utf8');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
