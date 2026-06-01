import { gql } from "@apollo/client";

import { graphqlRequest } from "./graphql";
import type { Contract, ContractFormData, BackfillTask } from "./contract-types";

interface WebhookSubscriptionSummary {
  id: string;
  contractId: string;
  eventType: string;
  targetUrl: string;
  isActive: boolean;
}

export const LIST_CONTRACTS_QUERY = `
  query ListContracts {
    contracts {
      id
      contractId
      name
      description
      tags
      status
      eventCount
      createdAt
      updatedAt
    }
  }
`;

export const GET_CONTRACT_QUERY = `
  query GetContract($id: String!) {
    contract(id: $id) {
      id
      contractId
      name
      description
      tags
      status
      eventCount
      createdAt
      updatedAt
    }
  }
`;

export const REGISTER_CONTRACT_MUTATION = `
  mutation RegisterContract($input: ContractInput!) {
    registerContract(input: $input) {
      id
      contractId
      name
      description
      tags
      status
      eventCount
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_CONTRACT_MUTATION = `
  mutation UpdateContract($id: String!, $input: ContractInput!) {
    updateContract(id: $id, input: $input) {
      id
      contractId
      name
      description
      tags
      status
      eventCount
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_CONTRACT_MUTATION = `
  mutation DeleteContract($id: String!) {
    deleteContract(id: $id) {
      success
    }
  }
`;

export const TRIGGER_BACKFILL_MUTATION = `
  mutation TriggerBackfill($contractId: String!) {
    triggerBackfill(contractId: $contractId) {
      taskId
      contractId
      status
      message
    }
  }
`;

export const GET_CONTRACT_RATE_QUERY = gql`
  query GetContractRate($contractId: String!) {
    contract(id: $contractId) {
      id
      maxEventsPerMinute
      events {
        totalCount
      }
      recentEvents: events(first: 10) {
        edges {
          node {
            timestamp
          }
        }
      }
    }
  }
`;

export async function listContracts(): Promise<Contract[]> {
  const data = await graphqlRequest<{ contracts: Contract[] }, Record<string, never>>(
    LIST_CONTRACTS_QUERY,
    {}
  );
  return data.contracts;
}

export async function getContract(id: string): Promise<Contract> {
  const data = await graphqlRequest<{ contract: Contract }, { id: string }>(
    GET_CONTRACT_QUERY,
    { id }
  );
  return data.contract;
}

export async function registerContract(input: ContractFormData): Promise<Contract> {
  const data = await graphqlRequest<
    { registerContract: Contract },
    { input: ContractFormData }
  >(REGISTER_CONTRACT_MUTATION, { input });
  return data.registerContract;
}

export async function updateContract(
  id: string,
  input: ContractFormData
): Promise<Contract> {
  const data = await graphqlRequest<
    { updateContract: Contract },
    { id: string; input: ContractFormData }
  >(UPDATE_CONTRACT_MUTATION, { id, input });
  return data.updateContract;
}

export async function deleteContract(id: string): Promise<boolean> {
  const data = await graphqlRequest<
    { deleteContract: { success: boolean } },
    { id: string }
  >(DELETE_CONTRACT_MUTATION, { id });
  return data.deleteContract.success;
}

export async function triggerBackfill(contractId: string): Promise<BackfillTask> {
  const data = await graphqlRequest<
    { triggerBackfill: BackfillTask },
    { contractId: string }
  >(TRIGGER_BACKFILL_MUTATION, { contractId });
  return data.triggerBackfill;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function listWebhooks(): Promise<WebhookSubscriptionSummary[]> {
  const response = await fetch(`${API_BASE}/api/webhooks/`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to load webhooks: ${response.status}`);
  }
  const data = await response.json();
  return (data.results ?? data).map((wh: Record<string, unknown>) => ({
    id: String(wh.id),
    contractId: String(wh.contract_id ?? ""),
    eventType: String(wh.event_type ?? ""),
    targetUrl: String(wh.target_url ?? ""),
    isActive: Boolean(wh.is_active),
  }));
}
