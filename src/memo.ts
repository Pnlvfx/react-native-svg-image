/**
 * Returns a memoized version of the async callback function which
 * will always return the same value on subsequent calls.
 *
 * This is useful to provide lazy, but cached, loading of data.
 */
export const memo = <T>(callback: () => Promise<T>) => {
  let memoizedValue: Promise<T> | undefined;

  return () => {
    memoizedValue ??= callback();

    return memoizedValue;
  };
};
