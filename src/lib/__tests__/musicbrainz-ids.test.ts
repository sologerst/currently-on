import { describe, expect, it } from "vitest";
import {
  coverArtUrl,
  musicBrainzAlbumId,
  musicBrainzArtistId,
  parseMusicBrainzAlbumId,
  parseMusicBrainzArtistId,
} from "@/lib/providers/musicbrainz";

describe("musicbrainz ids", () => {
  it("builds and parses stable artist and album ids", () => {
    const mbid = "b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d";
    expect(musicBrainzArtistId(mbid)).toBe(`mb-artist-${mbid}`);
    expect(musicBrainzAlbumId(mbid)).toBe(`mb-album-${mbid}`);
    expect(parseMusicBrainzArtistId(`mb-artist-${mbid}`)).toBe(mbid);
    expect(parseMusicBrainzAlbumId(`mb-album-${mbid}`)).toBe(mbid);
    expect(parseMusicBrainzArtistId("mu-1")).toBeNull();
    expect(parseMusicBrainzAlbumId("mb-artist-" + mbid)).toBeNull();
  });

  it("builds Cover Art Archive front URLs", () => {
    const mbid = "b1392450-e666-3926-a536-22c65f834433";
    expect(coverArtUrl(mbid)).toBe(
      `https://coverartarchive.org/release-group/${mbid}/front-250`,
    );
  });
});
