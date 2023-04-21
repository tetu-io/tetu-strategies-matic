import {MaticAddresses} from "../../../addresses/MaticAddresses";
import {deployCompound3Strat} from "./deploy-compound3-strat";

async function main() {
  await deployCompound3Strat(MaticAddresses.USDC_TOKEN, '0xeEf679De267A65d60103f839CA6B5D78A465d524', MaticAddresses.COMPOUND3_COMET_USDC)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
