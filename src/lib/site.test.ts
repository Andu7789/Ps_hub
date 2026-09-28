import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/site";

describe("safeNextPath", () => {
  it("keeps same-site paths", () => {
    expect(safeNextPath("/app/staff")).toBe("/app/staff");
  });

  it("rejects anything that could leave the site", () => {
    expect(safeNextPath("https://evil.test")).toBe("/");
    expect(safeNextPath("//evil.test")).toBe("/");
    expect(safeNextPath("/\\evil.test")).toBe("/");
    expect(safeNextPath(undefined, "/me")).toBe("/me");
  });
});
