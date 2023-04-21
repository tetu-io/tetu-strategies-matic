import {MaticAddresses} from "../../../addresses/MaticAddresses";
import {deployDForceLendStrat} from "./deploy-dforce-lend-strat";

async function main() {
  // await deployDForceLendStrat(MaticAddresses.USDC_TOKEN)
  // await deployDForceLendStrat(MaticAddresses.USDT_TOKEN)
  await deployDForceLendStrat(MaticAddresses.DAI_TOKEN)


  // await deployDForceLendStrat(MaticAddresses.WBTC_TOKEN)
  // await deployDForceLendStrat(MaticAddresses.WETH_TOKEN)
  // await deployDForceLendStrat(MaticAddresses.WMATIC_TOKEN)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
