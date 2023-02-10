import { Contract, ContractImpl, toServer } from '@typed-doc/core';
import { FastifyPluginCallback, FastifyReply, FastifyRequest, RouteShorthandOptions } from 'fastify';

type Options<Context> = {
  contextFactory: (req: FastifyRequest, reply: FastifyReply) => Context | Promise<Context>;
};

function normalizeRoute(route: string) {
  if (route.startsWith('/')) {
    return route;
  }

  return `/${route}`;
}

export function getContextFromRequest<T>(req: FastifyRequest) {
  return (req as any).req_context as T;
}

/**
 * Implements contract as a fastify plugin
 * @param contract
 * @returns
 */
export const toPlugin =
  <T extends Contract>(contract: T) =>
  <TContext = unknown>(
    impl: ContractImpl<TContext, Omit<RouteShorthandOptions, 'schema'>, T>
  ): FastifyPluginCallback<Options<TContext>> => {
    const server = toServer(contract)(impl);

    return function register(fastify, options, done) {
      fastify.decorateRequest('req_context', null);
      fastify.addHook('onRequest', async (request, reply) => {
        // get app_id from headers
        (request as any).req_context = await Promise.resolve(options.contextFactory(request, reply));
      });

      // registery mutations
      (Object.entries(server) as [string, (typeof server)[keyof T]][])
        .filter(([, spec]) => spec.methodType === 'mutation')
        .forEach(([method, spec]) => {
          fastify.post(
            normalizeRoute(method),
            { ...spec.extensions, schema: { body: spec.input, response: { '2xx': spec.output } } },
            async (req) => {
              const ctx = getContextFromRequest<TContext>(req);
              return spec.resolve({ context: ctx, input: req.body as any });
            }
          );
        });

      // registery queries
      (Object.entries(server) as [string, (typeof server)[keyof T]][])
        .filter(([, spec]) => spec.methodType === 'query')
        .forEach(([method, spec]) => {
          fastify.get(
            normalizeRoute(method),
            { schema: { querystring: spec.input, response: { '2xx': spec.output } } },
            async (req) => {
              const ctx = getContextFromRequest<TContext>(req);
              return spec.resolve({ context: ctx, input: req.query as any });
            }
          );
        });

      done();
    };
  };
