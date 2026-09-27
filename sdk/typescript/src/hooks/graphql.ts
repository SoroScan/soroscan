import { gql } from "@apollo/client";

export const GET_EVENTS = gql`
  query SdkGetEvents(
    $contractId: String
    $eventType: String
    $first: Int!
    $after: String
  ) {
    events(
      contractId: $contractId
      eventType: $eventType
      first: $first
      after: $after
    ) {
      edges {
        cursor
        node {
          id
          eventType
          contractId
          contractName
          payload
          ledger
          eventIndex
          timestamp
          txHash
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

export const SUBSCRIBE_CONTRACT_EVENTS = gql`
  subscription SdkSubscribeContractEvents($contractId: String!) {
    contractEvents(contractId: $contractId) {
      id
      eventType
      contractId
      payload
      ledger
      eventIndex
      timestamp
      txHash
    }
  }
`;

export const GET_CONTRACT = gql`
  query SdkGetContract($contractId: String!) {
    contract(contractId: $contractId) {
      id
      contractId
      name
      alias
      description
      isActive
      lastEventAt
      eventCount
      createdAt
    }
  }
`;
