import test from "node:test";
import assert from "node:assert/strict";
import { calculateNextVersion, parseSemVer } from "../scripts/version.js";

test("parses valid semantic versions", () => {
  assert.equal(parseSemVer("1.2.3")?.patch, 3);
  assert.equal(parseSemVer("1.2.3-rc.1")?.minor, 2);
  assert.equal(parseSemVer("01.2.3"), null);
  assert.equal(parseSemVer("v1.2.3"), null);
});

test("features produce a minor bump", () => {
  assert.equal(calculateNextVersion("1.2.3", [{ subject: "feat: add export", body: "" }]).version, "1.3.0");
});

test("fixes produce a patch bump", () => {
  assert.equal(calculateNextVersion("1.2.3", [{ subject: "fix(api): handle null", body: "" }]).version, "1.2.4");
});

test("breaking changes produce a major bump", () => {
  assert.equal(calculateNextVersion("1.2.3", [{ subject: "feat!: change API", body: "" }]).version, "2.0.0");
  assert.equal(calculateNextVersion("1.2.3", [{ subject: "feat: change API", body: "BREAKING CHANGE: response shape changed" }]).version, "2.0.0");
});

test("unrecognized commits use a conservative patch fallback", () => {
  assert.equal(calculateNextVersion("1.2.3", [{ subject: "update files", body: "" }]).version, "1.2.4");
});

test("breaking changes in 0.x increment the minor version", () => {
  assert.equal(calculateNextVersion("0.4.2", [{ subject: "feat!: replace API", body: "" }]).version, "0.5.0");
});
