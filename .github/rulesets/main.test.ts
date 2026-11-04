// Guards the `main` ruleset kept in the repo (ADR 0002, #33). The file is
// applied by hand with `gh api` (docs/guides/protected-main.md), so a typo
// here would silently weaken or lock `main` the next time it is re-applied.
import { describe, expect, it } from "vitest";
import ruleset from "./main.json";

type Rule = { type: string; parameters?: Record<string, unknown> };
const rules = ruleset.rules as Rule[];
const rule = (type: string) => rules.find((r) => r.type === type);

describe("main ruleset", () => {
  it("targets the default branch and is enforced with no bypass", () => {
    expect(ruleset.target).toBe("branch");
    expect(ruleset.enforcement).toBe("active");
    expect(ruleset.conditions.ref_name.include).toEqual(["~DEFAULT_BRANCH"]);
    expect(ruleset.bypass_actors).toEqual([]);
  });

  it("blocks deleting main and force-pushing to it", () => {
    expect(rule("deletion")).toBeDefined();
    expect(rule("non_fast_forward")).toBeDefined();
  });

  it("requires a PR with no approvals, squash merge only", () => {
    expect(rule("pull_request")?.parameters).toMatchObject({
      required_approving_review_count: 0,
      allowed_merge_methods: ["squash"],
    });
  });

  it("requires a green `check` from GitHub Actions, without up-to-date branches", () => {
    // 15368 is the GitHub Actions app: only the pipeline's `check` job counts,
    // not a commit status that anyone with write access could post as "check".
    expect(rule("required_status_checks")?.parameters).toMatchObject({
      strict_required_status_checks_policy: false,
      required_status_checks: [{ context: "check", integration_id: 15368 }],
    });
  });
});
