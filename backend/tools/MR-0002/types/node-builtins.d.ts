/**
 * Minimal ambient declarations for the governed Project Documentation Explorer
 * JSDoc static type-check scope.
 *
 * These declarations intentionally cover only the Node.js and web-platform
 * primitives exercised by the scoped check. They avoid introducing @types/node
 * while keeping the Project Documentation Explorer backend files checkable with
 * the existing TypeScript dependency.
 */

declare module "node:assert/strict" {
  const assert: {
    equal(actual: unknown, expected: unknown, message?: string): void;
    deepEqual(actual: unknown, expected: unknown, message?: string): void;
    rejects(block: (() => Promise<unknown>) | Promise<unknown>, error?: unknown, message?: string): Promise<void>;
  };
  export default assert;
}

declare module "node:fs" {
  export interface Dirent {
    name: string;
    isFile(): boolean;
  }

  const fs: {
    readFileSync(path: string, encoding: "utf8"): string;
    existsSync(path: string): boolean;
    readdirSync(path: string, options: { withFileTypes: true }): Dirent[];
    realpathSync: {
      native(path: string): string;
    };
  };
  export default fs;
}

declare module "node:http" {
  export interface IncomingMessage {
    url?: string;
    method?: string;
    headers: Record<string, string | string[] | undefined>;
  }

  export interface ServerResponse {
    writeHead(statusCode: number, headers?: Record<string, string | number>): this;
    end(data?: string): void;
  }

  export interface AddressInfo {
    port: number;
  }

  export interface Server {
    once(eventName: "error", listener: (error: Error) => void): this;
    listen(port: number, host: string, callback?: (...args: unknown[]) => void): this;
    address(): AddressInfo | string | null;
  }

  export function createServer(
    requestListener: (request: IncomingMessage, response: ServerResponse) => void | Promise<void>,
  ): Server;
}

declare module "node:path" {
  const path: {
    dirname(filePath: string): string;
    resolve(...segments: string[]): string;
    join(...segments: string[]): string;
    relative(from: string, to: string): string;
    isAbsolute(filePath: string): boolean;
    normalize(filePath: string): string;
  };
  export default path;
}

declare module "node:test" {
  function test(name: string, fn: () => void | Promise<void>): void;
  export default test;
}

declare module "node:url" {
  export function fileURLToPath(url: string): string;
}

declare class URLSearchParams {
  getAll(name: string): string[];
}

declare class URL {
  constructor(input: string, base?: string);
  readonly pathname: string;
  readonly searchParams: URLSearchParams;
}

interface ImportMeta {
  url: string;
}

interface Console {
  log(...data: unknown[]): void;
  error(...data: unknown[]): void;
}

declare const console: Console;

declare const process: {
  argv: string[];
  env: Record<string, string | undefined>;
  execPath: string;
  exitCode?: number;
};
