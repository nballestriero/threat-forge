/**
 * Negative fixture proving that the Project Documentation Explorer JSDoc
 * type-check pilot rejects misspelled internal fields.
 *
 * This fixture is intentionally invalid and is executed only by the governed
 * JSDoc type-check tool through a dedicated negative tsconfig.
 */

/**
 * @typedef {object} SnapshotIndex
 * @property {Map<string, unknown>} detailsById Canonical detail index field.
 */

/** @type {SnapshotIndex} */
const invalidSnapshotIndex = {
  details: new Map(),
};

void invalidSnapshotIndex;
