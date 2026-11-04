---
status: accepted
---

# One gate in front of production: every change reaches `main` through a PR that passed `check`

Merging to `main` is deploying to production, and we want small changes to ship quickly with a high degree of confidence. So there is a single workflow (`pipeline.yml`) with a single gate: the `check` job (typecheck → unit tests → build → smoke test). A GitHub ruleset on `main` requires a PR and a green `check`, with no bypass for anyone, including the owner and any agent acting with the owner's token. `check` runs once for each push to a PR, and once more on the merged commit on `main` right before `production` deploys. Preview deploys run only for PRs, after `check`.

This setup is a starting point, not a final design. We expect to change it as we learn what working this way is like. Signs that it needs another look: a bug reaches production after passing `check`; the smoke test turns flaky or slow; Dependabot PRs pile up or auto-merge ships something broken; merging feels like a chore again.

## Considered Options

- **Strict "branch must be up to date" ruleset**: rejected. It forces an update-and-wait cycle before every merge, which gets especially tedious when several Dependabot PRs land at once. Running `check` again on `main` guards the exact commit that ships for one extra run per merge.
- **Tests in each deploy workflow (preview and production as separate workflows)**: rejected. Every PR push ran the tests twice, and the merge gate depended on Vercel being reachable and on secrets that Dependabot runs don't get.
- **Unit tests only as the gate**: rejected. They cover only pure logic, so a dependency bump that breaks rendering, listeners, icons or Firestore wiring would ship. The smoke test (Playwright against the built app and the Firebase emulator) is the minimum UI check, and it is what makes Dependabot auto-merge acceptable.
- **Merge commits or rebase merging**: rejected in favour of squash only. One PR = one commit on `main` = one production deploy, so every commit on `main` passed `check`, and any PR can be undone by reverting a single commit.

## Consequences

- `production` does not have separate test steps. Its safety comes from the ruleset (every commit on `main` arrives through a PR that passed `check`) plus the `check` re-run it depends on. Do not remove the ruleset without bringing back a gate.
- A branch without a PR gets no preview. Open a draft PR to get one.
- Agents may open PRs but may not merge them, push to `main`, or change rulesets. GitHub cannot tell the owner's token from an agent's, so Claude Code deny rules enforce this. In an emergency, the owner turns enforcement off by hand and turns it back on afterwards.
- Dependabot security updates and grouped minor/patch updates merge themselves once `check` passes; majors are merged by hand. Auto-merge is turned on with a GitHub App token, because merges made with the default `GITHUB_TOKEN` do not trigger workflows, so `production` would never run.
- Nothing here assumes a single Firebase project. Preview and production are "environments" whose build config comes from Vercel's environment variables. `check` runs against the emulator, so it does not depend on how environments are mapped to Firebase projects (ADR 0003).
