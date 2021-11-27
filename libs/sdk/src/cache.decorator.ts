import cacheManager from 'cache-manager';

export const cache = cacheManager.caching({ store: 'memory', ttl: 60 });

/**
 * This is a custom helper function to make it easier to cache method results.
 * It is written specifically for this project, and may not work in a generic way in another project.
 * There are limited tests written in cache.decorator.spec.ts
 */
export function cacheable(ttlSecs?: number) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<any>,
  ) {
    const originalFn = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const className = target.constructor.name;

      const methodName = originalFn.name;

      const argsKey = args
        .map((arg) => {
          if (Array.isArray(arg)) {
            return `[${arg.join(',')}]`;
          }
          return arg?.toString() ?? 'undefined';
        })
        .join(',');

      const key = `${className}.${methodName}(${argsKey})`;

      const result = await cache.get(key);

      if (result !== null && result !== undefined) {
        return result;
      }

      const computed = await Promise.resolve(originalFn(...args));

      await cache.set(key, computed, ttlSecs);

      return computed;
    };
  };
}
