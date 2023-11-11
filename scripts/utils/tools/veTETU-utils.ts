/* tslint:disable:no-string-literal */
import fetch from 'node-fetch';

const GRAPHQL_ENDPOINT = 'https://api.thegraph.com/subgraphs/name/tetu-io/tetu-v2'

// tslint:disable-next-line:no-var-requires
const {request, gql} = require('graphql-request')

// tslint:disable-next-line:no-any
export async function getVeTetuHolders(top: number): Promise<any> {
  return request(
    GRAPHQL_ENDPOINT,
    gql`
        query ve {
            veTetuEntities {
                id
                count
                tokens{
                    address
                    weight
                    supply
                    token {
                        id
                        symbol
                        usdPrice
                    }
                }
                lockedAmountUSD
                nfts(first: ${top}, orderBy: derivedAmount, orderDirection: desc) {
                    veNFTId
                    derivedAmount
                    lockedAmountUSD
                    lockedEnd
                    locked {
                        token
                        amount
                        amountUSD
                    }
                    user {
                        id
                    }
                }
            }
        }
    `
  );
}
