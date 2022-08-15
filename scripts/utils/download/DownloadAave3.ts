import {ethers, network} from "hardhat";
import {TokenUtils} from "../../../test/TokenUtils";
import {mkdir, writeFileSync} from "fs";
import {MaticAddresses} from "../../addresses/MaticAddresses";
import {
    IAave3AddressesProvider__factory,
    IAave3Pool__factory,
    IAave3ProtocolDataProvider,
    IAave3ProtocolDataProvider__factory,
    IAave3RewardsController__factory,
    IAave3Token__factory
} from "../../../typechain";


/**
 * Download pool assets info from AAVEv3
 *
 * To run:
 *      npx hardhat run scripts/utils/download/DownloadAave3.ts
 */
async function main() {
  const net = await ethers.provider.getNetwork();
  console.log(net, network.name);

  const signer = (await ethers.getSigners())[0];
  const pool = IAave3Pool__factory.connect(MaticAddresses.AAVE3_POOL, signer);
  const addressProvider = await IAave3AddressesProvider__factory.connect(await pool.ADDRESSES_PROVIDER(), signer);
  const dataProvider = IAave3ProtocolDataProvider__factory.connect(await addressProvider.getPoolDataProvider(), signer);

  const allLendingTokens = await dataProvider.getAllATokens();
  console.log('Lending tokens', allLendingTokens.length);

  const headers: string[] = [
      'idx',
      'token_name',
      'token_address',
      'aToken_name',
      'aToken_address',
      'dToken_Name',
      'dToken_address',
      'ltv',
      'liquidationThreshold',
      'usageAsCollateralEnabled',
      'borrowingEnabled',
      'isActive',
      'isFrozen',

      'List rewards'
  ];

  const sheaders = headers.join(",");
  const lines: string[] = [sheaders];
  console.log(sheaders);

  for (let i = 0; i < allLendingTokens.length; i++) {
    console.log('id', i);

    // if (i === 5 || i === 6) {
    //   console.log('skip volatile assets')
    //   continue;
    // }
    const aTokenAdr = allLendingTokens[i][1];
    const aTokenName = allLendingTokens[i][0];
    console.log('aTokenName', aTokenName, aTokenAdr)

    const aToken = IAave3Token__factory.connect(aTokenAdr, signer);
    const underlying = await aToken.UNDERLYING_ASSET_ADDRESS();

    const rewardsController = IAave3RewardsController__factory.connect(await aToken.getIncentivesController(), signer);
    const rewards = await rewardsController.getRewardsByAsset(underlying);

    const confData = await dataProvider.getReserveConfigurationData(underlying);
    const tokens = await dataProvider.getReserveTokensAddresses(underlying);

    const row = [
        i

        , await TokenUtils.tokenSymbol(underlying)
        , underlying

        , await TokenUtils.tokenSymbol(aToken.address)
        , aToken.address

        , await TokenUtils.tokenSymbol(tokens.variableDebtTokenAddress)
        , tokens.variableDebtTokenAddress

        , confData.ltv
        , confData.liquidationThreshold
        , confData.usageAsCollateralEnabled
        , confData.borrowingEnabled
        , confData.isActive
        , confData.isFrozen

        , rewards.join("\n")
    ];

    const line = row.join(",");
    lines.push(line);
    console.log(line);
  }

  const data = lines.join("\n");

  mkdir('./tmp/download', {recursive: true}, (err) => {
    if (err) throw err;
  });

  // console.log('data', data);
  writeFileSync('./tmp/download/aave3_markets.csv', data, 'utf8');
  console.log('done');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
