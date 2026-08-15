import { describe, expect, it } from "vitest";
import {
  musicBrainzArtistId,
  parseMusicBrainzArtistId,
} from "@/lib/providers/musicbrainz";

describe("musicbrainz ids", () => {
  it("builds and parses stable artist ids", () => {
    const mbid = "b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d";
    expect(musicBrainzArtistId(mbid)).toBe(`mb-artist-${mbid}`);
    expect(parseMusicBrainzArtistId(`mb-artist-${mbid}`)).toBe(mbid);
    expect(parseMusicBrainzArtistId("mu-1")).toBeNull();
    expect(parseMusicBrainzArtistId("ol-book-OL1W")).toBeNull();
  });
});
