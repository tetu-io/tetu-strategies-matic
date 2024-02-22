import { DocumentNode, gql } from '@apollo/client/core';

export function getAllUsersOnBlockQuery(): DocumentNode {
  return gql`
      query GetAllUsersOnBlock($block: Int!, $address: String!) {
          userEntities(
              block: {number: $block}
              where: {id_gt:$address}
              orderBy: id
              orderDirection: desc
              first: 1000
          ) {
              id
              balance
          }
      }
  `;
}