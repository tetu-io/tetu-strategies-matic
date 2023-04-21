import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {MaticAddresses} from "../../../../scripts/addresses/MaticAddresses";
import {DeployInfo} from "../../DeployInfo";
import {StrategyTestUtils} from "../../StrategyTestUtils";
import {SpecificStrategyTest} from "../../SpecificStrategyTest";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {CoreContractsWrapper} from "../../../CoreContractsWrapper";
import {DeployerUtilsLocal} from "../../../../scripts/deploy/DeployerUtilsLocal";
import {
  Aave3Strategy__factory, Aave3StrategyV2__factory,
  ISmartVault,
  IStrategy,
  StrategyTetuMeshLp__factory
} from "../../../../typechain";
import {ToolsContractsWrapper} from "../../../ToolsContractsWrapper";
import {DoHardWorkLoopBase} from "../../DoHardWorkLoopBase";
import {universalStrategyTest} from "../../UniversalStrategyTest";
import {ethers, network} from "hardhat";
import {config as dotEnvConfig} from "dotenv";
import {readFileSync} from "fs";

dotEnvConfig();
// tslint:disable-next-line:no-var-requires
const argv = require('yargs/yargs')()
  .env('TETU')
  .options({
    disableStrategyTests: {
      type: "boolean",
      default: false,
    },
    onlyOneAave3StrategyTest: {
      type: "number",
      default: 2, // -1 for all, 2 for USDC
    },
    deployCoreContracts: {
      type: "boolean",
      default: false,
    },
    hardhatChainId: {
      type: "number",
      default: 137
    },
  }).argv;

const {expect} = chai;
chai.use(chaiAsPromised);

describe('Aave3 Strategy V2 tests', async () => {

  if (argv.disableStrategyTests || argv.hardhatChainId !== 137) {
    return;
  }
  const infos = readFileSync('scripts/utils/download/data/aave3_markets.csv', 'utf8').split(/\r?\n/);

  const deployInfo: DeployInfo = new DeployInfo();
  before(async function () {
    console.log(await ethers.provider.getNetwork(), network.name);
    await StrategyTestUtils.deployCoreAndInit(deployInfo, true);
  });

  infos.forEach(info => {
    const start = info.split(',');

    const idx = start[0];
    const tokenName = start[1];
    const token = start[2];
    const aTokenName = start[3];
    console.log("START tokenName", tokenName);

    if (!idx || idx === "idx") { // skip header
      console.log('skip ', tokenName);
      return;
    }

    if (token === "AAVE") {
      console.log('skip ', tokenName);
      return;
    }

    if (argv.onlyOneAave3StrategyTest !== -1 && parseFloat(idx) !== argv.onlyOneAave3StrategyTest) {
      return;
    }
    console.log('Start test strategy', idx, tokenName, token, aTokenName);

    // **********************************************
    //                  CONFIG
    // **********************************************
    const strategyContractName = 'Aave3StrategyV2';
    const vaultName = "Aave3StrategyV2_vault";
    const underlying = token;
    // add custom liquidation path if necessary
    const forwarderConfigurator = null;
    // only for strategies where we expect PPFS fluctuations
    const ppfsDecreaseAllowed = true;
    // only for strategies where we expect PPFS fluctuations
    const balanceTolerance = 0;
    const finalBalanceTolerance = 0;
    const deposit = 100_000;
    // at least 3
    const loops = 3;
    const loopValue = 60 * 60 * 24 * 7;
    const advanceBlocks = false;
    const specificTests: SpecificStrategyTest[] = [];
    // **********************************************

    const deployer = (signer: SignerWithAddress) => {
      const core = deployInfo.core as CoreContractsWrapper;
      return StrategyTestUtils.deploy(
        signer,
        core,
        vaultName,
        async vaultAddress => {
          const strategy = await DeployerUtilsLocal.deployStrategyProxy(
            signer,
            strategyContractName,
          );
          await Aave3StrategyV2__factory.connect(strategy.address, signer).initialize(
            core.controller.address,
            underlying,
            vaultAddress,
            50_00,
            []
          );
          return strategy;
        },
        underlying,
        0,
        true
      );
    };
    const hwInitiator = (
      _signer: SignerWithAddress,
      _user: SignerWithAddress,
      _core: CoreContractsWrapper,
      _tools: ToolsContractsWrapper,
      _underlying: string,
      _vault: ISmartVault,
      _strategy: IStrategy,
      _balanceTolerance: number
    ) => {
      return new DoHardWorkLoopBase(
        _signer,
        _user,
        _core,
        _tools,
        _underlying,
        _vault,
        _strategy,
        _balanceTolerance,
        finalBalanceTolerance,
      );
    };

    universalStrategyTest(
      `${strategyContractName} ${tokenName}`,
      deployInfo,
      deployer,
      hwInitiator,
      forwarderConfigurator,
      ppfsDecreaseAllowed,
      balanceTolerance,
      deposit,
      loops,
      loopValue,
      advanceBlocks,
      specificTests,
    );
  });
});
