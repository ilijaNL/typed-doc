import { test } from 'tap';
import Fastify, { FastifyInstance } from 'fastify';
import { toPlugin } from '../src';
import { createContract } from '@typed-doc/core';
import { Type } from '@sinclair/typebox';

const contract = createContract({
  // should be normalized
  ['/query']: {
    methodType: 'query',
    input: Type.Object({
      test: Type.String(),
    }),
    output: Type.Object({
      response: Type.String(),
    }),
  },
  mutate: {
    methodType: 'mutation',
    input: Type.Object({
      test: Type.String({ minLength: 3 }),
    }),
    output: Type.Object({
      response: Type.String(),
    }),
  },
});

const buildServer = () => {
  const server = Fastify();
  const plugin = toPlugin(contract)<{ fastify: FastifyInstance }>({
    mutate: {
      resolve: async ({ input: { test } }) => ({ response: test }),
    },
    '/query': {
      resolve: async ({ input: { test } }) => ({ response: test }),
    },
  });

  server.register(plugin, {
    contextFactory: (req) => ({ fastify: req.server }),
  });

  return server;
};

test('happy path', async (t) => {
  const server = buildServer();

  t.teardown(() => {
    server.close();
  });

  // query
  {
    const input = 'wadwdaw';
    const res = await server.inject({
      method: 'GET',
      url: `/query?test=${input}`,
      headers: {},
    });
    t.equal(res.statusCode, 200);
    const body = res.json();
    const { response } = body;
    t.equal(response, input);
  }

  // mutate
  {
    const input = 'awawdaw';
    const res = await server.inject({
      method: 'POST',
      url: `/mutate`,
      payload: {
        test: input,
      },
      headers: {},
    });
    t.equal(res.statusCode, 200);
    const body = res.json();
    const { response } = body;
    t.equal(response, input);
  }
});

test('input validation', async (t) => {
  const server = buildServer();

  t.teardown(() => {
    server.close();
  });

  // mutate with to short input
  {
    const input = 'a';
    const res = await server.inject({
      method: 'POST',
      url: `/mutate`,
      payload: {
        test: input,
      },
      headers: {},
    });
    t.equal(res.statusCode, 400);
    const body = res.json();
    const { message } = body;
    t.equal(message, 'body/test must NOT have fewer than 3 characters');
  }
});
