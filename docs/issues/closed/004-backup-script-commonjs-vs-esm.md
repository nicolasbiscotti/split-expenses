# [BUG] backup.js crashes with "require is not defined" in ES module scope

**Type:** bug
**Opened:** 2026-04-01
**Resolved:** 2026-04-01

## Description

Running `node scripts/firebase-admin-sdk/backup.js` from the project root fails immediately:

```
ReferenceError: require is not defined in ES module scope, you can use import instead
```

## Root cause

The project's `package.json` has `"type": "module"`, which tells Node.js to treat every `.js` file in the project as an ES module. ES modules use `import`/`export` syntax and do not have access to CommonJS globals like `require`, `module`, or `__dirname`.

`backup.js` was written with CommonJS syntax (`require()`), so Node.js rejects it at parse time.

There is also a secondary bug on line 9: `serviceAccount` is referenced but the line that defines it (line 6) is commented out — the script would crash even after the module system is fixed.

## Resolution

Rewrote the script using ESM syntax (Option A): replaced `require()` calls with `import` statements and `readFileSync` + `JSON.parse` for the service account file.

**Changed in:** `scripts/firebase-admin-sdk/backup.js`
