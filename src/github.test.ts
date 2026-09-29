import { describe, expect, it } from "vitest";
import { parseRepoInput } from "./github";

describe("parseRepoInput", () => {
  it("accepts owner/repository", () => {
    expect(parseRepoInput("timwmcqueen/FieldOps")).toEqual({
      owner: "timwmcqueen",
      repo: "FieldOps",
    });
  });

  it("accepts full GitHub URLs and strips .git", () => {
    expect(parseRepoInput("https://github.com/facebook/react.git")).toEqual({
      owner: "facebook",
      repo: "react",
    });
  });

  it("rejects non-GitHub hosts", () => {
    expect(() => parseRepoInput("https://example.com/test/repo")).toThrow(/GitHub/);
  });
});
