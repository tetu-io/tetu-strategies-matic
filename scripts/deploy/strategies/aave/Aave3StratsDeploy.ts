import {MaticAddresses} from "../../../addresses/MaticAddresses";
import {deployAave3Strat} from "./deploy-aave3-strat";

async function main() {
  await deployAave3Strat(MaticAddresses.USDC_TOKEN)
  await deployAave3Strat(MaticAddresses.USDT_TOKEN)
  await deployAave3Strat(MaticAddresses.WBTC_TOKEN)
  await deployAave3Strat(MaticAddresses.WETH_TOKEN)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
