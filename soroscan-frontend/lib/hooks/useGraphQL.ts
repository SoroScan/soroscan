import { useQuery, useMutation, type QueryHookOptions, type MutationHookOptions } from '@apollo/client';
import type { DocumentNode } from 'graphql';
import type { OperationVariables } from '@apollo/client';
import { parseGraphQLError, type ParsedGraphQLError } from '@/lib/graphql-error-parser';

/**
 * Custom hook wrapper for Apollo useQuery with structured error handling.
 *
 * Integration (FE-5 / FE-22):
 *   - FE-5: pass a typed DocumentNode from `src/generated/graphql.ts` as `query`.
 *   - FE-22: consume `parsedError` in a page-level error layout or pass it to
 *     `<GraphQLErrorDisplay error={parsedError} variant="banner" />`.
 */
export function useGraphQLQuery<TData = unknown, TVariables extends OperationVariables = OperationVariables>(
  query: DocumentNode,
  options?: QueryHookOptions<TData, TVariables>
) {
  const result = useQuery<TData, TVariables>(query, {
    ...options,
    onError: (error) => {
      console.error('[GraphQL Query Error]', error.message);
      options?.onError?.(error);
    },
  });

  const parsedError: ParsedGraphQLError | null = result.error
    ? parseGraphQLError(result.error)
    : null;

  return {
    ...result,
    isLoading: result.loading,
    isError: !!result.error,
    /** Structured, user-friendly error — feed directly into GraphQLErrorDisplay. */
    parsedError,
  };
}

/**
 * Custom hook wrapper for Apollo useMutation with structured error handling.
 *
 * Integration (FE-5 / FE-22):
 *   - FE-5: pass a typed DocumentNode from `src/generated/graphql.ts` as `mutation`.
 *   - FE-22: consume `parsedError` in an inline form error block or toast.
 */
export function useGraphQLMutation<TData = unknown, TVariables extends OperationVariables = OperationVariables>(
  mutation: DocumentNode,
  options?: MutationHookOptions<TData, TVariables>
) {
  const [mutate, result] = useMutation<TData, TVariables>(mutation, {
    ...options,
    onError: (error) => {
      console.error('[GraphQL Mutation Error]', error.message);
      options?.onError?.(error);
    },
  });

  const parsedError: ParsedGraphQLError | null = result.error
    ? parseGraphQLError(result.error)
    : null;

  return [
    mutate,
    {
      ...result,
      isLoading: result.loading,
      isError: !!result.error,
      /** Structured, user-friendly error — feed directly into GraphQLErrorDisplay. */
      parsedError,
    },
  ] as const;
}
