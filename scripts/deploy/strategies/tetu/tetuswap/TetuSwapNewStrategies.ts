
import {ethers} from "hardhat";
import {ISmartVault__factory} from "../../../../../typechain";
import {deployTetuSwapStrategies} from "../DeployTetuSwapStrategies";

async function main() {

  const signer = (await ethers.getSigners())[0];
  const tetuswapVaults = [
    // "0xf593a9b3B46dc6B8511139B7Cb08da3BfDc6c947",
    // "0xCa870d6575eF0B872F60E7fa63774258c523027F",
    "0x245CfCF4204E5A4dE2aBDbD65ed88C191755aFF4",
    "0x5b13Cb93Af007Bd3493d0ef4c7a0E03BB108Aee0",
    "0xDA45f1e953543680dacf1a7f2Fd3C39F697fAF5B",
    "0x8085bda03F698211cA3102cE09b6815138fd3815",
    "0xd56354849F53e35dD888194A389bb2774267ba9c",
    "0x1565354A7b39DaF855e880F049C155983d9Dc864",
    "0xe554019d6CCF3CcDe5bbA6f21D0B863B973C03e0",
    "0x1d5eA54D75C6d109853540d6614881ef14D0d7d0",
    "0x0CEa167322bE3b795CA30A84dCfBAaF26b021220",
    "0x04313380D0ee9942193841a6D2f3245E7E0e1a41",
    "0x0c2aa6fD64c348151065d9a429512aeADCC7EF41",
    "0xCcdc5c3EA8Be0Cc326b87f7b2e173CB7cCa6E58a",
    "0xBe527f95815f906625F29fc084bFd783F4d00787",
    "0xf8bB84BA2cBf0D849fd0A0f443CF3b41409B5637",
    "0x2F45a8A14237CA2d965405957f8C2A1082558890",
    "0x9254ed1E0BA79527A58784e9aede2434f4098a5e"
  ]

  for (const vault of tetuswapVaults) {
    const underlying = await ISmartVault__factory.connect(vault, signer).underlying();
    await deployTetuSwapStrategies(
      vault,
      underlying
    );
  }

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
