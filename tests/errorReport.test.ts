import { describe as suite, it, expect } from "vitest";
import {
  buildReport,
  describeError,
  errorKey,
  headline,
  REPORT_LIMIT,
  type CaughtError,
} from "../src/utils/errorReport";

const at = 1_700_000_000_000;

function caught(error: unknown, extra: Partial<CaughtError> = {}): CaughtError {
  return { source: "render", error, at, ...extra };
}

suite("describeError", () => {
  it("reads a real Error", () => {
    const error = new TypeError("x is not a function");
    expect(describeError(error)).toMatchObject({
      name: "TypeError",
      message: "x is not a function",
    });
  });

  it("copes with the things people actually throw", () => {
    expect(describeError("just a string")).toMatchObject({ message: "just a string" });
    expect(describeError({ message: "from a rejected fetch", name: "HttpError" }))
      .toMatchObject({ name: "HttpError", message: "from a rejected fetch" });
    expect(describeError(null).message).toBe("null");
    expect(describeError(undefined).message).toBe("undefined");
  });

  it("does not settle for [object Object]", () => {
    expect(describeError({ status: 500, url: "/x" }).message).toContain("500");
  });
});

suite("headline", () => {
  it("names the kind of error when there is one worth naming", () => {
    expect(headline(new TypeError("nope"))).toBe("TypeError: nope");
    expect(headline(new Error("nope"))).toBe("nope");
  });

  it("flattens a multi-line message onto one line", () => {
    expect(headline(new Error("first\n   second"))).toBe("first second");
  });
});

suite("errorKey", () => {
  it("gives the same fault the same key, so a repeat is a count not a card", () => {
    const error = new Error("boom");
    expect(errorKey(caught(error))).toBe(errorKey(caught(error)));
  });

  it("separates different messages and different places", () => {
    expect(errorKey(caught(new Error("a")))).not.toBe(errorKey(caught(new Error("b"))));
    expect(errorKey(caught(new Error("a"), { where: "Hero Manager" })))
      .not.toBe(errorKey(caught(new Error("a"), { where: "Monster Manager" })));
  });
});

suite("buildReport", () => {
  it("says what broke, where, and on which build", () => {
    const report = buildReport(caught(new Error("boom"), { where: "Hero Manager" }), {
      buildId: "abc1234",
    });
    expect(report).toContain("Hero Manager");
    expect(report).toContain("abc1234");
    expect(report).toContain("boom");
  });

  it("comes fenced, so Discord renders it as a block", () => {
    const report = buildReport(caught(new Error("boom")));
    expect(report.startsWith("```\n")).toBe(true);
    expect(report.endsWith("\n```")).toBe(true);
  });

  it("fits in a Discord message even when the stack is enormous", () => {
    const error = new Error("boom");
    error.stack = Array.from({ length: 400 }, (_, i) => `    at frame${i} (bundle.js:${i}:1)`).join("\n");
    const report = buildReport(caught(error, { componentStack: error.stack }), {
      buildId: "abc1234",
      userAgent: "Mozilla/5.0 ".repeat(20),
      url: "/",
    });
    expect(report.length).toBeLessThanOrEqual(REPORT_LIMIT);
    expect(report).toContain("trimmed");
    /* The top frames are the ones that point at the bug. */
    expect(report).toContain("frame0");
  });

  it("keeps the component stack, which is the part that names the component", () => {
    const report = buildReport(
      caught(new Error("boom"), { componentStack: "\n    at HeroRow\n    at HeroManager" })
    );
    expect(report).toContain("at HeroRow");
  });

  it("defuses a fence inside the error's own text", () => {
    const report = buildReport(caught(new Error("look: ``` and more")));
    /* Exactly the two fences we opened and closed, and no third to break out. */
    expect(report.match(/```/g)).toHaveLength(2);
  });

  it("reports only what it was given — no URL means no URL line", () => {
    const report = buildReport(caught(new Error("boom")), { buildId: "abc1234" });
    expect(report).not.toContain("Page:");
  });

  it("never carries a query string, because reports get posted in public", () => {
    /* The Patreon redirect lands as ?code=<authorization code> and the monster
       share links carry their payload the same way. readContext passes the
       pathname alone; this pins the shape the builder prints. */
    const report = buildReport(caught(new Error("boom")), {
      buildId: "abc1234",
      url: "/",
    });
    expect(report).toContain("Page:    /");
    expect(report).not.toContain("code=");
    expect(report).not.toContain("?");
  });
});
