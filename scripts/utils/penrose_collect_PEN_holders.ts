import {DeployerUtilsLocal} from "../../scripts/deploy/DeployerUtilsLocal";
import {
  IERC20__factory,
  IERC20Metadata__factory,
  ISmartVault__factory,
  IUserProxy__factory,
  IVotingSnapshot__factory,
} from "../../typechain";
import {formatUnits} from "ethers/lib/utils";
import {Web3Utils} from "../../scripts/utils/tools/Web3Utils";
import {appendFileSync, writeFileSync} from "fs";

const vlPEN = '0x55CA76E0341ccD35c2E3F34CbF767C6102aea70f';
const VOTER_SNAPSHOT = '0xC166e512ef3127e835Ffe96a5F87014DEf46A904'

async function main() {
  const signer = await DeployerUtilsLocal.impersonate('0xcc16d636dD05b52FF1D8B9CE09B09BC62b11412B');

  const curBlock = await signer.provider?.getBlockNumber() || 0;

  const topic = ISmartVault__factory.createInterface().getEventTopic(IERC20__factory.createInterface().getEvent('Transfer'));
  const logs = await Web3Utils.parseLogs(
    ['0x9008D70A5282a936552593f410AbcBcE2F891A97'],
    [topic],
    28_829_312,
    // 29141312
    curBlock
  );
  console.log('logs', logs.length);
  const holders = new Map<string, number>();
  let balance = 0;
  for (const log of logs) {
    const l = IERC20__factory.createInterface().parseLog(log)
    const value = +formatUnits(l.args.value);
    const from = l.args.from.toLowerCase();
    const to = l.args.to.toLowerCase();
    if (to === vlPEN.toLowerCase()) {
      if (!holders.has(from)) {
        holders.set(from, 0);
      }
      holders.set(from, (holders.get(from) || 0) + value);
      // console.log('DEPOSIT', from, value);
      balance += value;
    }
    if (from === vlPEN.toLowerCase()) {
      holders.set(to, (holders.get(to) || 0) - value);
      // console.log('WITHDRAW', to, value.toFixed(0));
      balance -= value;
    }
  }

  writeFileSync('tmp/holders.txt', '', 'utf8');
  for (const holder of holders.keys()) {

    let owner = holder;
    try {
      owner = await IUserProxy__factory.connect(holder, signer).ownerAddress();
    } catch (e) {
    }

    let votes = '';
    let userTotalVotes = 0;
    const votesLength = await IVotingSnapshot__factory.connect(VOTER_SNAPSHOT, signer).votesLengthByAccount(holder);
    for (let i = 0; i < votesLength.toNumber(); i++) {
      const vote = await IVotingSnapshot__factory.connect(VOTER_SNAPSHOT, signer).accountVoteByIndex(holder, i);
      const name = await IERC20Metadata__factory.connect(vote.poolAddress, signer).symbol()
      votes += `${name} = ${formatUnits(vote.weight)};`;
      userTotalVotes += +formatUnits(vote.weight);
    }


    console.log(holder, holders.get(holder)?.toFixed(0));
    appendFileSync('tmp/holders.txt', `${owner};${holders.get(holder)?.toFixed(0)};${userTotalVotes};${votes}\n`, 'utf8');
  }
  console.log("HOLDERS", holders.size);
  console.log("BALANCE", balance);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
