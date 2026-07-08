import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"]
  },
  resolve: {
    alias: {
      // The store imports from "obsidian" (only available at runtime inside
      // Obsidian). Point it at an in-repo stub so the data layer is testable
      // in plain Node.
      obsidian: resolve(import.meta.dirname, "test/stubs/obsidian.ts")
    }
  }
});
