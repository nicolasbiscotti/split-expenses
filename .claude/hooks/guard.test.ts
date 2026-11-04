import { describe, expect, it } from "vitest";
import { checkCommand } from "./guard.mjs";

const cwd = "/repo";
/** Current branch per directory; anything not listed is on `feat/x`. */
const on = (branches: Record<string, string | undefined> = {}) => ({
  cwd,
  branchAt: (dir: string) => (dir in branches ? branches[dir] : "feat/x"),
});
const blocked = (command: string, env = on()) => checkCommand(command, env) !== null;

describe("git push to main", () => {
  it("blocks an explicit main refspec and allows other branches", () => {
    expect(blocked("git push origin main")).toBe(true);
    expect(blocked("git push origin feat/x")).toBe(false);
  });

  it("blocks every refspec whose destination is main", () => {
    for (const refspec of ["+main", "feat/x:main", "HEAD:refs/heads/main", ":main", "abc123:heads/main", "+feat/x:refs/heads/main"]) {
      expect(blocked(`git push origin ${refspec}`), refspec).toBe(true);
    }
    expect(blocked("git push origin feat/x main")).toBe(true);
  });

  it("allows refspecs that only read from main or merely contain the word", () => {
    expect(blocked("git push origin main:feat/x")).toBe(false);
    expect(blocked("git push origin main-fix")).toBe(false);
    expect(blocked("git push origin feat/main")).toBe(false);
  });

  it("skips options, including ones that take a value", () => {
    expect(blocked("git push -u --force-with-lease origin main")).toBe(true);
    expect(blocked("git push -o ci.skip origin main")).toBe(true);
    expect(blocked("git push --push-option main origin feat/x")).toBe(false);
    expect(blocked("git push --receive-pack /bin/x origin main")).toBe(true);
  });

  it("blocks pushes that default to the current branch while on main", () => {
    const onMain = on({ [cwd]: "main" });
    for (const command of ["git push", "git push origin", "git push origin HEAD", "git push -u origin HEAD", "git push origin @", "git push origin +HEAD"]) {
      expect(blocked(command, onMain), command).toBe(true);
      expect(blocked(command), command).toBe(false);
    }
    expect(blocked("git push origin HEAD:feat/x", onMain)).toBe(false);
  });

  it("blocks a push with an implicit destination when the branch is unknown", () => {
    const unknown = on({ [cwd]: undefined });
    expect(blocked("git push", unknown)).toBe(true);
    expect(blocked("git push origin feat/x", unknown)).toBe(false);
  });

  it("blocks pushing every branch", () => {
    for (const flag of ["--all", "--mirror", "--branches"]) {
      expect(blocked(`git push ${flag} origin`), flag).toBe(true);
    }
  });

  it("looks past git's global options", () => {
    expect(blocked("git --no-pager -c push.default=current push origin main")).toBe(true);
    expect(blocked("git -C /other push origin main")).toBe(true);
    expect(blocked("git --git-dir=/other/.git push origin feat/x")).toBe(false);
  });

  it("uses the branch of the directory the push runs in", () => {
    const env = on({ "/other": "main", "/repo/sub": "main" });
    expect(blocked("git -C /other push", env)).toBe(true);
    expect(blocked("git -C sub push origin HEAD", env)).toBe(true);
    expect(blocked("git push", env)).toBe(false);
    expect(blocked("cd /other && git push", env)).toBe(true);
    expect(blocked("cd sub; git push -u origin HEAD", env)).toBe(true);
  });

  it("treats --git-dir and --work-tree as an unknown branch", () => {
    expect(blocked("git --git-dir=/other/.git push")).toBe(true);
    expect(blocked("git --work-tree /other push")).toBe(true);
  });

  it("finds the push inside compound commands and common wrappers", () => {
    for (const command of [
      "pnpm test && git push origin main",
      "GIT_TRACE=1 git push origin main",
      "command git push origin main",
      "env FOO=1 git push origin main",
      "/usr/bin/git push origin main",
      "(git push origin main)",
      "{ git push origin main; }",
      "bash -c 'git push origin main'",
      "sh -lc \"git push origin main\"",
      "eval git push origin main",
      "git push origin 'main'",
    ]) {
      expect(blocked(command), command).toBe(true);
    }
  });

  it("ignores pushes that are only mentioned, not run", () => {
    expect(blocked("echo git push origin main")).toBe(false);
    expect(blocked("git log --grep 'push origin main'")).toBe(false);
  });
});

describe("gh api graphql", () => {
  it("blocks a query read from a file or stdin, which the deny rules can't inspect", () => {
    for (const command of [
      "gh api graphql --input q.json",
      "gh api graphql --input=-",
      "gh api --input q.json graphql",
      "gh api graphql -F query=@q.graphql",
      "gh api graphql -Fquery=@q.graphql",
      "gh api graphql -f 'query=@q.graphql'",
      "gh api graphql --field query=@q.graphql",
      "gh api graphql --raw-field=query=@q.graphql",
    ]) {
      expect(blocked(command), command).toBe(true);
    }
  });

  it("allows inline queries and file inputs to other endpoints", () => {
    expect(blocked("gh api graphql -f query='query { viewer { login } }' -F owner=@me")).toBe(false);
    expect(blocked("gh api repos/{owner}/{repo}/issues --input body.json")).toBe(false);
  });
});

describe("gh api writes to repo settings", () => {
  it("blocks writing the repo itself, where its merge settings live", () => {
    for (const command of [
      "gh api --method PATCH repos/{owner}/{repo} -f squash_merge_commit_message=PR_BODY",
      "gh api -XPATCH /repos/nicolasbiscotti/split-expenses -F allow_merge_commit=true",
      "gh api repos/{owner}/{repo}/ --method=patch --input settings.json",
      "gh api repos/{owner}/{repo} -X DELETE",
      "gh api repos/{owner}/{repo} -f allow_rebase_merge=true",
    ]) {
      expect(blocked(command), command).toBe(true);
    }
  });

  it("allows reading the repo and writing below it", () => {
    expect(blocked("gh api repos/{owner}/{repo} --jq .default_branch")).toBe(false);
    expect(blocked("gh api -X GET repos/{owner}/{repo}")).toBe(false);
    expect(blocked("gh api -X PATCH repos/{owner}/{repo}/issues/1 -f state=closed")).toBe(false);
  });
});
