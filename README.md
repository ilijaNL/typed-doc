# Typed-Doc

## Fastify usage

1. Install dependencies

```bash
npm i @typed-doc/core @typed-doc/fastify
```

2. Define contract

```typescript
// can be standalone package
export const contract = createContract({
  test: {
    methodType: 'query',
    input: Type.Object({
      test: Type.String(),
    }),
    output: Type.Object({
      response: Type.String(),
    }),
  },
});
```

3. Create fastify plugin from contract

```typescript
import { contract } from '@my-contracts';
import { toPlugin } from '@typed-doc/fastify';

const server = Fastify();

type Context = { fastify: FastifyInstance };

const plugin = toPlugin(contract)<Context>({
  test: {
    resolve: async ({ input: { test } }) => ({ response: test }),
  },
});

server.register(plugin, {
  // create context
  contextFactory: (req): Context => ({ fastify: req.server }),
});
```

4. Call the contract

```typescript
import { createRPCClient } from '@typed-doc/core';
import { contract } from "@my-contracts";
const contractClient = createRPCClient(contract, /* fetch fn implementation */, '/');

// the input and the output will be typed
const { response } = await contractClient.mutate.test({ input: 'input' });
```

## TODO

- [ ] Usage Documentation
- [ ] Implemtation documentation
- [ ] NextJS API middleware
- [ ] ExpressJS middleware
- [ ] React Query implementation
- [ ] Example
