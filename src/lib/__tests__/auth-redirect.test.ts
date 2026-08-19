import { describe, expect, it } from "vitest";
import { passwordIsStrongEnough, safeNextPath } from "@/lib/auth-redirect";

describe("safeNextPath", () => {
  it("allows relative app paths", () => {
    expect(safeNextPath("/friends")).toBe("/friends");
    expect(safeNextPath("/join/abc123")).toBe("/join/abc123");
    expect(safeNextPath("/auth/update-password")).toBe("/auth/update-password");
  });

  it("blocks open redirects", () => {
    expect(safeNextPath("//evil.com")).toBe("/friends");
    expect(safeNextPath("https://evil.com")).toBe("/friends");
    expect(safeNextPath("/\\evil")).toBe("/friends");
    expect(safeNextPath("friends")).toBe("/friends");
    expect(safeNextPath(null)).toBe("/friends");
  });
});

describe("passwordIsStrongEnough", () => {
  it("requires at least 8 characters", () => {
    expect(passwordIsStrongEnough("short")).toBe(false);
    expect(passwordIsStrongEnough("longenough")).toBe(true);
  });
});
