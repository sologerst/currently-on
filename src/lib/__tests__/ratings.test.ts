import { describe, expect, it } from "vitest";
import { ratingLabel, starsOutOfFive } from "@/lib/ratings";

describe("ratings", () => {
  it("maps TMDb /10 scores onto a 5-star scale", () => {
    expect(starsOutOfFive(8.4)).toBe(4.2);
    expect(starsOutOfFive(10)).toBe(5);
  });

  it("leaves already-5-star scores alone", () => {
    expect(starsOutOfFive(4.5)).toBe(4.5);
    expect(starsOutOfFive(0)).toBe(0);
  });

  it("formats labels without trailing zeros", () => {
    expect(ratingLabel(10)).toBe("5");
    expect(ratingLabel(8.4)).toBe("4.2");
    expect(ratingLabel(undefined)).toBeNull();
  });
});
