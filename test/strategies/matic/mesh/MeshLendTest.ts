import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {readFileSync} from "fs";
import {config as dotEnvConfig} from "dotenv";
import {DeployInfo} from "../../DeployInfo";
import {StrategyTestUtils} from "../../StrategyTestUtils";
import {SpecificStrategyTest} from "../../SpecificStrategyTest";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {CoreContractsWrapper} from "../../../CoreContractsWrapper";
import {ToolsContractsWrapper} from "../../../ToolsContractsWrapper";
import {universalStrategyTest} from "../../UniversalStrategyTest";
import {
  ISmartVault,
  IStrategy,
  MeshLendStrategy__factory,
  StrategyMeshSinglePool__factory
} from "../../../../typechain";
import {DeployerUtilsLocal} from "../../../../scripts/deploy/DeployerUtilsLocal";
import {MeshSinglePoolDoHardWork} from "./MeshSinglePoolDoHardWork";
import {BigNumber} from "ethers";

dotEnvConfig();
// tslint:disable-next-line:no-var-requires
const argv = require('yargs/yargs')()
  .env('TETU')
  .options({
    disableStrategyTests: {
      type: "boolean",
      default: false,
    },
    onlyOneMeshStrategyTest: {
      type: "number",
      default: 1,
    },
    deployCoreContracts: {
      type: "boolean",
      default: true,
    },
    hardhatChainId: {
      type: "number",
      default: 137
    },
  }).argv;

chai.use(chaiAsPromised);

describe('MeshLendStrategy tests', async () => {
  if (argv.disableStrategyTests || argv.hardhatChainId !== 137) {
    return;
  }
  const infos = readFileSync('scripts/utils/download/data/mesh_pools.csv', 'utf8').split(/\r?\n/);
  const deployInfo: DeployInfo = new DeployInfo();
  before(async function () {
    await StrategyTestUtils.deployCoreAndInit(deployInfo, argv.deployCoreContracts);
  });

  infos.forEach(info => {
    const strat = info.split(',');
    const idx = strat[0];
    const meshVaultName = strat[1];
    const meshSinglePoolAddress = strat[2];
    const underlyingName = strat[3];
    const underlyingAddress = strat[4];
    const proxyRewardAddress = strat[5];

    if (idx === 'idx') {
      console.log('skip', idx);
      return;
    }
    if (argv.onlyOneMeshStrategyTest !== -1 && +strat[0] !== argv.onlyOneMeshStrategyTest) {
      return;
    }

    console.log('strat', idx, meshVaultName);
    /* tslint:disable:no-floating-promises */
    // **********************************************
    // ************** CONFIG*************************
    // **********************************************
    const strategyContractName = "MeshLendStrategy";
    const vaultName = "Mesh" + " " + underlyingName;
    const underlying = underlyingAddress;
    const deposit = 100_000;
    const loopValue = 3000;
    const advanceBlocks = true;

    const forwarderConfigurator = null;
    // only for strategies where we expect PPFS fluctuations
    const ppfsDecreaseAllowed = false;
    const balanceTolerance = 0;
    const finalBalanceTolerance = 0;
    // at least 3
    const loops = 3;
    const specificTests: SpecificStrategyTest[] = [];
    // **********************************************


    const deployer = async (signer: SignerWithAddress) => {
      const core = deployInfo.core as CoreContractsWrapper;
      const data = await StrategyTestUtils.deploy(
        signer,
        core,
        vaultName,
        async vaultAddress => {
          const strategy = await DeployerUtilsLocal.deployStrategyProxy(
            signer,
            strategyContractName,
          );
          await MeshLendStrategy__factory.connect(strategy.address, signer).initialize(
            core.controller.address,
            underlying,
            vaultAddress,
            50_00,
            [],
            meshSinglePoolAddress
          );
          return strategy;
        },
        underlying
      );
      return data;
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
      const hw = new MeshSinglePoolDoHardWork(
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
      hw.allowLittleDustInStrategyAfterFullExit = BigNumber.from(10_000);
      // hw.toClaimCheckTolerance = 0.1; // toClaim returns too aprox value
      return hw;
    };

    universalStrategyTest(
      strategyContractName + '_' + vaultName,
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
