/**
 * @file Typed Project Documentation Explorer error boundary primitives.
 *
 * @implementsRequirement MR-0002REQ-0050
 * @implementsRequirement MR-0002REQ-0054
 * @derivedFromDecision MR-0002/ADR-0017
 * @derivedFromDecision MR-0002/ADR-0021
 * @macroRequirement MR-0002
 *
 * This module provides transport-stable error objects for Project Documentation
 * Explorer read-only boundaries. HTTP mapping code can inspect explicit `code`
 * and `statusCode` fields instead of parsing `Error.message`, preserving
 * fail-closed behavior for unexpected exceptions while keeping public payloads
 * deterministic.
 *
 * Side effects: none. This module does not create routes, perform I/O, read
 * project-model sources, mutate governed files, introduce runtime storage,
 * implement dynamic RBAC, or add third-party dependencies.
 */

/**
 * Base typed error for Project Documentation Explorer boundaries.
 */
export class ProjectDocumentationExplorerError extends Error {
  /**
   * Creates a typed Project Documentation Explorer error.
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
 * Error raised when a principal lacks the required capability.
 */
export class ProjectDocumentationExplorerAccessDeniedError extends ProjectDocumentationExplorerError {
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
export class ProjectDocumentationExplorerInvalidRequestError extends ProjectDocumentationExplorerError {
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
 * Error raised when a governed documentation entity or route is absent.
 */
export class ProjectDocumentationExplorerNotFoundError extends ProjectDocumentationExplorerError {
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
 * Checks whether an error belongs to the Project Documentation Explorer typed boundary.
 *
 * @param {unknown} error - Candidate error.
 * @returns {error is ProjectDocumentationExplorerError} True for typed Project Documentation Explorer errors.
 */
export function isProjectDocumentationExplorerError(error) {
  return error instanceof ProjectDocumentationExplorerError;
}
