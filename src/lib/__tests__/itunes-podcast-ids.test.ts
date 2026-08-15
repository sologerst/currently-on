import { describe, expect, it } from "vitest";
import {
  artworkUrl,
  itunesPodcastId,
  parseItunesPodcastId,
} from "@/lib/providers/itunes-podcasts";

describe("itunes podcast ids", () => {
  it("builds and parses stable collection ids", () => {
    expect(itunesPodcastId(1200361736)).toBe("itunes-pod-1200361736");
    expect(parseItunesPodcastId("itunes-pod-1200361736")).toBe("1200361736");
    expect(parseItunesPodcastId("itunes-pod-abc")).toBeNull();
    expect(parseItunesPodcastId("po-1")).toBeNull();
  });

  it("prefers 600px artwork and upgrades smaller thumb URLs", () => {
    expect(
      artworkUrl(
        "https://example.com/a/600x600bb.jpg",
        "https://example.com/a/100x100bb.jpg",
      ),
    ).toBe("https://example.com/a/600x600bb.jpg");
    expect(artworkUrl(undefined, "https://example.com/a/100x100bb.jpg")).toBe(
      "https://example.com/a/600x600bb.jpg",
    );
    expect(
      artworkUrl(undefined, undefined, "https://example.com/a/170x170bb.png"),
    ).toBe("https://example.com/a/600x600bb.png");
  });
});
