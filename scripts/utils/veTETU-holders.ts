import {getVeTetuHolders} from "./tools/veTETU-utils";
import {IBVault__factory, IERC20__factory} from "../../typechain";
import {MaticAddresses} from "../addresses/MaticAddresses";
import {ethers} from "hardhat";
import {formatUnits} from "ethers/lib/utils";

async function main() {
  const [signer] = await ethers.getSigners();
  const data = await getVeTetuHolders(100);

  const nfts = data.veTetuEntities[0].nfts;

  let powerToExit = 0;
  for (const nft of nfts) {

    const power = (Number(nft.derivedAmount) / 1000).toFixed(0)
    const endTime = new Date(Number(nft.lockedEnd) * 1000);
    const untilEnd = ((Number(nft.lockedEnd) - (Date.now() / 1000)) / 60 / 60 / 24).toFixed();
    const formattedDate: string = `${endTime.getFullYear()}-${("0" + (endTime.getMonth() + 1)).slice(-2)}-${("0" + endTime.getDate()).slice(-2)}`;
    console.log(`${nft.veNFTId} ${power}k will end in ${untilEnd} days (${formattedDate})`);

    if (+untilEnd < 90) {
      powerToExit += +nft.derivedAmount;
    }
  }


  const veTetuBal = +formatUnits(await IERC20__factory.connect('0x6922201f0d25Aba8368e7806642625879B35aB84', signer).balanceOf('0x6FB29DD17fa6E27BD112Bc3A2D0b8dae597AeDA4'))

  const exitPerc = powerToExit / veTetuBal * 100;

  const tokens = await IBVault__factory.connect(MaticAddresses.BALANCER_VAULT, signer).getPoolTokens(MaticAddresses.BALANCER_TETU_USDC_ID);

  const tetuInPool = +formatUnits(tokens.balances[0]);
  const usdcInPool = +formatUnits(tokens.balances[1], 6);
  const totalSupply = +formatUnits(await IERC20__factory.connect(MaticAddresses.BALANCER_TETU_USDC, signer).totalSupply());
  const percToExit = powerToExit / totalSupply * 100;
  const tetuToExit = tetuInPool * percToExit / 100;
  const usdcToExit = usdcInPool * percToExit / 100;

  console.log('tetuInPool', tetuInPool);
  console.log('usdcInPool', usdcInPool);
  console.log(`tetuToExit ${(tetuToExit / 1000_000).toFixed(3)} mil`);
  console.log(`usdcToExit ${(usdcToExit/1000).toFixed()}k`);

  console.log(`Power to exit: ${powerToExit} (${exitPerc.toFixed(2)}%)`);


}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
