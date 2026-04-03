import { describe, it, expect } from "vitest";
import {
  PRESENCE_MIN_INTERVAL_MS,
  shouldSkipPresenceWrite,
} from "./presence-throttle";

describe("presence-throttle", () => {
  it("does not skip when there is no previous write", () => {
    expect(
      shouldSkipPresenceWrite(null, 1_000_000, PRESENCE_MIN_INTERVAL_MS)
    ).toBe(false);
  });

  it("skips when within min interval", () => {
    const now = 1_000_000;
    const prev = now - 30_000;
    expect(shouldSkipPresenceWrite(prev, now, 60_000)).toBe(true);
  });

  it("allows write after min interval", () => {
    const now = 1_000_000;
    const prev = now - 61_000;
    expect(shouldSkipPresenceWrite(prev, now, 60_000)).toBe(false);
  });
});
