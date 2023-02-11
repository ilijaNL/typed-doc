import { Static, TObject } from '@sinclair/typebox';

// Contract stuff
export type MethodType = 'query' | 'mutation';

export interface RPC<Type, Input extends TObject = TObject, Output extends TObject = TObject> {
  methodType: Type;
  input: Input;
  output: Output;
}

export interface InputContract {
  [method: string]: RPC<MethodType, TObject, TObject>;
}

export type ContractMethod<Method = string, T extends RPC<MethodType> = RPC<MethodType>> = {
  method: Method;
} & T;

export type Contract<T extends InputContract = InputContract> = {
  [P in keyof T]: ContractMethod<P, T[P]>;
};

export type PickByValue<T, ValueType> = Pick<
  T,
  { [Key in keyof T]-?: T[Key] extends ValueType ? Key : never }[keyof T]
>;

export type PickQueries<T extends Contract> = PickByValue<T, { methodType: 'query' }>;
export type PickMutations<T extends Contract> = PickByValue<T, { methodType: 'mutation' }>;

export type InferInput<T extends ContractMethod> = Static<T['input']>;
export type InferOutput<T extends ContractMethod> = Static<T['output']>;

interface ServerProcedure<TContext, Extensions, T extends ContractMethod> {
  resolve: ResolveFunction<TContext, InferInput<T>, InferOutput<T>>;
  extensions: Extensions;
}

interface ContractImplProcedure<TContext, T extends ContractMethod, Extensions = any> {
  extensions?: Extensions;
  resolve: ResolveFunction<TContext, InferInput<T>, InferOutput<T>>;
}

export type ContractImpl<TContext, Extensions, TC extends Contract> = {
  [P in keyof TC]: ContractImplProcedure<TContext, TC[P], Extensions>;
};

export type Server<TContext, Extensions, TC extends Contract> = {
  [P in keyof TC]: ServerProcedure<TContext, Extensions, TC[P]> & TC[P];
};

export interface ResolveFunction<Context = any, Input = any, Output = any> {
  (params: { context: Context; input: Input }): Promise<Output> | Output;
}

// client
export type TypedDocument<Method extends string, Type extends MethodType, Input, Output> = {
  method: Method;
  methodType: Type;
  input: Input;
  /**
   * This type is used to ensure that the variables you pass in to the query are assignable to Variables
   * and that the Result is assignable to whatever you pass your result to. The method is never actually
   * implemented, but the type is valid because we list it as optional
   */
  __apiType?: (variables: Input) => Output;
};

export function createContract<T extends InputContract>(specification: T): Contract<T> {
  const contract = (Object.keys(specification) as Array<keyof T>).reduce((agg, key) => {
    agg[key] = {
      ...specification[key],
      method: key,
    } as ContractMethod<typeof key, T[typeof key]>;

    return agg;
  }, {} as Contract<T>);

  return contract;
}

export function toServer<T extends Contract>(contract: T) {
  return function implement<Context, Extensions extends Record<string, any> = {}>(
    impl: ContractImpl<Context, Extensions, T>
  ): Server<Context, Extensions, T> {
    return (Object.keys(impl) as Array<Extract<keyof T, string>>).reduce((agg, key) => {
      agg[key] = {
        ...impl[key],
        ...contract[key],
        extensions: impl[key].extensions ?? {},
      };
      return agg;
    }, {} as Server<Context, Extensions, T>);
  };
}

export function createDocument<T extends ContractMethod>(contract: T, input: InferInput<T>) {
  const doc: TypedDocument<T['method'], T['methodType'], InferInput<T>, InferOutput<T>> = {
    methodType: contract.methodType,
    method: contract.method,
    input: input,
  };
  return doc;
}
