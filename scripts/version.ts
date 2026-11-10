export type CommitLike = { subject: string; body: string };
export type ParsedVersion = { major: number; minor: number; patch: number; raw: string };

export function parseSemVer(value: string): ParsedVersion | null {
  const match = value.match(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]), raw: value };
}

export function calculateNextVersion(current: string | null, commits: CommitLike[]) {
  const base = parseSemVer(current ?? "0.0.0")!;
  let level = 0;
  const reasons: string[] = [];
  for (const commit of commits) {
    const breaking = /(^|\n)BREAKING CHANGE:/i.test(commit.body) || /^[a-z]+(?:\([^)]*\))?!:/i.test(commit.subject);
    const type = commit.subject.match(/^([a-z]+)(?:\([^)]*\))?(!)?:/i)?.[1]?.toLowerCase();
    if (breaking) { level = Math.max(level, 3); reasons.push(`Breaking change: ${commit.subject}`); }
    else if (type === "feat") { level = Math.max(level, 2); reasons.push(`Feature: ${commit.subject}`); }
    else if (["fix", "perf", "revert"].includes(type ?? "")) { level = Math.max(level, 1); reasons.push(`Fix/improvement: ${commit.subject}`); }
  }
  if (!commits.length) reasons.push("No commits found in the release range.");
  if (level === 3) {
    if (base.major === 0) return { version: `0.${base.minor + 1}.0`, bump: "minor (0.x breaking change)", reasons };
    return { version: `${base.major + 1}.0.0`, bump: "major", reasons };
  }
  if (level === 2) return { version: `${base.major}.${base.minor + 1}.0`, bump: "minor", reasons };
  if (level === 1) return { version: `${base.major}.${base.minor}.${base.patch + 1}`, bump: "patch", reasons };
  return {
    version: `${base.major}.${base.minor}.${base.patch + 1}`,
    bump: "patch (fallback)",
    reasons: [...reasons, "No recognized feat/fix/perf commit; review this conservative fallback."]
  };
}
