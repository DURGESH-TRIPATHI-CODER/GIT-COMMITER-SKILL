import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { calculateNextVersion, parseSemVer } from "./version.js";

type Config = {
  versionFile: string | null;
  changelogFile: string;
  tagPrefix: string;
  defaultBranch?: string;
  includePrerelease?: boolean;
};
type Commit = { hash: string; date: string; subject: string; body: string };
type PR = { number: number; title: string; url: string; labels: { name: string }[]; mergedAt: string };

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_CONFIG: Config = {
  versionFile: "package.json",
  changelogFile: "CHANGELOG.md",
  tagPrefix: "v",
  defaultBranch: "main",
  includePrerelease: false
};

function run(command: string, args: string[], options: { input?: string; allowFailure?: boolean } = {}): string {
  try {
    return execFileSync(command, args, {
      cwd: ROOT, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"],
      input: options.input
    }).trimEnd();
  } catch (error) {
    const e = error as { status?: number; stderr?: Buffer | string; message?: string };
    if (options.allowFailure) return "";
    const stderr = e.stderr ? String(e.stderr).trim() : e.message ?? "unknown error";
    throw new Error(`${command} ${args.join(" ")} failed: ${stderr}`);
  }
}
function git(args: string[], allowFailure = false): string { return run("git", args, { allowFailure }); }
function gh(args: string[], allowFailure = false): string { return run("gh", args, { allowFailure }); }
function parseArgs(argv: string[]) {
  const positional: string[] = []; const flags = new Map<string, string | boolean>();
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]!;
    if (token.startsWith("--")) {
      const [key, inline] = token.slice(2).split("=", 2);
      if (inline !== undefined) flags.set(key!, inline);
      else if (argv[i + 1] && !argv[i + 1]!.startsWith("--")) flags.set(key!, argv[++i]!);
      else flags.set(key!, true);
    } else positional.push(token);
  }
  return { positional, flags };
}
function loadConfig(): Config {
  const path = resolve(ROOT, "release.config.json");
  if (!existsSync(path)) return DEFAULT_CONFIG;
  return { ...DEFAULT_CONFIG, ...JSON.parse(readFileSync(path, "utf8")) } as Config;
}
function assertRepo() {
  if (!git(["rev-parse", "--is-inside-work-tree"], true)) throw new Error("Not inside a Git repository.");
}
function assertGh() { gh(["auth", "status"]); }
function isDirty() { return git(["status", "--porcelain"]).length > 0; }
function getTags(prefix: string): string[] {
  return git(["tag", "--list", `${prefix}*`, "--sort=-version:refname"]).split("\n").filter(Boolean);
}
function latestTag(prefix: string): string | null {
  const tags = getTags(prefix);
  for (const tag of tags) if (parseVersion(tag.slice(prefix.length))) return tag;
  return null;
}
const parseVersion = parseSemVer;
function readCurrentVersion(config: Config): string | null {
  if (!config.versionFile) return null;
  const path = resolve(ROOT, config.versionFile);
  if (!existsSync(path)) throw new Error(`Configured version file not found: ${config.versionFile}`);
  const json = JSON.parse(readFileSync(path, "utf8")) as { version?: string };
  if (!json.version || !parseVersion(json.version)) throw new Error(`No valid SemVer "version" found in ${config.versionFile}`);
  return json.version;
}
const nextVersion = calculateNextVersion;
function readCommits(tag: string | null): Commit[] {
  const range = tag ? `${tag}..HEAD` : "HEAD";
  const raw = git(["log", range, "--date=iso-strict", "--pretty=format:%H%x1f%cI%x1f%s%x1f%b%x1e"]);
  if (!raw) return [];
  return raw.split("\x1e").filter(Boolean).map(line => {
    const [hash = "", date = "", subject = "", body = ""] = line.split("\x1f");
    return { hash, date, subject, body };
  }).reverse();
}
function readMergedPRs(since: string | null): PR[] {
  assertGh();
  const search = since ? `merged:>=${since.slice(0, 10)}` : "is:merged";
  const output = gh(["pr", "list", "--state", "merged", "--search", search, "--limit", "100",
    "--json", "number,title,url,labels,mergedAt"]);
  return JSON.parse(output || "[]") as PR[];
}
function makeNotes(version: string, commits: Commit[], prs: PR[]): string {
  const groups = new Map<string, string[]>();
  for (const c of commits) {
    const type = c.subject.match(/^([a-z]+)(?:\([^)]*\))?!?:/i)?.[1]?.toLowerCase();
    const label = /BREAKING CHANGE:/i.test(c.body) || /!:/i.test(c.subject) ? "Breaking Changes"
      : type === "feat" ? "Features"
      : ["fix", "perf"].includes(type ?? "") ? "Fixes & Improvements"
      : "Other Changes";
    const short = c.hash.slice(0, 7);
    const item = `- ${c.subject} (\`${short}\`)`;
    groups.set(label, [...(groups.get(label) ?? []), item]);
  }
  const order = ["Breaking Changes", "Features", "Fixes & Improvements", "Other Changes"];
  const sections = order.filter(k => groups.has(k)).map(k => `### ${k}\n${groups.get(k)!.join("\n")}`);
  if (prs.length) sections.push(`### Merged Pull Requests\n${prs.map(p => `- [#${p.number} ${p.title}](${p.url})`).join("\n")}`);
  return `## ${version}\n\n${sections.length ? sections.join("\n\n") : "No categorized changes were found. Review the commit range manually."}\n`;
}
function printPlan(config: Config) {
  assertRepo();
  const branch = git(["branch", "--show-current"]);
  const remote = git(["remote", "get-url", "origin"], true) || "(no origin remote)";
  const tag = latestTag(config.tagPrefix);
  const commits = readCommits(tag);
  const sinceDate = tag ? git(["log", "-1", "--format=%cI", tag]) : null;
  const prs = remote.includes("github.com") ? readMergedPRs(sinceDate) : [];
  const current = readCurrentVersion(config);
  const proposal = nextVersion(current, commits);
  const notes = makeNotes(proposal.version, commits, prs);
  console.log("GitHub Release Manager — read-only plan\n");
  console.log(`Repository: ${remote}\nBranch: ${branch || "(detached HEAD)"}\nLatest tag: ${tag ?? "(none)"}\nCurrent version: ${current ?? "(not configured)"}\nProposed version: ${proposal.version} (${proposal.bump})`);
  console.log(`Working tree: ${isDirty() ? "DIRTY — apply will be blocked" : "clean"}\nCommits analyzed: ${commits.length}\nMerged PRs returned: ${prs.length}`);
  console.log("\nReasons:");
  for (const reason of proposal.reasons) console.log(`- ${reason}`);
  console.log("\nRelease notes preview:\n");
  console.log(notes);
  console.log("No files or Git refs were changed.");
}
function requireApproved(flags: Map<string, string | boolean>): string {
  const version = flags.get("approved-version");
  if (typeof version !== "string" || !parseVersion(version)) throw new Error("Provide --approved-version X.Y.Z after the user explicitly approves that exact version.");
  return version;
}
function apply(version: string, config: Config) {
  assertRepo();
  if (isDirty()) throw new Error("Working tree is dirty. Commit or safely stash unrelated changes before applying.");
  const tag = latestTag(config.tagPrefix);
  const commits = readCommits(tag);
  const prs = git(["remote", "get-url", "origin"], true).includes("github.com") ? readMergedPRs(tag ? git(["log", "-1", "--format=%cI", tag]) : null) : [];
  const current = readCurrentVersion(config);
  const proposal = nextVersion(current, commits);
  if (proposal.version !== version) throw new Error(`Approved version ${version} does not match current plan ${proposal.version}. Run plan again.`);
  if (getTags(config.tagPrefix).includes(`${config.tagPrefix}${version}`)) throw new Error(`Tag ${config.tagPrefix}${version} already exists.`);
  const notes = makeNotes(version, commits, prs);
  const changelogPath = resolve(ROOT, config.changelogFile);
  const existing = existsSync(changelogPath) ? readFileSync(changelogPath, "utf8") : "# Changelog\n\n";
  if (config.versionFile) {
    const path = resolve(ROOT, config.versionFile);
    const json = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    json.version = version;
    writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`);
  }
  const heading = `# Changelog\n\n`;
  const body = existing.startsWith(heading) ? existing.slice(heading.length) : existing.replace(/^# Changelog\s*/, "");
  writeFileSync(changelogPath, `${heading}${notes}\n${body.trimStart()}`);
  console.log(`Updated ${config.versionFile ?? "(no version file)"} and ${config.changelogFile}. Review the diff and commit these files before tagging.`);
}
function tag(version: string, flags: Map<string, string | boolean>, config: Config) {
  if (flags.get("confirm-tag") !== true) throw new Error("Tag creation requires --confirm-tag after separate user approval.");
  assertRepo();
  if (isDirty()) throw new Error("Working tree must be clean before creating a release tag. Commit release files first.");
  const name = `${config.tagPrefix}${version}`;
  if (getTags(config.tagPrefix).includes(name)) throw new Error(`Tag ${name} already exists.`);
  git(["tag", "-a", name, "-m", `Release ${version}`]);
  console.log(`Created local annotated tag ${name}. It has NOT been pushed.`);
}
function pushTag(version: string, flags: Map<string, string | boolean>, config: Config) {
  if (flags.get("confirm-push") !== true) throw new Error("Pushing requires --confirm-push after separate user approval.");
  const name = `${config.tagPrefix}${version}`;
  if (!getTags(config.tagPrefix).includes(name)) throw new Error(`Local tag ${name} does not exist.`);
  const remoteTag = git(["ls-remote", "--tags", "origin", `refs/tags/${name}`], true);
  if (remoteTag) throw new Error(`Remote tag ${name} already exists; refusing to overwrite.`);
  git(["push", "origin", `refs/tags/${name}`]);
  console.log(`Pushed ${name} to origin.`);
}
function draft(version: string, config: Config) {
  assertGh();
  const name = `${config.tagPrefix}${version}`;
  if (!getTags(config.tagPrefix).includes(name)) throw new Error(`Local tag ${name} missing. Create and push it first.`);
  if (gh(["release", "view", name], true)) throw new Error(`GitHub release ${name} already exists.`);
  const tagCommit = git(["rev-list", "-n", "1", name]);
  const changelogPath = resolve(ROOT, config.changelogFile);
  if (!existsSync(changelogPath)) throw new Error(`Changelog not found: ${config.changelogFile}`);
  const changelog = readFileSync(changelogPath, "utf8");
  const escapedVersion = version.replace(/[.+]/g, "\\$&");
  const section = changelog.match(new RegExp(`^## ${escapedVersion}\\s*\\n([\\s\\S]*?)(?=^## |$)`, "m"));
  if (!section?.[1]?.trim()) throw new Error(`No changelog section found for ${version}; refusing to create an empty draft.`);
  const notes = section[1].trim();
  gh(["release", "create", name, "--draft", "--title", name, "--notes", notes, "--target", tagCommit]);
  console.log(`Created GitHub draft release ${name}. Review it before publishing.`);
}
function publish(version: string, flags: Map<string, string | boolean>, config: Config) {
  if (flags.get("confirm-publish") !== true) throw new Error("Publishing requires --confirm-publish after separate user approval.");
  assertGh();
  const name = `${config.tagPrefix}${version}`;
  const view = gh(["release", "view", name, "--json", "isDraft,url,tagName"]);
  const release = JSON.parse(view) as { isDraft: boolean; url: string; tagName: string };
  if (!release.isDraft) throw new Error(`${name} is not a draft; refusing to modify an already published release.`);
  gh(["release", "edit", name, "--draft=false"]);
  const verified = JSON.parse(gh(["release", "view", name, "--json", "isDraft,url"])) as { isDraft: boolean; url: string };
  if (verified.isDraft) throw new Error("GitHub did not confirm publication.");
  console.log(`Published: ${verified.url}`);
}
function help() {
  console.log(`GitHub Release Manager

Commands:
  plan [--dry-run]                         Read-only release analysis
  apply --approved-version X.Y.Z           Update version file and changelog
  tag --approved-version X.Y.Z --confirm-tag
  push-tag --approved-version X.Y.Z --confirm-push
  draft --approved-version X.Y.Z           Create a GitHub draft release
  publish --approved-version X.Y.Z --confirm-publish

Each approval flag represents a separate user approval gate.
`);
}
async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const command = positional[0] ?? "help";
  const config = loadConfig();
  if (command === "help" || flags.has("help")) return help();
  if (command === "plan") return printPlan(config);
  if (command === "apply") return apply(requireApproved(flags), config);
  if (command === "tag") return tag(requireApproved(flags), flags, config);
  if (command === "push-tag") return pushTag(requireApproved(flags), flags, config);
  if (command === "draft") return draft(requireApproved(flags), config);
  if (command === "publish") return publish(requireApproved(flags), flags, config);
  throw new Error(`Unknown command: ${command}`);
}
main().catch(error => { console.error(`Release Manager: ${(error as Error).message}`); process.exitCode = 1; });
