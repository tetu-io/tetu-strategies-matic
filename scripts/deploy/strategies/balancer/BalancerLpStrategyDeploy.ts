import {ethers} from "hardhat";
import {DeployerUtilsLocal} from "../../DeployerUtilsLocal";
import {
  IERC20__factory, IERC20Extended__factory,
  StrategyBalancerPool__factory,
  StrategyTetuMeshLp__factory
} from "../../../../typechain";
import {writeFileSync} from "fs";
import {MaticAddresses} from "../../../addresses/MaticAddresses";

const strategyContractName = 'StrategyBalancerPool';
const VAULT = '0xBD06685a0e7eBd7c92fc84274b297791F3997ed3';
const UNDERLYING = MaticAddresses.BALANCER_POOL_tetuBAL_BPT;
const POOL_ID = MaticAddresses.BALANCER_POOL_tetuBAL_BPT_ID;
const GAUGE = MaticAddresses.BALANCER_GAUGE_tetuBAL_BPT;
const DEPOSIT_TOKEN = MaticAddresses.tetuBAL;
const BUYBACK_RATIO = 20_00;
const REWARD_TOKENS = [MaticAddresses.BAL_TOKEN];

async function main() {
  const signer = (await ethers.getSigners())[0];
  const core = await DeployerUtilsLocal.getCoreAddresses();

  const [proxy, logic] = await DeployerUtilsLocal.deployTetuProxyControlled(signer, strategyContractName);
  await StrategyBalancerPool__factory.connect(proxy.address, signer).initialize(
    core.controller,
    VAULT,
    UNDERLYING,
    POOL_ID,
    GAUGE,
    DEPOSIT_TOKEN,
    BUYBACK_RATIO,
    REWARD_TOKENS
  )

  const symb = await IERC20Extended__factory.connect(UNDERLYING, signer).symbol()

  const txt = `strategy: ${proxy.address}`;
  writeFileSync(`./tmp/deployed/${strategyContractName}_${symb}.txt`, txt, 'utf8');

  await DeployerUtilsLocal.wait(5);
  await DeployerUtilsLocal.verify(logic.address);
  await DeployerUtilsLocal.verifyWithArgs(proxy.address, [logic.address]);
  await DeployerUtilsLocal.verifyProxy(proxy.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
