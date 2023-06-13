import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {MaticAddresses} from "../../../../scripts/addresses/MaticAddresses";
import {StrategyTestUtils} from "../../StrategyTestUtils";
import {config as dotEnvConfig} from "dotenv";
import {DeployInfo} from "../../DeployInfo";
import {startConvexStratTest} from "./utils/UniversalConvexStrategyTest";
import {
    ITetuLiquidator__factory,
    IPriceCalculator__factory,
    ITetuLiquidatorController__factory,
} from "../../../../typechain";
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
        deployCoreContracts: {
            type: "boolean",
            default: false,
        },
        hardhatChainId: {
            type: "number",
            default: 137
        },
    }).argv;


chai.use(chaiAsPromised);


describe('Convex am3CRV_amWBTC_amWETH tests', async () => {
    if (argv.disableStrategyTests || argv.hardhatChainId !== 137) {
        return;
    }
    const underlying = MaticAddresses.AM3CRV_AMWBTC_AMWETH_TOKEN;
    const strategyName = 'ConvexStrategyAm3CRVamWBTCamWETH';
    const tokenName = 'am3CRV_amWBTC_amWETH';

    const deployInfo: DeployInfo = new DeployInfo();
    before(async function () {
        await StrategyTestUtils.deployCoreAndInit(deployInfo, argv.deployCoreContracts);

        if (deployInfo.core) {
            const LIQUIDATOR = '0xC737eaB847Ae6A92028862fE38b828db41314772';
            const govSigner = await DeployerUtilsLocal.impersonate('0xbbbbb8C4364eC2ce52c59D2Ed3E56F307E529a94');

            await ITetuLiquidator__factory.connect(LIQUIDATOR, govSigner).addLargestPools([
                {///CurveSwapper256 = amWBTC -> am3CRV
                    pool: '0xdAD97F7713Ae9437fa9249920eC8507e5FbB23d3',
                    swapper: '0xa22b4156bc8FB94CD4B2398aB28D7194223D54aA',
                    tokenIn: '0x5c2ed810328349100A66B82b78a1791B101C9D61',
                    tokenOut: '0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171',
                },
                {///CurveSwapper256 = amWETH -> am3CRV
                    pool: '0xdAD97F7713Ae9437fa9249920eC8507e5FbB23d3',
                    swapper: '0xa22b4156bc8FB94CD4B2398aB28D7194223D54aA',
                    tokenIn: '0x28424507fefb6f7f8E9D3860F56504E4e5f5f390',
                    tokenOut: '0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171',
                },
                {///UniV3Swapper = CRV -> WMATIC
                    pool: '0x4D05f2A005e6F36633778416764E82d1D12E7fbb',
                    swapper: '0x7b505210a0714d2a889E41B59edc260Fa1367fFe',
                    tokenIn: '0x172370d5Cd63279eFa6d502DAB29171933a610AF',
                    tokenOut: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
                },
                { ///UniV3Swapper = WMATIC -> WETH
                    pool: '0x86f1d8390222A3691C28938eC7404A1661E618e0',
                    swapper: '0x7b505210a0714d2a889E41B59edc260Fa1367fFe',
                    tokenIn: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
                    tokenOut: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
                }
            ], true);
            const tools = await DeployerUtilsLocal.getToolsAddresses();
            const calculator = IPriceCalculator__factory.connect(tools.calculator, govSigner);
            let result = await calculator.getPriceWithDefaultOutput(MaticAddresses.AM3CRV_AMWBTC_AMWETH_TOKEN);
        }
    });

    await startConvexStratTest(
        strategyName,
        underlying,
        tokenName,
        deployInfo
    );
});
