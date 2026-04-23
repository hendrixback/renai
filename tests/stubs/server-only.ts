// Test-only stub for the `server-only` package.
//
// The real `server-only` (used to mark server-only modules) resolves to a
// throwing module under "browser" conditions. In Node-based test runs we
// want the marker to be a no-op so the module under test can load.
//
// Aliased via vitest.config.ts → resolve.alias.
export {};
