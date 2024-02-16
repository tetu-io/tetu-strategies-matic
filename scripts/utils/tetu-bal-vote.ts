import axios from "axios";
import {getBalancerGaugesData} from "./tools/voting-utils";

const FREE_VOTES = 43.64;
const OUR_VOTING_POWER = 237000;
const MIN_VALUE_PER_VOTE = 0.18;
const MIN_TOTAL_VALUE = 100;

// const VOTE_MARKET_HH_API = 'https://vm.crvusd.fi/bribes?name=hiddehand';
const HH_API = 'https://api.hiddenhand.finance/proposal/balancer';

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

    console.log(bribe.proposalOption + ';' + percent.toFixed(2));

    totalUsedVotes += percent;
  }

  // console.log('Total used votes', totalUsedVotes);
}

async function getBribesForVotes() {
  const resp = await axios.get(HH_API)
  // console.log(resp);
  const result: BribeInfoHH2[] = resp.data.data;
  // const poolIdToGauges = await getProposalOptions();

  return result.filter(b =>
    b.valuePerVote > MIN_VALUE_PER_VOTE
    && b.totalValue > MIN_TOTAL_VALUE
  ).map(b => {
    return b.bribes.map(bribe => {
      const r: BribeInfoSimple = {
        valuePerVote: b.valuePerVote,
        title: b.title,
        rewards: bribe.value,
        proposalOption: formatProposalOption(b.title, b.proposal),
        poolId: b.poolId.substring(0, 8)
      }
      return r;
    })
  }).flatMap(b => b)
    .filter(b => b.proposalOption !== 'Unknown')
    .sort((a, b) => b.rewards - a.rewards)
}

async function getProposalOptions(): Promise<Map<string, string>> {
  const resp = await getBalancerGaugesData()

  const result = new Map<string, string>();

  for (const d of resp) {
    if (d.isKilled) continue

    const key = d.id.toLowerCase() + '_' + d.chain.toString();

    if (result.has(key)) {
      throw Error('duplicate ' + JSON.stringify(d));
    }

    result.set(key, formatProposalOption(d.symbol, d.gauge.address));
  }

  return result;
}

function formatProposalOption(symbol: string, gauge: string) {
  return `${symbol.trim().substring(0, 23)};${gauge.substring(0, 8)}`;
}

type BribeInfoHH2 = {
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
};

type BribeInfoSimple = {
  title: string
  valuePerVote: number
  // apr: number
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
