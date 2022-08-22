import {ethers} from "hardhat";
import {DeployerUtilsLocal} from "../../DeployerUtilsLocal";
import {
  IBookkeeper__factory, IStrategy__factory,
  StrategyMeshSinglePool,
  StrategyMeshSinglePool__factory,
} from "../../../../typechain";
import {appendFileSync, readFileSync} from "fs";

const strategyContractName = 'StrategyMeshSinglePool';


async function main() {
  const signer = (await ethers.getSigners())[0];
  const core = await DeployerUtilsLocal.getCoreAddresses();

  const bookkeeper = IBookkeeper__factory.connect(core.bookkeeper, signer);
  const splitters = new Map<string, string>();
  console.log('loading strategies...');
  const strategies = await bookkeeper.strategies();
  console.log('strategies', strategies);

  for (const strategy of strategies) {
    console.log('strategy', strategy);
    const str = IStrategy__factory.connect(strategy, signer);
    if ((await str.platform()) === 24) {
      const und = (await str.underlying()).toLowerCase();
      console.log('und', und);
      if (splitters.has(und)) {
        throw new Error('duplicate splitter ' + strategy);
      }
      splitters.set(und, strategy);
    }
  }


  const infos = readFileSync('scripts/utils/download/data/mesh_pools.csv', 'utf8').split(/\r?\n/);
  for (const info of infos) {
    console.log('info', info);

    const strat = info.split(',');
    const idx = strat[0];
    const meshSinglePoolAddress = strat[2];
    const underlyingName = strat[3];
    const underlying = strat[4];
    const proxyRewardAddress = strat[5];

    if (idx !== '0') {
      console.log('skip', idx);
      continue;
    }

    console.log('/// DEPLOY ' + underlyingName);

    const splitter = splitters.get(underlying.toLowerCase()) || '';
    if (splitter === '') {
      throw Error('no splitter for ' + underlying);
    }

    const [proxy, logic] = await DeployerUtilsLocal.deployTetuProxyControlled(signer, strategyContractName);
    await StrategyMeshSinglePool__factory.connect(proxy.address, signer).initialize(
      core.controller,
      splitter,
      underlying,
      proxyRewardAddress,
      meshSinglePoolAddress
    );

    const txt = `${underlyingName} spliter: ${splitter} strategy: ${proxy.address}\n`;
    appendFileSync(`./tmp/deployed/${strategyContractName}.txt`, txt, 'utf8');

    await DeployerUtilsLocal.wait(5);
    await DeployerUtilsLocal.verify(logic.address);
    await DeployerUtilsLocal.verifyWithArgs(proxy.address, [logic.address]);
    await DeployerUtilsLocal.verifyProxy(proxy.address);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
