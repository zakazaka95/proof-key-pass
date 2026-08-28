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

const PR_PATTERN =
  /^https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+)\/pull\/(\d+)/i;

export function parsePullRequestUrl(input: string): PullRequestRef | null {
  const match = PR_PATTERN.exec(input.trim());
  if (!match) return null;
  return {
    owner: match[1]!,
    repo: match[2]!,
    number: Number(match[3]),
    url: `https://github.com/${match[1]}/${match[2]}/pull/${match[3]}`,
  };
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

export function formatRepoUrl(url: string): string {
  return url.replace(/^https?:\/\/(?:www\.)?github\.com\//i, "").replace(/\/$/, "");
}
