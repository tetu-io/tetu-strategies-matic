import {MaticAddresses} from "../../../../scripts/addresses/MaticAddresses";
import {DeployInfo} from "../../DeployInfo";
import {StrategyTestUtils} from "../../StrategyTestUtils";
import {balancerUniversalTest} from "./universal-test";

describe('BalancerBPT_MaticX-MATIC_Test', async () => {
  const deployInfo: DeployInfo = new DeployInfo();
  before(async function () {
    await StrategyTestUtils.deployCoreAndInit(deployInfo, true);
  });


  // **********************************************
  // ************** CONFIG*************************
  // **********************************************

  const underlying = MaticAddresses.BALANCER_MATICX_BOOSTED_AAVE3;
  const poolId = MaticAddresses.BALANCER_MATICX_BOOSTED_AAVE3_ID;
  const gauge = MaticAddresses.BALANCER_MATICX_BOOSTED_AAVE3_GAUGE;
  const isCompound = true;
  const depositToken = MaticAddresses.MATIC_X;
  const buyBackRatio = 5_00;

  await balancerUniversalTest(
    deployInfo,
    underlying,
    poolId,
    gauge,
    isCompound,
    depositToken,
    buyBackRatio,
  )

});
