import { useState, useEffect, useCallback } from 'react';

/**
 * API call state
 */
export interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * API call result with refetch capability
 */
export interface UseApiResult<T> extends UseApiState<T> {
  refetch: () => Promise<void>;
}

/**
 * Custom hook for API calls with loading/error states
 *
 * @example
 * ```tsx
 * const { data, loading, error, refetch } = useApi(
 *   () => calculateQuote(quoteRequest),
 *   [quoteRequest] // dependencies
 * );
 *
 * if (loading) return <Spinner />;
 * if (error) return <ErrorMessage error={error} />;
 * return <QuoteResults data={data} />;
 * ```
 */
export function useApi<T>(
  apiCall: () => Promise<T>,
  dependencies: unknown[] = [],
  options: {
    immediate?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  } = {}
): UseApiResult<T> {
  const { immediate = true, onSuccess, onError } = options;

  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  // Stringify dependencies to create a stable key
  const depsKey = JSON.stringify(dependencies);

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await apiCall();
      setState({ data: result, loading: false, error: null });
      onSuccess?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setState({ data: null, loading: false, error });
      onError?.(error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey, immediate]);

  return {
    ...state,
    refetch: execute,
  };
}

/**
 * Custom hook for manual API calls (not triggered automatically)
 *
 * @example
 * ```tsx
 * const { execute, loading, error, data } = useApiMutation(
 *   (request) => calculateQuote(request)
 * );
 *
 * const handleSubmit = async () => {
 *   const result = await execute(quoteRequest);
 *   if (result) {
 *     navigate('/results');
 *   }
 * };
 * ```
 */
export function useApiMutation<TInput, TOutput>(
  apiCall: (input: TInput) => Promise<TOutput>,
  options: {
    onSuccess?: (data: TOutput) => void;
    onError?: (error: Error) => void;
  } = {}
): {
  execute: (input: TInput) => Promise<TOutput | null>;
  loading: boolean;
  error: Error | null;
  data: TOutput | null;
  reset: () => void;
} {
  const { onSuccess, onError } = options;

  const [state, setState] = useState<UseApiState<TOutput>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (input: TInput): Promise<TOutput | null> => {
      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const result = await apiCall(input);
        setState({ data: result, loading: false, error: null });
        onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setState({ data: null, loading: false, error });
        onError?.(error);
        return null;
      }
    },
    [apiCall, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    execute,
    ...state,
    reset,
  };
}
