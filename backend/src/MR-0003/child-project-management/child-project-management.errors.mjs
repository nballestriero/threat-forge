/**
 * @file Typed child project management error boundary primitives.
 *
 * @implementsRequirement MR-0003REQ-0015
 * @implementsRequirement MR-0003REQ-0025
 * @implementsRequirement MR-0003REQ-0026
 * @derivedFromDecision MR-0003/ADR-0002
 * @derivedFromDecision MR-0003/ADR-0005
 * @macroRequirement MR-0003
 *
 * These errors give child project management controllers and HTTP adapters a
 * stable fail-closed boundary for forbidden, invalid and absent child project
 * API responses. Transport code maps explicit error codes and status codes
 * instead of parsing Error.message, keeping the read-only API deterministic and
 * independent from concrete storage adapters.
 *
 * Side effects: none. This module does not read or write SQLite, run Project
 * Model validators, mutate child repositories, start HTTP servers, implement
 * dynamic RBAC persistence, generate child project skeletons, or perform Git
 * operations.
 */

/**
 * Base typed error for child project management boundaries.
 */
export class ChildProjectManagementError extends Error {
  /**
   * Creates a typed child project management error.
   *
   * @param {{code: string, statusCode: number, message: string, publicMessage?: string}} input - Error fields.
   */
  constructor({ code, statusCode, message, publicMessage = message }) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.statusCode = statusCode;
    this.publicMessage = publicMessage;
  }
}

/**
 * Error raised when the caller lacks a required child project capability.
 */
export class ChildProjectManagementAccessDeniedError extends ChildProjectManagementError {
  /**
   * @param {string} capability - Required capability.
   */
  constructor(capability) {
    super({
      code: "forbidden",
      statusCode: 403,
      message: `Access denied for capability: ${capability}`,
    });
    this.capability = capability;
  }
}

/**
 * Error raised when request input cannot be interpreted safely.
 */
export class ChildProjectManagementInvalidRequestError extends ChildProjectManagementError {
  /**
   * @param {string} message - Stable public message.
   */
  constructor(message) {
    super({
      code: "invalid_request",
      statusCode: 400,
      message,
    });
  }
}

/**
 * Error raised when a child project or route is absent.
 */
export class ChildProjectManagementNotFoundError extends ChildProjectManagementError {
  /**
   * @param {string} message - Stable public message.
   */
  constructor(message) {
    super({
      code: "not_found",
      statusCode: 404,
      message,
    });
  }
}

/**
 * Checks whether an error belongs to the child project management typed boundary.
 *
 * @param {unknown} error - Candidate error.
 * @returns {error is ChildProjectManagementError} True for typed child project management errors.
 */
export function isChildProjectManagementError(error) {
  return error instanceof ChildProjectManagementError;
}
