import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {MaticAddresses} from "../../../../scripts/addresses/MaticAddresses";
import {DeployInfo} from "../../DeployInfo";
import {StrategyTestUtils} from "../../StrategyTestUtils";
import {SpecificStrategyTest} from "../../SpecificStrategyTest";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {CoreContractsWrapper} from "../../../CoreContractsWrapper";
import {DeployerUtilsLocal} from "../../../../scripts/deploy/DeployerUtilsLocal";
import {Aave3Strategy__factory, ISmartVault, IStrategy, StrategyTetuMeshLp__factory} from "../../../../typechain";
import {ToolsContractsWrapper} from "../../../ToolsContractsWrapper";
import {DoHardWorkLoopBase} from "../../DoHardWorkLoopBase";
import {universalStrategyTest} from "../../UniversalStrategyTest";
import {ethers, network} from "hardhat";
import {config as dotEnvConfig} from "dotenv";

dotEnvConfig();

const {expect} = chai;
chai.use(chaiAsPromised);

describe('Aave3 Strategy tests', async () => {
    const deployInfo: DeployInfo = new DeployInfo();
    before(async function () {
        console.log(await ethers.provider.getNetwork(), network.name);
        await StrategyTestUtils.deployCoreAndInit(deployInfo, true);
    });


    // **********************************************
    // ************** CONFIG*************************
    // **********************************************
    const strategyContractName = 'Aave3Strategy';
    const vaultName = "Aave3Strategy_vault";
    const underlying = MaticAddresses.DAI_TOKEN;
    // const underlying = token;
    // add custom liquidation path if necessary
    const forwarderConfigurator = null;
    // only for strategies where we expect PPFS fluctuations
    const ppfsDecreaseAllowed = false;
    // only for strategies where we expect PPFS fluctuations
    const balanceTolerance = 0;
    const finalBalanceTolerance = 0;
    const deposit = 10_000;
    // at least 3
    const loops = 3;
    const loopValue = 300;
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
                await Aave3Strategy__factory.connect(strategy.address, signer).initialize(
                    core.controller.address,
                    underlying,
                    vaultAddress
                );

                // await core.vaultController.addRewardTokens([vaultAddress], MaticAddresses.tetuMESH_TOKEN);
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

    await universalStrategyTest(
        strategyContractName + vaultName,
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
