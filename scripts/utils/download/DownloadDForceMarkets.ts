import {ethers} from "hardhat";
import {DeployerUtilsLocal} from "../../deploy/DeployerUtilsLocal";
import {MaticAddresses} from "../../addresses/MaticAddresses";
import {
  IDForceController__factory,
  IiToken__factory,
  IPriceCalculator__factory,
  ISmartVault__factory
} from "../../../typechain";
import {TokenUtils} from "../../../test/TokenUtils";
import {mkdir, writeFileSync} from "fs";
import {utils} from "ethers";
import {VaultUtils} from "../../../test/VaultUtils";
import {Misc} from "../tools/Misc";


async function main() {
  const signer = (await ethers.getSigners())[0];
  const core = await DeployerUtilsLocal.getCoreAddresses();
  const tools = await DeployerUtilsLocal.getToolsAddresses();

  const controller = IDForceController__factory.connect(MaticAddresses.DFORCE_CONTROLLER, signer);
  const priceCalculator = IPriceCalculator__factory.connect(tools.calculator, signer);

  const markets = await controller.getAlliTokens();
  console.log('markets', markets.length);

  // const vaultInfos = await VaultUtils.getVaultInfoFromServer();
  const underlyingStatuses = new Map<string, boolean>();
  const currentRewards = new Map<string, number>();
  // const underlyingToVault = new Map<string, string>();
  // for (const vInfo of vaultInfos) {
  //   if (vInfo.platform !== '39') {
  //     continue;
  //   }
  //   underlyingStatuses.set(vInfo.underlying.toLowerCase(), vInfo.active);
  //   underlyingToVault.set(vInfo.underlying.toLowerCase(), vInfo.addr);
  //   if (vInfo.active) {
  //     const vctr = ISmartVault__factory.connect(vInfo.addr, signer);
  //     currentRewards.set(vInfo.underlying.toLowerCase(), 0);
  //   }
  // }

  console.log('loaded vault', underlyingStatuses.size);

  const rewardPrice = await priceCalculator.getPriceWithDefaultOutput(MaticAddresses.ICE_TOKEN);
  console.log('reward price', utils.formatUnits(rewardPrice));

  let infos: string = 'idx, iToken_name, iToken_address, token, tokenName, collateralFactor, borrowTarget, tvl, apr, vault, current rewards \n';
  for (let i = 0; i < markets.length; i++) {
    console.log('id', i);
    if (i === 6) {
      continue;
    }

    const iTokenAdr = markets[i];
    const iTokenName = await TokenUtils.tokenSymbol(iTokenAdr);
    console.log('rTokenName', iTokenName, iTokenAdr)
    const iTokenCtr = IiToken__factory.connect(iTokenAdr, signer);
    const token = await iTokenCtr.underlying();
    console.log('token', token)
    if (token === Misc.ZERO_ADDRESS) {
      continue;
    }
    const tokenName = await TokenUtils.tokenSymbol(token);

    const collateralFactor = +utils.formatUnits((await controller.markets(iTokenAdr)).collateralFactorMantissa) * 10000;
    const borrowTarget = Math.floor(collateralFactor * 0.99);

    const status = underlyingStatuses.get(token.toLowerCase());
    if (status != null && !status) {
      console.log('deactivated');
      continue;
    }
    const undPrice = +utils.formatUnits(await priceCalculator.getPriceWithDefaultOutput(token));

    const undDec = await TokenUtils.decimals(token);
    const cash = +utils.formatUnits(await iTokenCtr.getCash(), undDec);
    const borrowed = +utils.formatUnits(await iTokenCtr.totalBorrows(), undDec);
    const reserves = +utils.formatUnits(await iTokenCtr.totalReserves(), undDec);

    const tvl = (cash + borrowed - reserves) * undPrice;
    const apr = 0;
    const curRewards = currentRewards.get(token.toLowerCase());
    // const vault = underlyingToVault.get(token.toLowerCase());

    const data = i + ',' +
      iTokenName + ',' +
      iTokenAdr + ',' +
      token + ',' +
      tokenName + ',' +
      (collateralFactor - 1) + ',' +
      borrowTarget + ',' +
      tvl.toFixed(2) + ',' +
      apr + ',' +
      // vault + ',' +
      'vault,' +
      curRewards


    console.log(data);
    infos += data + '\n';
  }

  mkdir('./tmp/download', {recursive: true}, (err) => {
    if (err) throw err;
  });

  // console.log('data', data);
  writeFileSync('./tmp/download/dforce_markets.csv', infos, 'utf8');
  console.log('done');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
