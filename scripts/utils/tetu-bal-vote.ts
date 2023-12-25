import axios from "axios";
import {getBalancerGaugesData} from "./tools/voting-utils";

const FREE_VOTES = 31.66;
const OUR_VOTING_POWER = 466000;

const VOTE_MARKET_HH_API = 'https://vm.crvusd.fi/bribes?name=hiddehand';

async function main() {
  const bribesForVote = await getBribesForVotes();
  console.log(bribesForVote)

  const totalFreeVotes = OUR_VOTING_POWER * FREE_VOTES / 100;
  const totalRewards = bribesForVote.reduce((a, b) => a + b.rewards, 0);

  console.log('Total free votes', totalFreeVotes);
  console.log('Total rewards', totalRewards);
  console.log('Average $ per vote', totalRewards / totalFreeVotes);

  let totalUsedVotes = 0;
  for (const bribe of bribesForVote) {
    const ratio = bribe.rewards / totalRewards;
    const votes = totalFreeVotes * ratio;
    const percent = votes / OUR_VOTING_POWER * 100;

    console.log(bribe.poolId, percent.toFixed(2)); // todo change to proposalOption

    totalUsedVotes += percent;
  }

  // console.log('Total used votes', totalUsedVotes);
}

async function getBribesForVotes() {
  const resp = await axios.get(VOTE_MARKET_HH_API)
  const result: BribeInfoHH[] = resp.data

  const poolIdToGauges = await getProposalOptions();

  return result.filter(b =>
    b.apr * 100 > 20
    && b.totalValue > 500
  ).map(b => {
    const r: BribeInfoSimple = {
      apr: b.apr * 100,
      title: b.title,
      rewards: b.totalValue,
      proposalOption: poolIdToGauges.get(b.poolId.toLowerCase()) ?? 'Unknown',
      poolId: b.poolId.substring(0, 8)
    }
    return r;
  }).filter(b => b.proposalOption !== 'Unknown')
    .sort((a, b) => b.rewards - a.rewards)
}

async function getProposalOptions(): Promise<Map<string, string>> {
  const resp = await getBalancerGaugesData()

  const result = new Map<string, string>();

  for (const d of resp) {
    if (d.isKilled) continue

    const truncatedAddr = d.gauge.address.substring(0, 8)
    result.set(d.id.toLowerCase(), `${d.symbol.trim().substring(0, 23)} (${truncatedAddr})`);
  }

  return result;
}

type BribeInfoHH = {
  proposal: string,
  proposalHash: string,
  title: string,
  proposalDeadline: number,
  totalValue: number
  maxTotalValue: number
  voteCount: number
  valuePerVote: number
  maxValuePerVote: number
  bribes: {
    token: string,
    symbol: string,
    decimals: number
    value: number
    maxValue: number
    amount: number
    maxTokensPerVote: number
    briber: string,
    periodIndex: number,
    chainId: number,
    tokenImage: string
  }[],
  poolId: string,
  totalReward: number,
  apr: number,
  totalVotes: number
};

type BribeInfoSimple = {
  title: string
  apr: number
  rewards: number
  proposalOption: string,
  poolId: string
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
