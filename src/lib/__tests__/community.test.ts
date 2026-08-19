import { describe, expect, it } from "vitest";
import { isCurrentlyOnStatus } from "@/lib/categories";
import {
  handleIsValid,
  looksLikeEmail,
  normalizeHandle,
  profileLabel,
  slugFromTitle,
} from "@/lib/community";

describe("community helpers", () => {
  it("normalizes handles to url-safe slugs", () => {
    expect(normalizeHandle("Tim Gerst")).toBe("timgerst");
    expect(normalizeHandle("Hello-World!!")).toBe("helloworld");
    expect(handleIsValid("tim_g")).toBe(true);
    expect(handleIsValid("ab")).toBe(false);
    expect(handleIsValid("Tim")).toBe(false);
  });

  it("builds list slugs from titles", () => {
    expect(slugFromTitle("Rainy Sunday movies")).toBe("rainy-sunday-movies");
    expect(slugFromTitle("!!!")).toBe("list");
  });

  it("detects emails vs handles", () => {
    expect(looksLikeEmail("tim@thinkswell.com")).toBe(true);
    expect(looksLikeEmail("tim_g")).toBe(false);
  });

  it("falls back to handle for labels", () => {
    expect(profileLabel({ displayName: "Tim", handle: "tim" })).toBe("Tim");
    expect(profileLabel({ displayName: "  ", handle: "tim" })).toBe("tim");
  });
});

describe("currently on status", () => {
  it("matches the SQL helper", () => {
    expect(isCurrentlyOnStatus("tv", "watching")).toBe(true);
    expect(isCurrentlyOnStatus("tv", "want")).toBe(false);
    expect(isCurrentlyOnStatus("movies", "want")).toBe(true);
    expect(isCurrentlyOnStatus("books", "reading")).toBe(true);
    expect(isCurrentlyOnStatus("music", "following")).toBe(true);
  });
});
