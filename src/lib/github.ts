/**
 * Public GitHub REST lookups, executed from the browser with no token.
 * A fetched status NEVER proves that a DID holder controls the GitHub account.
 */

export interface PullRequestRef {
  owner: string;
  repo: string;
  number: number;
  url: string;
}

export type PullRequestState = "open" | "merged" | "closed" | "unavailable";

export interface PullRequestStatus {
  ref: PullRequestRef;
  state: PullRequestState;
  title?: string | undefined;
  author?: string | undefined;
  updatedAt?: string | undefined;
  htmlUrl: string;
  error?: string | undefined;
}

export function parsePullRequestUrl(input: string): PullRequestRef | null {
  try {
    const parsed = new URL(input.trim());
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      !["github.com", "www.github.com"].includes(parsed.hostname.toLowerCase()) ||
      parsed.username ||
      parsed.password
    ) {
      return null;
    }
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (
      parts.length !== 4 ||
      parts[2] !== "pull" ||
      !/^[A-Za-z0-9._-]+$/.test(parts[0] ?? "") ||
      !/^[A-Za-z0-9._-]+$/.test(parts[1] ?? "") ||
      !/^[0-9]+$/.test(parts[3] ?? "")
    ) {
      return null;
    }
    const number = Number(parts[3]);
    if (!Number.isSafeInteger(number) || number < 1) return null;
    const owner = parts[0]!;
    const repo = parts[1]!;
    return {
      owner,
      repo,
      number,
      url: `https://github.com/${owner}/${repo}/pull/${number}`,
    };
  } catch {
    return null;
  }
}

export async function fetchPullRequestStatus(
  ref: PullRequestRef,
  signal?: AbortSignal,
): Promise<PullRequestStatus> {
  const base: PullRequestStatus = {
    ref,
    state: "unavailable",
    htmlUrl: ref.url,
  };
  try {
    const response = await fetch(
      `https://api.github.com/repos/${ref.owner}/${ref.repo}/pulls/${ref.number}`,
      {
        headers: { Accept: "application/vnd.github+json" },
        ...(signal ? { signal } : {}),
      },
    );

    if (response.status === 404) {
      return { ...base, error: "Not found, private or deleted" };
    }
    if (response.status === 403 || response.status === 429) {
      return { ...base, error: "GitHub rate limit reached — try again later" };
    }
    if (!response.ok) {
      return { ...base, error: `GitHub responded ${response.status}` };
    }

    const data = (await response.json()) as {
      title?: string;
      user?: { login?: string };
      state?: string;
      merged_at?: string | null;
      updated_at?: string;
      html_url?: string;
    };

    const state: PullRequestState = data.merged_at
      ? "merged"
      : data.state === "open"
        ? "open"
        : "closed";

    return {
      ref,
      state,
      title: data.title ?? "Untitled pull request",
      author: data.user?.login,
      updatedAt: data.updated_at,
      htmlUrl: data.html_url ?? ref.url,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { ...base, error: "Request cancelled" };
    }
    return { ...base, error: "Network unavailable" };
  }
}

export async function fetchAllPullRequests(
  refs: PullRequestRef[],
  signal?: AbortSignal,
): Promise<PullRequestStatus[]> {
  return Promise.all(refs.map((ref) => fetchPullRequestStatus(ref, signal)));
}

export function statusesMatchPullRequestRefs(
  refs: PullRequestRef[],
  statuses: PullRequestStatus[],
): boolean {
  return (
    refs.length === statuses.length &&
    refs.every((ref, index) => {
      const statusRef = statuses[index]?.ref;
      return (
        statusRef?.owner === ref.owner &&
        statusRef.repo === ref.repo &&
        statusRef.number === ref.number
      );
    })
  );
}

export function uniquePullRequestRefs(refs: PullRequestRef[]): PullRequestRef[] {
  const seen = new Set<string>();
  return refs.filter((ref) => {
    const key = `${ref.owner.toLowerCase()}/${ref.repo.toLowerCase()}#${ref.number}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function formatRepoUrl(url: string): string {
  return url.replace(/^https?:\/\/(?:www\.)?github\.com\//i, "").replace(/\/$/, "");
}
