import {MaticAddresses} from "../../../addresses/MaticAddresses";
import {deployAave3Strat} from "./deploy-aave3-strat";
import {deployAave2Strat} from "./deploy-aave2-strat";

async function main() {
  await deployAave2Strat(MaticAddresses.USDC_TOKEN)
  await deployAave2Strat(MaticAddresses.USDT_TOKEN)
  await deployAave2Strat(MaticAddresses.WBTC_TOKEN)
  await deployAave2Strat(MaticAddresses.WETH_TOKEN)
  await deployAave2Strat(MaticAddresses.DAI_TOKEN)
  await deployAave2Strat(MaticAddresses.WMATIC_TOKEN)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
