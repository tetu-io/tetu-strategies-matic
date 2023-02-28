import {MaticAddresses} from "../../../addresses/MaticAddresses";
import {deployAave3StratV2} from "./deploy-aave3-strat-v2";

async function main() {
  await deployAave3StratV2(MaticAddresses.USDC_TOKEN)
  await deployAave3StratV2(MaticAddresses.USDT_TOKEN)
  await deployAave3StratV2(MaticAddresses.WBTC_TOKEN)
  await deployAave3StratV2(MaticAddresses.WETH_TOKEN)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
