import { useCallback, useMemo } from "react";
import { useQuery, useSubscription } from "@apollo/client";

import { GET_EVENTS, SUBSCRIBE_CONTRACT_EVENTS } from "./graphql.js";
import {
  mapGraphQLEvent,
  type GraphQLEventNode,
  type UseEventsOptions,
  type UseEventsResult,
} from "./types.js";

interface EventsQueryData {
  events?: {
    edges: Array<{ node: GraphQLEventNode; cursor: string }>;
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    totalCount: number;
  };
}

/**
 * Fetch and optionally subscribe to contract events via Apollo Client.
 *
 * Wrap your app in `ApolloProvider` pointing at the SoroScan GraphQL endpoint.
 *
 * @example
 * ```tsx
 * const { data, loading, error, latestEvent } = useEvents({
 *   contractId: "CCAAA...",
 *   subscribe: true,
 * });
 * ```
 */
export function useEvents(options: UseEventsOptions): UseEventsResult {
  const { contractId, eventType, first = 20, subscribe = false, skip = false } = options;

  const queryResult = useQuery<EventsQueryData>(GET_EVENTS, {
    variables: { contractId, eventType, first, after: null },
    skip: skip || !contractId,
    notifyOnNetworkStatusChange: true,
  });

  const subscriptionResult = useSubscription<{ contractEvents: GraphQLEventNode }>(
    SUBSCRIBE_CONTRACT_EVENTS,
    {
      variables: { contractId },
      skip: skip || !contractId || !subscribe,
    }
  );

  const events = useMemo(
    () =>
      (queryResult.data?.events?.edges ?? []).map((edge) =>
        mapGraphQLEvent(edge.node)
      ),
    [queryResult.data]
  );

  const latestEvent = useMemo(() => {
    const node = subscriptionResult.data?.contractEvents;
    return node ? mapGraphQLEvent(node) : undefined;
  }, [subscriptionResult.data]);

  const fetchMore = useCallback(async () => {
    const pageInfo = queryResult.data?.events?.pageInfo;
    if (!pageInfo?.hasNextPage || !pageInfo.endCursor) {
      return;
    }
    await queryResult.fetchMore({
      variables: {
        contractId,
        eventType,
        first,
        after: pageInfo.endCursor,
      },
    });
  }, [contractId, eventType, first, queryResult]);

  const error =
    (queryResult.error as Error | undefined) ??
    (subscriptionResult.error as Error | undefined);

  return {
    data: events,
    loading: queryResult.loading,
    error,
    latestEvent,
    refetch: queryResult.refetch,
    fetchMore,
    hasNextPage: queryResult.data?.events?.pageInfo.hasNextPage ?? false,
  };
}
