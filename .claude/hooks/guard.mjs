// Decides whether a Bash command must be blocked: pushes to `main` and
// GraphQL calls that read their query from a file (ADR 0002, #33). Pure: the
// hook wrapper (guard-hook.mjs) supplies the current branch per directory.

/**
 * @typedef {object} Env
 * @property {string} cwd Directory the command runs in.
 * @property {(dir: string) => string | undefined} branchAt Current branch of
 *   the repo at `dir`, or undefined when it can't be determined.
 */

/**
 * Splits a command line into simple commands (on `;`, `&&`, `||`, `|`, `&`,
 * newlines, parentheses and backticks), each a list of words with shell
 * quoting removed. Approximate on purpose: it errs towards finding commands.
 * @param {string} line
 * @returns {string[][]}
 */
function splitCommands(line) {
  /** @type {string[][]} */
  const commands = [];
  /** @type {string[]} */
  let words = [];
  let word = "";
  let inWord = false;
  const endWord = () => {
    if (inWord) words.push(word);
    word = "";
    inWord = false;
  };
  const endCommand = () => {
    endWord();
    if (words.length > 0) commands.push(words);
    words = [];
  };
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "'") {
      const end = line.indexOf("'", i + 1);
      const stop = end === -1 ? line.length : end;
      word += line.slice(i + 1, stop);
      inWord = true;
      i = stop;
    } else if (c === '"') {
      inWord = true;
      for (i++; i < line.length && line[i] !== '"'; i++) {
        if (line[i] === "\\" && i + 1 < line.length) i++;
        word += line[i];
      }
    } else if (c === "\\" && i + 1 < line.length) {
      word += line[++i];
      inWord = true;
    } else if (c === " " || c === "\t") {
      endWord();
    } else if (";&|\n()`".includes(c)) {
      endCommand();
    } else {
      word += c;
      inWord = true;
    }
  }
  endCommand();
  return commands;
}

const PUSH_BLOCKED =
  "Pushing to main is blocked: push a branch and open a PR (docs/guides/protected-main.md).";

/** `git push` options that take their value as the next word. */
const PUSH_OPTIONS_WITH_VALUE = new Set(["-o", "--push-option", "--repo", "--receive-pack", "--exec"]);

/**
 * Destination branch of a refspec, with `refs/` and `heads/` dropped (the
 * remote resolves `heads/main` to `refs/heads/main` too).
 * @param {string} refspec
 */
function destination(refspec) {
  const spec = refspec.startsWith("+") ? refspec.slice(1) : refspec;
  const colon = spec.indexOf(":");
  const dst = colon === -1 ? spec : spec.slice(colon + 1);
  return dst.replace(/^refs\//, "").replace(/^heads\//, "");
}

/**
 * @param {string[]} args Words after `git push`.
 * @param {() => string | undefined} currentBranch Branch where the push runs.
 * @returns {string | null}
 */
function checkPush(args, currentBranch) {
  /** @type {string[]} */
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--") {
      positional.push(...args.slice(i + 1));
      break;
    }
    if (arg === "--all" || arg === "--branches" || arg === "--mirror") return PUSH_BLOCKED;
    if (arg.startsWith("-")) {
      if (PUSH_OPTIONS_WITH_VALUE.has(arg)) i++;
      continue;
    }
    positional.push(arg);
  }
  // No refspec: git pushes the current branch (push.default=simple).
  const refspecs = positional.length > 1 ? positional.slice(1) : ["HEAD"];
  for (const refspec of refspecs) {
    const dst = destination(refspec);
    const branch = dst === "HEAD" || dst === "@" ? currentBranch() : dst;
    if (branch === undefined) {
      return "Blocked: couldn't tell the current branch, so this push might target main. Name the destination branch explicitly.";
    }
    if (branch === "main") return PUSH_BLOCKED;
  }
  return null;
}

/**
 * Resolves `target` against `base` like `cd` would; undefined when either is
 * unknown or `target` needs the shell (`~`, `-`, `$VAR`).
 * @param {string | undefined} base
 * @param {string | undefined} target
 * @returns {string | undefined}
 */
function resolveDir(base, target) {
  if (base === undefined || target === undefined || /^[~-]|\$/.test(target)) return undefined;
  const parts = target.startsWith("/") ? [] : base.split("/");
  for (const part of target.split("/")) {
    if (part === "..") parts.pop();
    else if (part !== "." && part !== "") parts.push(part);
  }
  return "/" + parts.filter(Boolean).join("/");
}

/** git global options that take their value as the next word. */
const GIT_OPTIONS_WITH_VALUE = new Set(["-c", "--git-dir", "--work-tree", "--namespace", "--exec-path", "--config-env"]);

/**
 * Parses `git [global options] <subcommand> [args]`.
 * @param {string[]} words Words after `git`.
 * @param {string | undefined} dir Directory git starts in.
 * @returns {{ subcommand: string | undefined, args: string[], dir: string | undefined }}
 *   `dir` is undefined when the repo can't be located from the words alone.
 */
