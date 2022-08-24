import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {config as dotEnvConfig} from "dotenv";
import {DeployInfo} from "../../DeployInfo";
import {SpecificStrategyTest} from "../../SpecificStrategyTest";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {CoreContractsWrapper} from "../../../CoreContractsWrapper";
import {ToolsContractsWrapper} from "../../../ToolsContractsWrapper";
import {universalStrategyTest} from "../../UniversalStrategyTest";
import {ISmartVault, IStrategy, StrategyMeshSinglePool__factory} from "../../../../typechain";
import {MeshSinglePoolDoHardWork} from "./MeshSinglePoolDoHardWork";
import {
  meshSinglePoolAddress,
  proxyRewardAddress,
  underlying
} from "../../../../scripts/deploy/strategies/mesh/MeshSinglePoolMaticXDeployLib";
import {StrategyTestUtils} from "../../StrategyTestUtils";
import {DeployerUtilsLocal} from "../../../../scripts/deploy/DeployerUtilsLocal";

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

describe('Universal Mesh tests', async () => {
  if (argv.disableStrategyTests || argv.hardhatChainId !== 137) {
    return;
  }
  const deployInfo: DeployInfo = new DeployInfo();
  before(async function () {
    // await deployMeshMaticXStrategy();
  });

  /* tslint:disable:no-floating-promises */
  // **********************************************
  // ************** CONFIG*************************
  // **********************************************
  const underlyingName = 'MaticX'
  const strategyContractName = "StrategyMeshSinglePool";
  const vaultName = "Mesh" + " " + underlyingName;
  const deposit = 100_000;
  const loopValue = 60 * 60 * 24;
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

  /*const deployer = async (signer: SignerWithAddress): Promise<[ISmartVault, IStrategy, string]> => {
    const {vault, splitter, strategy} = await deployMeshMaticXStrategy(signer);
    const rewardTokenLp = '';
    return [vault, splitter as IStrategy, rewardTokenLp];
  };*/

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
        await StrategyMeshSinglePool__factory.connect(strategy.address, signer).initialize(
          core.controller.address,
          vaultAddress,
          underlying,
          proxyRewardAddress,
          meshSinglePoolAddress
        );
        return strategy;
      },
      underlying
    );
    console.log('data', data);
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
    hw.toClaimCheckTolerance = 0.1; // toClaim returns too approx value
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
