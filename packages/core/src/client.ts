import type {
  Contract,
  InputContract,
  InferInput,
  InferOutput,
  PickQueries,
  PickMutations,
  ContractMethod,
  TypedDocument,
  MethodType,
} from './contract';
import { createDocument } from './contract';

type Headers = Record<string, any>;

export type ExecutionFn<T extends ContractMethod> = (
  input: InferInput<T>,
  headers?: Headers
) => Promise<InferOutput<T>>;

export type Executions<C extends Contract> = {
  [P in keyof C]: ExecutionFn<C[P]>;
};

export interface RPCClient<TContract extends Contract> {
  query: Executions<PickQueries<TContract>>;
  mutate: Executions<PickMutations<TContract>>;
}

export type FetchFn = (
  doc: TypedDocument<string, MethodType, any, any>,
  props: { headers: Headers; pathname: string }
) => Promise<any>;

const createExecutionFn = <T extends ContractMethod>(
  contractMethod: T,
  pathname: string,
  fetch: FetchFn
): ExecutionFn<T> => {
  return async function execute(input, headers?: Headers) {
    const doc = createDocument(contractMethod, input);
    const finalHeaders: Headers = {
      'content-type': 'application/json',
      ...headers,
    };
    const result = await fetch(doc, { headers: finalHeaders, pathname });
    return result as InferOutput<T>;
  };
};

/**
 * Create a RPC client from a contract
 * @pathname should be equal to the path which is used on the server
 */
export function createRPCClient<TContract extends Contract<InputContract>>(
  _contract: TContract,
  fetchFn: FetchFn,
  pathname: string
): RPCClient<TContract> {
  const client = (Object.keys(_contract) as Array<keyof TContract>).reduce(
    (agg, key) => {
      const item = _contract[key]!;

      if (item.methodType === 'query') {
        (agg.query as any)[key] = createExecutionFn(item, pathname, fetchFn);
      }

      if (item.methodType === 'mutation') {
        (agg.mutate as any)[key] = createExecutionFn(item, pathname, fetchFn);
      }

      return agg;
    },
    {
      query: {},
      mutate: {},
    } as RPCClient<TContract>
  );

  return client;
}
