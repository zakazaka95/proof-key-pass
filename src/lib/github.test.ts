/**
 * GitHub public status fetching: real network call shape (fetch is the browser API)
 * with error paths exercised through a stubbed global fetch.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchAllPullRequests,
  fetchPullRequestStatus,
  parsePullRequestUrl,
} from "./github";

const REF = parsePullRequestUrl("https://github.com/octocat/Hello-World/pull/42")!;

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(impl: (url: string) => Promise<Response> | Response) {
  const spy = vi.fn((url: string) => impl(url));
  vi.stubGlobal("fetch", spy as unknown as typeof fetch);
  return spy;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

describe("parsePullRequestUrl", () => {
  it("parses a canonical PR url", () => {
    expect(REF).toEqual({
      owner: "octocat",
      repo: "Hello-World",
      number: 42,
      url: "https://github.com/octocat/Hello-World/pull/42",
    });
  });

  it("rejects non-PR urls", () => {
    expect(parsePullRequestUrl("https://github.com/octocat/Hello-World")).toBeNull();
    expect(parsePullRequestUrl("https://evil.example/x/y/pull/1")).toBeNull();
  });
});

describe("fetchPullRequestStatus hits the live GitHub REST endpoint", () => {
  it("calls api.github.com with no credentials and maps merged state", async () => {
    const spy = stubFetch(() =>
      json({
        title: "Add feature",
        user: { login: "octocat" },
        state: "closed",
        merged_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-02T00:00:00Z",
        html_url: "https://github.com/octocat/Hello-World/pull/42",
      }),
    );
    const status = await fetchPullRequestStatus(REF);
    expect(spy.mock.calls[0]![0]).toBe(
      "https://api.github.com/repos/octocat/Hello-World/pulls/42",
    );
    const init = (spy.mock.calls[0] as unknown[])[1] as RequestInit;
    expect(JSON.stringify(init.headers)).not.toMatch(/authorization|token/i);
    expect(status.state).toBe("merged");
    expect(status.author).toBe("octocat");
  });

  it("maps an open pull request", async () => {
    stubFetch(() => json({ state: "open", merged_at: null, title: "WIP" }));
    expect((await fetchPullRequestStatus(REF)).state).toBe("open");
  });

  it("maps a closed-unmerged pull request", async () => {
    stubFetch(() => json({ state: "closed", merged_at: null }));
    expect((await fetchPullRequestStatus(REF)).state).toBe("closed");
  });
});

describe("GitHub error handling is graceful", () => {
  it("404 becomes an unavailable status, not a throw", async () => {
    stubFetch(() => new Response("", { status: 404 }));
    const status = await fetchPullRequestStatus(REF);
    expect(status.state).toBe("unavailable");
    expect(status.error).toMatch(/Not found/);
  });

  it("403 rate limit is explained", async () => {
    stubFetch(() => new Response("", { status: 403 }));
    expect((await fetchPullRequestStatus(REF)).error).toMatch(/rate limit/);
  });

  it("429 rate limit is explained", async () => {
    stubFetch(() => new Response("", { status: 429 }));
    expect((await fetchPullRequestStatus(REF)).error).toMatch(/rate limit/);
  });

  it("500 surfaces the status code", async () => {
    stubFetch(() => new Response("", { status: 500 }));
    expect((await fetchPullRequestStatus(REF)).error).toMatch(/responded 500/);
  });

  it("network failure is caught", async () => {
    stubFetch(() => Promise.reject(new TypeError("Failed to fetch")));
    const status = await fetchPullRequestStatus(REF);
    expect(status.state).toBe("unavailable");
    expect(status.error).toMatch(/Network unavailable/);
  });

  it("one failing pull request does not break a batch", async () => {
    stubFetch((url) =>
      url.endsWith("/1")
        ? json({ state: "open", merged_at: null })
        : new Response("", { status: 404 }),
    );
    const refs = [
      parsePullRequestUrl("https://github.com/o/r/pull/1")!,
      parsePullRequestUrl("https://github.com/o/r/pull/2")!,
    ];
    const results = await fetchAllPullRequests(refs);
    expect(results.map((r) => r.state)).toEqual(["open", "unavailable"]);
  });
});
