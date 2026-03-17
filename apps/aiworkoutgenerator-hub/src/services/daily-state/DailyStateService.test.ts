import { beforeEach, describe, expect, it, vi } from "vitest";

import { DailyStateService } from "./DailyStateService";

vi.mock("firebase/firestore", () => {
  const mockDocRef = { type: "document", id: "mock-doc-ref" };
  return {
    doc: vi.fn(() => mockDocRef),
    getDoc: vi.fn(),
    setDoc: vi.fn(),
    serverTimestamp: vi.fn(() => ({ _seconds: 1234567890, _nanoseconds: 0 })),
  };
});

vi.mock("@/lib/firestore", () => ({
  getDbInstance: vi.fn(() => ({ type: "firestore" })),
}));

describe("DailyStateService", () => {
  const uid = "test-user-123";
  const dateISO = "2025-12-30";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds the correct doc path", async () => {
    const { doc } = await import("firebase/firestore");
    const { getDbInstance } = await import("@/lib/firestore");

    DailyStateService.dailyStateDoc(uid, dateISO);

    expect(doc).toHaveBeenCalledWith(
      getDbInstance(),
      "user_daily_state",
      `${uid}_${dateISO}`
    );
  });

  it("returns null when daily state does not exist", async () => {
    const { getDoc } = await import("firebase/firestore");
    const mockSnapshot = { exists: () => false };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(getDoc).mockResolvedValue(mockSnapshot as any);

    const res = await DailyStateService.getUserDailyState(uid, dateISO);
    expect(res).toBeNull();
  });

  it("upserts daily state and sets merge true", async () => {
    const { getDoc, setDoc, doc } = await import("firebase/firestore");
    const mockSnapshot = { exists: () => false };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(getDoc).mockResolvedValue(mockSnapshot as any);

    await DailyStateService.upsertUserDailyState(uid, dateISO, {
      energy_level: 6,
      sleep_quality: 7,
      sleep_hours: 7,
      stress_level: 4,
      motivation_level: 8,
      soreness_areas: [],
      muscle_group_focus: [],
      current_location: "home",
      available_time: 45,
      weather_condition: null,
      temperature: null,
      cycle_phase: null,
      cycle_symptoms: null,
      data_source: "manual",
    });

    const docCallArgs = vi.mocked(doc).mock.results[0]?.value;
    expect(setDoc).toHaveBeenCalledWith(
      docCallArgs,
      expect.objectContaining({
        id: `${uid}_${dateISO}`,
        user_id: uid,
        date: dateISO,
        energy_level: 6,
      }),
      { merge: true }
    );
  });

  it("preserves created_at when document already exists", async () => {
    const { getDoc, setDoc, doc } = await import("firebase/firestore");

    const existingCreatedAt = { _seconds: 1, _nanoseconds: 0 };
    const mockSnapshot = {
      exists: () => true,
      data: () => ({ created_at: existingCreatedAt }),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(getDoc).mockResolvedValue(mockSnapshot as any);

    await DailyStateService.upsertUserDailyState(uid, dateISO, {
      energy_level: 6,
      sleep_quality: 7,
      sleep_hours: 7,
      stress_level: 4,
      motivation_level: 8,
      soreness_areas: [],
      muscle_group_focus: [],
      current_location: "home",
      available_time: 45,
      weather_condition: null,
      temperature: null,
      cycle_phase: null,
      cycle_symptoms: null,
      data_source: "manual",
    });

    const docCallArgs = vi.mocked(doc).mock.results[0]?.value;
    expect(setDoc).toHaveBeenCalledWith(
      docCallArgs,
      expect.objectContaining({
        created_at: existingCreatedAt,
      }),
      { merge: true }
    );
  });
});
