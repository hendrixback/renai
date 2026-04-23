import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "src/**/*.{test,spec}.ts",
      "src/**/*.{test,spec}.tsx",
      "tests/**/*.{test,spec}.ts",
      "tests/**/*.{test,spec}.tsx",
    ],
    // Per Contribution_Standards.md §5: explicit imports (no globals),
    // colocated test files, factories over mocks.
    globals: false,
    // Node environment for lib tests (server-only modules need Node
    // conditions to resolve the empty `server-only` stub rather than the
    // browser-throwing one).
    server: {
      deps: {
        // server-only resolves to an empty module under Node; nothing to patch.
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["src/lib/**/*.ts"],
      exclude: [
        "src/generated/**",
        "src/**/*.{test,spec}.ts",
        "src/**/*.d.ts",
      ],
      // Coverage targets per Contribution_Standards.md §5. Enforced in CI
      // via --reporter=json-summary + a small script that reads the
      // summary file and fails the build if thresholds are missed.
      thresholds: {
        "src/lib/calculations/**/*.ts": {
          lines: 90,
          statements: 90,
          branches: 85,
          functions: 90,
        },
        "src/lib/services/**/*.ts": {
          lines: 80,
          statements: 80,
          branches: 75,
          functions: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Stub `server-only` so modules that mark themselves server-only
      // can be imported from Node-based test runs. Real Next.js runtime
      // still resolves the real package.
      "server-only": path.resolve(__dirname, "./tests/stubs/server-only.ts"),
    },
  },
});
