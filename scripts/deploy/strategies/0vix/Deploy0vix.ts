import {deployZerovixstMaticStrategy} from "./deploy-0vix-strat-stmatic";

async function main() {
  await deployZerovixstMaticStrategy()
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
