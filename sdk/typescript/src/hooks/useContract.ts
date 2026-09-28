import { useMemo } from "react";
import { useQuery } from "@apollo/client";

import { GET_CONTRACT } from "./graphql.js";
import {
  mapGraphQLContract,
  type GraphQLContractNode,
  type UseContractOptions,
  type UseContractResult,
} from "./types.js";

interface ContractQueryData {
  contract?: GraphQLContractNode | null;
}

/**
 * Fetch tracked contract metadata via Apollo Client GraphQL.
 *
 * @example
 * ```tsx
 * const { data: contract, loading, error } = useContract({
 *   contractId: "CCAAA...",
 * });
 * ```
 */
export function useContract(options: UseContractOptions): UseContractResult {
  const { contractId, skip = false } = options;

  const queryResult = useQuery<ContractQueryData>(GET_CONTRACT, {
    variables: { contractId },
    skip: skip || !contractId,
  });

  const contract = useMemo(() => {
    const node = queryResult.data?.contract;
    return node ? mapGraphQLContract(node) : undefined;
  }, [queryResult.data]);

  return {
    data: contract,
    loading: queryResult.loading,
    error: queryResult.error as Error | undefined,
    refetch: queryResult.refetch,
  };
}
