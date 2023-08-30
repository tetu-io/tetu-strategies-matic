import {ethers} from "hardhat";
import axios from "axios";
import {Misc} from "./tools/Misc";
import {config as dotEnvConfig} from "dotenv";

import snapshot from "@snapshot-labs/snapshot.js";
import {Proposal} from "@snapshot-labs/snapshot.js/src/sign/types";

const POLYGON_SNAPSHOT_BLOCK_NUMBER = 45985461
const START_UNIX = Math.floor((new Date('Aug 17 2023 19:00:00 UTC')).getTime() / 1000)
const END_UNIX = Math.floor((new Date('Aug 22 2023 03:00:00 UTC')).getTime() / 1000)

// These gauges will be killed shortly:
// https://forum.balancer.fi/t/bip-262-l2-gauge-migration/4661
// (addresses are lowercased)
const IGNORED_GAUGES = [
  '0xc02b1b15888277b54fb4903ef3dedf4881a8c73a',
  '0x78f50cf01a2fd78f04da1d9acf14a51487ec0347',
  '0xec6ba3d9d9045997552155599e6cc89aa08ffd76',
  '0x8b815a11d0d9eeee6861d1c5510d6faa2c6e3feb',
  '0x97a92edcdd4176b1495bf5da6d9547537a53ed72',
  '0xb8f91ff8cd5005f6274b6c2292cf3cccdbcf32b7',
  '0xa26b3523227e300ff8eca69cd3b0bdcbd2db0313',
  '0x74ce2247ec3f0b87ba0737497e3db8873c184267',
  '0x6823dca6d70061f2ae2aaa21661795a2294812bf',
  '0x709e5d6258aa97f12f3167844cb858696c16f39a',
  '0xd863da50435d9fcf75008f00e49ffd0722291d94',
  '0xa3e3b2c9c7a04894067f106938ca81e279bc3831',
  '0xfb0265841c49a6b19d70055e596b212b0da3f606',
  '0x19ff30f9b2d32bfb0f21f2db6c6a3a8604eb8c2b',
  '0x519cce718fcd11ac09194cff4517f12d263be067',
  '0x5b0c1b84566708dd391ae0fece1a32e33682ee3d',
  '0x359ea8618c405023fc4b98dab1b01f373792a126',
  '0x5a7f39435fd9c381e4932fa2047c9a5136a5e3e7',
  '0x68ebb057645258cc62488fd198a0f0fa3fd6e8fb',
  '0xad2632513bfd805a63ad3e38d24ee10835877d41',
  '0x74d3aa5f9a2863dc22f6cf9c5faaca4e1fc86f75',
  '0xb2102335ea09e0476f886ef7a4e77170235c408e',
  '0x87f678f4f84e5665e1a85a22392ff5a84adc22cd',
  '0xbd734b38f2dc864fe00df51fc4f17d310ed7da4d',
  '0x1e0c21296bf29ee2d56e0abbdfbbedf2530a7c9a',
  '0x90437a1d2f6c0935dd6056f07f05c068f2a507f9',
  '0x21a3de9292569f599e4cf83c741862705bf4f108',
  '0x28d4fe67c68d340fe66cfbcbe8e2cd279d8aa6dd',
  '0x88d07558470484c03d3bb44c3ecc36cafcf43253',
  '0x0db3f34d07682b7c61b0b72d02a26cd3cbdbbdd0',
  '0xcf5938ca6d9f19c73010c7493e19c02acfa8d24d',
  '0xa5a0b6598b90d214eaf4d7a6b72d5a89c3b9a72c',
  '0xd762f3c30a17222c0b8d25afe1f1dcec9816f15b',
  '0xed510769ccf53ea14388fc9d6e98eda5b1a5bac8',
  '0xe42382d005a620faaa1b82543c9c04ed79db03ba',
  '0x6a08fd22bd3b10a8eb322938fcaa0a1b025bf3b3',
  '0x43e4be3a89985c4f1fcb4c2d3bd7e6e0c5df42d3',
  '0x3beeb803124bf0553b1d54301ba18368c74483c6',
  '0x9649d14f2b3300edf690c96fbcb25edc4b52ea05',
  '0x304a75f78c96767a814c36aaa74d622ecf875d36',
  '0x8d7d227746ee06d2532903d6ef1f69d80647c0e7'
]

const TITLE = 'BRV-027: Gauge Weights for 23th August - 06th September 2023'

const BODY = `
The results of this vote be submitted to Balancer and will last for 2 weeks.

TetuBAL docs: https://docs.tetu.io/tetu-io/protocol/products#tetubal
TetuBAL: https://app.tetu.io/tetubal
`.trim()

dotEnvConfig();
// tslint:disable-next-line:no-var-requires
const argv = require('yargs/yargs')()
  .env('TETU')
  .options({
    privateKey: {
      type: "string",
    },
  }).argv;

async function main() {
  const choices = await getGaugeChoices()

  // always include tetu gauges first
  choices.sort((a, b) => {
    if (a.toLowerCase().includes('tetu')) return -1
    return 1
  })

  try {
    const proposal: Proposal = {
      space: 'tetubal.eth',
      type: 'weighted',
      title: TITLE,
      body: BODY,
      choices,
      start: START_UNIX,
      end: END_UNIX,
      snapshot: POLYGON_SNAPSHOT_BLOCK_NUMBER,
      plugins: '{}',
      app: 'snapshot',
      discussion: ''
    }

    if (Misc.getChainName() === 'hardhat') {
      console.log('Dry run, proposal below...')
      console.log(proposal)
    } else {

      console.log(proposal)
      console.log('About to create proposal in 5 seconds...')
      const client = new snapshot.Client712('https://hub.snapshot.org')

      const signer = new ethers.Wallet(argv.privateKey, ethers.provider)

      const resp = await client.proposal(signer, signer.address, proposal)
      console.log(resp)
    }
  } catch (err) {
    console.log(err)
  }

}

async function getGaugeChoices(): Promise<string[]> {
  const resp = await axios.get('https://raw.githubusercontent.com/balancer/frontend-v2/develop/src/data/voting-gauges.json')

  const gaugeChoices = new Map<string, string>();

  for (const d of resp.data) {
    if (d.isKilled) continue
    if (IGNORED_GAUGES.includes(d.address.toLowerCase())) continue

    const truncatedAddr = d.address.substring(0, 8)

    // max length: 32 chars
    // gaugeChoices[d.address.toLowerCase()] = `${d.pool.symbol.trim().substring(0, 23)} (${truncatedAddr})`
    gaugeChoices.set(d.address.toLowerCase(), `${d.pool.symbol.trim().substring(0, 23)} (${truncatedAddr})`);
  }

  return Array.from(gaugeChoices.values()).sort();
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
