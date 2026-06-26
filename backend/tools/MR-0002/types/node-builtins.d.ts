declare module "node:assert/strict" {
  const assert: {
    equal(actual: unknown, expected: unknown, message?: string): void;
    deepEqual(actual: unknown, expected: unknown, message?: string): void;
    rejects(block: (() => Promise<unknown>) | Promise<unknown>, error?: unknown, message?: string): Promise<void>;
  };
  export default assert;
}

declare module "node:test" {
  function test(name: string, fn: () => void | Promise<void>): void;
  export default test;
}