function parseGit(words, dir) {
  let i = 0;
  for (; i < words.length && words[i].startsWith("-"); i++) {
    const option = words[i];
    const name = option.split("=")[0];
    if (option === "-C") dir = resolveDir(dir, words[++i]);
    else if (name === "--git-dir" || name === "--work-tree") dir = undefined;
    if (GIT_OPTIONS_WITH_VALUE.has(option)) i++;
  }
  return { subcommand: words[i], args: words.slice(i + 1), dir };
}

/** `gh api` options that take a value, keyed by every spelling. */
const GH_API_OPTIONS = new Map([
  ["-X", "method"], ["--method", "method"],
  ["-f", "field"], ["--raw-field", "field"], ["-F", "field"], ["--field", "field"],
  ["--input", "input"],
  ["-H", "other"], ["--header", "other"], ["-q", "other"], ["--jq", "other"],
  ["-t", "other"], ["--template", "other"], ["--hostname", "other"],
  ["--cache", "other"], ["-p", "other"], ["--preview", "other"],
]);

/**
 * Parses the words after `gh api` into its endpoint and options, accepting
 * `--opt value`, `--opt=value` and `-Xvalue`.
 * @param {string[]} args
 */
function parseGhApi(args) {
  /** @type {{ endpoint: string | undefined, method: string | undefined, fields: string[], input: boolean }} */
  const parsed = { endpoint: undefined, method: undefined, fields: [], input: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    let name = arg;
    /** @type {string | undefined} */
    let value;
    if (arg.startsWith("--") && arg.includes("=")) {
      name = arg.slice(0, arg.indexOf("="));
      value = arg.slice(arg.indexOf("=") + 1);
    } else if (/^-[A-Za-z]./.test(arg)) {
      name = arg.slice(0, 2);
      value = arg.slice(2);
    }
    const kind = GH_API_OPTIONS.get(name);
    if (kind === undefined) {
      if (!arg.startsWith("-") && parsed.endpoint === undefined) parsed.endpoint = arg;
      continue;
    }
    if (value === undefined) value = args[++i] ?? "";
    if (kind === "method") parsed.method = value.toUpperCase();
    else if (kind === "field") parsed.fields.push(value);
    else if (kind === "input") parsed.input = true;
  }
  return parsed;
}

/**
 * @param {string[]} args Words after `gh api`.
 * @returns {string | null}
 */
function checkGhApi(args) {
  const api = parseGhApi(args);
  if (api.endpoint === "graphql" && (api.input || api.fields.some((f) => f.startsWith("query=@")))) {
    return "Blocked: gh api graphql with a query from a file or stdin can't be checked for ruleset, branch protection or merge mutations. Pass the query inline with -f query='...'.";
  }
  // gh sends POST when fields or --input are given without --method.
  const method = api.method ?? (api.fields.length > 0 || api.input ? "POST" : "GET");
  if (method !== "GET" && /^\/?repos\/[^/]+\/[^/]+\/?$/.test(api.endpoint ?? "")) {
    return "Blocked: writing the repo itself (merge settings, visibility, deletion) is for a human (docs/guides/protected-main.md).";
  }
  return null;
}

/**
 * @param {string} command
 * @param {Env} env
 * @returns {string | null} Why the command is blocked, or null to let it run.
 */
export function checkCommand(command, env) {
  return scan(command, env.cwd, env).reason;
}

/** Words that run the rest of the line as a command. */
const PREFIXES = new Set(["command", "builtin", "exec", "env", "nohup", "time", "sudo", "nice", "{", "!"]);
const SHELLS = new Set(["sh", "bash", "zsh", "dash"]);
const basename = (/** @type {string} */ word) => word.slice(word.lastIndexOf("/") + 1);

/**
 * Drops env assignments and prefixes such as `command` or `env`, so the
 * first word is the program that actually runs.
 * @param {string[]} words
 */
function unwrap(words) {
  let i = 0;
  while (i < words.length && (PREFIXES.has(words[i]) || /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[i]))) i++;
  return words.slice(i);
}

/**
 * @param {string} command
 * @param {string | undefined} dir Directory the command starts in.
 * @param {Env} env
 * @returns {{ reason: string | null, dir: string | undefined }}
 */
function scan(command, dir, env) {
  for (const raw of splitCommands(command)) {
    const words = unwrap(raw);
    const program = words.length > 0 ? basename(words[0]) : undefined;
    /** @type {string | undefined} Script run by `bash -c` or `eval`. */
    let script;
    if (program === "eval") script = words.slice(1).join(" ");
    if (program !== undefined && SHELLS.has(program)) {
      const flag = words.findIndex((w, i) => i > 0 && /^-[a-z]*c[a-z]*$/.test(w));
      if (flag !== -1) script = words[flag + 1];
    }
    if (script !== undefined) {
      const inner = scan(script, dir, env);
      if (inner.reason) return inner;
      continue;
    }
    if (program === "cd") {
      dir = resolveDir(dir, words[1]);
      continue;
    }
    if (program === "gh" && words[1] === "api") {
      const reason = checkGhApi(words.slice(2));
      if (reason) return { reason, dir };
      continue;
    }
    if (program !== "git") continue;
    const git = parseGit(words.slice(1), dir);
    if (git.subcommand !== "push") continue;
    const at = git.dir;
    const reason = checkPush(git.args, () => (at === undefined ? undefined : env.branchAt(at)));
    if (reason) return { reason, dir };
  }
  return { reason: null, dir };
}
