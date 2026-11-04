# Protected `main`

`main` is production: every merge deploys. Since ADR 0002, changes reach `main` only through a pull request with a green `check`, and no one can bypass that, including the owner. This guide covers the day-to-day PR flow and the human-only operations around the protection.

What enforces it:

| Layer | File / place | What it does |
|-------|--------------|--------------|
| GitHub ruleset | `.github/rulesets/main.json` (applied by hand) | PR required, green `check` required, no force-push, no deletion, squash only, no bypass |
| Repo settings | GitHub → Settings → General (set by hand) | Squash merging only, PR title as the commit title, head branches deleted after merge |
| Claude Code deny rules | `.claude/settings.json` | Agents can't push to `main`, merge a PR, or write rulesets, branch protection or repo settings |

The deny rules exist because GitHub can't tell the owner's token from an agent's. They catch the common command shapes and are a second layer behind the ruleset, not a sandbox.

## The PR flow

1. Branch off `main`: `git switch -c feat/<n>-<slug>`.
2. Push the branch and open a PR. Use a **draft PR** while the work is unfinished: it gets the same pipeline, so every push runs `check` and, when green, deploys a preview to `split-expenses-preview.vercel.app`.
   ```bash
   git push -u origin HEAD
   gh pr create --draft --fill
   ```
   A branch without a PR gets no preview. To preview one anyway, start the pipeline by hand: `gh workflow run pipeline.yml --ref <branch>`.
3. Mark it ready (`gh pr ready`) when done.
4. Merge on GitHub once `check` is green. Only **Squash and merge** is offered; the branch doesn't need to be up to date with `main` first, because `check` runs again on the merged commit before `production` deploys. The head branch is deleted after merge.

The preview alias is shared: the last green PR push (or manual run) wins.

Agents open PRs; a human merges them.

## Applying the ruleset

The ruleset in `.github/rulesets/main.json` is the source of truth. Change it through a PR (the test next to it guards its key properties), then re-apply it by hand. These commands are blocked for Claude Code on purpose: run them yourself.

Apply the ruleset only after `check` has reported at least once on the repo, otherwise GitHub can't match the required check and nothing can merge.

Find existing rulesets and their ids:

```bash
gh api repos/nicolasbiscotti/split-expenses/rulesets --jq '.[] | {id, name, enforcement}'
```

First time (no `main` ruleset yet):

```bash
gh api --method POST repos/nicolasbiscotti/split-expenses/rulesets \
  --input .github/rulesets/main.json
```

Re-apply after editing the file (replaces the ruleset with the file's contents):

```bash
gh api --method PUT repos/nicolasbiscotti/split-expenses/rulesets/<id> \
  --input .github/rulesets/main.json
```

Check that GitHub matches the file:

```bash
gh api repos/nicolasbiscotti/split-expenses/rulesets/<id> \
  --jq '{enforcement, bypass_actors, conditions, rules}'
```

The required check is `check` from the GitHub Actions app (`integration_id` 15368), the job name in `.github/workflows/pipeline.yml`. If you rename that job, update the ruleset in the same PR, or nothing will be mergeable.

### Repo settings

These live outside the ruleset. Set them once (Settings → General → Pull Requests), or:

```bash
gh repo edit nicolasbiscotti/split-expenses \
  --enable-squash-merge --enable-merge-commit=false --enable-rebase-merge=false \
  --delete-branch-on-merge
gh api --method PATCH repos/nicolasbiscotti/split-expenses \
  -f squash_merge_commit_title=PR_TITLE -f squash_merge_commit_message=BLANK
```

## Emergency: getting a change onto `main` without the rules

Use this only when the normal flow can't work, for example `check` itself is broken on `main` and a fix can't pass it, or GitHub Actions is down while production is broken.

1. Turn enforcement off by hand. In the UI: Settings → Rules → Rulesets → `main` → Enforcement status → **Disabled**. Or:
   ```bash
   gh api --method PUT repos/nicolasbiscotti/split-expenses/rulesets/<id> -f enforcement=disabled
   ```
2. Make the fix. Prefer still going through a PR and merging it, even with a red or missing `check`; push straight to `main` only if you must. Never force-push `main`.
3. Turn enforcement back on right away by re-applying the file:
   ```bash
   gh api --method PUT repos/nicolasbiscotti/split-expenses/rulesets/<id> \
     --input .github/rulesets/main.json
   ```
4. Confirm `enforcement` is `active` (see the check command above), and open an issue explaining what happened, so the gap that forced the bypass gets fixed.

`production` deploys on every push to `main` once `check` passes, so a commit pushed while the rules are off still only ships if `check` is green.

## A major Dependabot PR

Security updates and grouped minor/patch updates merge themselves once `check` passes. Majors wait for a human:

1. Read the changelog / migration guide linked in the PR.
2. Dependabot runs get no secrets, so they get `check` but no preview. To try the app, start the pipeline by hand on the Dependabot branch (the run is then yours, so it has secrets):
   ```bash
   gh workflow run pipeline.yml --ref <dependabot-branch>
   ```
3. If the upgrade needs code changes, push them to the Dependabot branch (or a branch off it with its own PR). Once anyone else pushes to it, Dependabot stops rebasing it; comment `@dependabot recreate` to start over.
4. When `check` is green and the preview looks right, squash-merge it by hand.
5. If you won't take the major now, close the PR or comment `@dependabot ignore this major version`.
