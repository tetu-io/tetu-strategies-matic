import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {universalStrategyTest} from "../../UniversalStrategyTest";
import {DeployInfo} from "../../DeployInfo";
import {StrategyTestUtils} from "../../StrategyTestUtils";
import {
    Compound3Strategy__factory,
    ISmartVault,
    IStrategy
} from "../../../../typechain";
import {DeployerUtilsLocal} from "../../../../scripts/deploy/DeployerUtilsLocal";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {CoreContractsWrapper} from "../../../CoreContractsWrapper";
import {ToolsContractsWrapper} from "../../../ToolsContractsWrapper";
import {DoHardWorkLoopBase} from "../../DoHardWorkLoopBase";

chai.use(chaiAsPromised);

describe('Compound3 tests', async () => {
    const infos = ['0xF25212E676D1F7F89Cd72fFEe66158f541246445,0x2791bca1f2de4661ed88a30c99a7a9449aa84174']
    const deployInfo: DeployInfo = new DeployInfo();

    before(async function () {
        await StrategyTestUtils.deployCoreAndInit(deployInfo, false);
    });

    infos.forEach(info => {
        const strat = info.split(',');
        // **********************************************
        // ************** CONFIG*************************
        // **********************************************
        const strategyContractName = 'Compound3Strategy';
        const vaultName = "Compound3Strategy_vault";
        const comet = strat[0]
        const underlying = strat[1];
        const buyBackRatio = 1_000;
        const forwarderConfigurator = null;
        // only for strategies where we expect PPFS fluctuations
        const ppfsDecreaseAllowed = true;
        // only for strategies where we expect PPFS fluctuations
        const balanceTolerance = 0;
        const finalBalanceTolerance = 0;
        const deposit = 1000_000;
        // at least 3
        const loops = 3;
        // number of blocks or timestamp value
        const loopValue = 3000;
        // use 'true' if farmable platform values depends on blocks, instead you can use timestamp
        const advanceBlocks = true;
        const specificTests = null;
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
                    await Compound3Strategy__factory.connect(strategy.address, signer).initialize(
                        core.controller.address,
                        underlying,
                        vaultAddress,
                        comet,
                        buyBackRatio
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
            `${strategyContractName} ${vaultName}`,
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
    })
})