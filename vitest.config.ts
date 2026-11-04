import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "src/**/*.test.ts",
      ".github/**/*.test.ts",
      // Not `.claude/**`: `.claude/worktrees/` holds other checkouts.
      ".claude/hooks/**/*.test.ts",
    ],
  },
});
