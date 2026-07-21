/**
 * @file Compatibility module for the retired Target Project extension path.
 *
 * @implementsRequirement MR-0002ADR-0006REQ-0005
 * @implementsRequirement MR-0002ADR-0006REQ-0005GOV-0001
 * @implementsRequirement MR-0004ADR-0001REQ-0005
 * @implementsRequirement MR-0004ADR-0001REQ-0006
 * @derivedFromDecision MR-0002/ADR-0006
 * @derivedFromDecision MR-0004/ADR-0001
 * @macroRequirement MR-0002
 * @macroRequirement MR-0004
 * @implementationStatus implemented
 *
 * The target-only VSIX no longer exists. This repository module keeps legacy
 * source references compatible while delegating every exported adapter function
 * to the single unified extension implementation.
 */

module.exports = require("../../MR-0002/vscode-governed-markdown-assistance/extension.cjs");
