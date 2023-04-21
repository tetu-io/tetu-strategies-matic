import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {universalStrategyTest} from "../../UniversalStrategyTest";
import {DeployInfo} from "../../DeployInfo";
import {StrategyTestUtils} from "../../StrategyTestUtils";
import {
    IOvixChainLinkOracleV2,
    ISmartVault,
    IStrategy,
    ZerovixStrategy__factory
} from "../../../../typechain";
import {DeployerUtilsLocal} from "../../../../scripts/deploy/DeployerUtilsLocal";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {CoreContractsWrapper} from "../../../CoreContractsWrapper";
import {ToolsContractsWrapper} from "../../../ToolsContractsWrapper";
import {MaticAddresses} from "../../../../scripts/addresses/MaticAddresses";
import {ethers} from "hardhat";
import {HardWorkForZerovix} from "./HardWorkForZerovix";

chai.use(chaiAsPromised);

describe('Zerovix tests', async () => {
    const infos = [
        [MaticAddresses.ZEROVIX_oDAI, MaticAddresses.DAI_TOKEN],
        [MaticAddresses.ZEROVIX_oWETH, MaticAddresses.WETH_TOKEN],
    ]
    const deployInfo: DeployInfo = new DeployInfo();

    before(async function () {
        await StrategyTestUtils.deployCoreAndInit(deployInfo, false);
    });

    infos.forEach(info => {
        // **********************************************
        // ************** CONFIG*************************
        // **********************************************
        const strategyContractName = 'ZerovixStrategy';
        const vaultName = "ZerovixStrategy_vault";
        const oToken = info[0]
        const underlying = info[1];
        const buyBackRatio = 10_00;
        const forwarderConfigurator = null;
        // only for strategies where we expect PPFS fluctuations
        const ppfsDecreaseAllowed = true;
        // only for strategies where we expect PPFS fluctuations
        const balanceTolerance = 0;
        const finalBalanceTolerance = 0;
        const deposit = 1_000_000;
        // at least 3
        const loops = 3;
        // number of blocks or timestamp value
        const loopValue = 86400;
        // use 'true' if farmable platform values depends on blocks, instead you can use timestamp
        const advanceBlocks = false;
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
                    await ZerovixStrategy__factory.connect(strategy.address, signer).initialize(
                        core.controller.address,
                        underlying,
                        vaultAddress,
                        oToken,
                        buyBackRatio
                    );

                    const oracle = (await ethers.getContractAt('IOvixChainLinkOracleV2', MaticAddresses.ZEROVIX_ORACLE)) as IOvixChainLinkOracleV2
                    const admin = await DeployerUtilsLocal.impersonate(await oracle.admin())
                    await oracle.connect(admin).setHeartbeat(oToken, '1000000000')
                    const gov = await DeployerUtilsLocal.impersonate(await core.controller.governance())
                    await core.feeRewardForwarder.connect(gov).setTokenThreshold(underlying, '0')

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
            return new HardWorkForZerovix(
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