import {MaticAddresses} from "../../../addresses/MaticAddresses";
import {deployMeshLendStrat} from "./deploy-mesh-lend-strat";

async function main() {
  await deployMeshLendStrat(MaticAddresses.USDC_TOKEN)
  await deployMeshLendStrat(MaticAddresses.USDT_TOKEN)
  await deployMeshLendStrat(MaticAddresses.DAI_TOKEN)
  await deployMeshLendStrat(MaticAddresses.WBTC_TOKEN)
  await deployMeshLendStrat(MaticAddresses.WETH_TOKEN)
  await deployMeshLendStrat(MaticAddresses.WMATIC_TOKEN)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
