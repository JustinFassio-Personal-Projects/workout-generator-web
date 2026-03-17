import { describe, expect, it } from "vitest";

import {
  buildDailyStateDoc,
  computeOverallSoreness,
  dailyStatePatchSchema,
  timeOfDaySchema,
} from "./dailyStateSchemas";

describe("dailyStateSchemas", () => {
  describe("dailyStatePatchSchema", () => {
    it("accepts a valid patch", () => {
      const parsed = dailyStatePatchSchema.parse({
        energy_level: 6,
        sleep_quality: 7,
        sleep_hours: 7.5,
        stress_level: 4,
        motivation_level: 8,
        soreness_areas: [{ area: "legs", level: 3 }],
        muscle_group_focus: [],
        current_location: "home",
        available_time: 45,
        weather_condition: null,
        temperature: null,
        cycle_phase: null,
        cycle_symptoms: null,
        data_source: "manual",
      });

      expect(parsed.energy_level).toBe(6);
      expect(parsed.soreness_areas[0]?.area).toBe("legs");
    });

    it("rejects out-of-range scale values", () => {
      expect(() =>
        dailyStatePatchSchema.parse({
          energy_level: 0,
          sleep_quality: 7,
          sleep_hours: null,
          stress_level: 4,
          motivation_level: 8,
          soreness_areas: [],
          muscle_group_focus: [],
          current_location: "home",
          available_time: null,
          weather_condition: null,
          temperature: null,
          cycle_phase: null,
          cycle_symptoms: null,
          data_source: "manual",
        })
      ).toThrow();
    });

    it("accepts valid muscle_group_focus when percentages sum to 100", () => {
      const parsed = dailyStatePatchSchema.parse({
        energy_level: 6,
        sleep_quality: 7,
        sleep_hours: null,
        stress_level: 4,
        motivation_level: 8,
        soreness_areas: [],
        muscle_group_focus: [
          { area: "legs", percentage: 50, locked: true },
          { area: "back", percentage: 50, locked: false },
        ],
        current_location: "home",
        available_time: null,
        weather_condition: null,
        temperature: null,
        cycle_phase: null,
        cycle_symptoms: null,
        data_source: "manual",
      });
      expect(parsed.muscle_group_focus).toHaveLength(2);
    });

    it("rejects muscle_group_focus when percentages do not sum to 100", () => {
      expect(() =>
        dailyStatePatchSchema.parse({
          energy_level: 6,
          sleep_quality: 7,
          sleep_hours: null,
          stress_level: 4,
          motivation_level: 8,
          soreness_areas: [],
          muscle_group_focus: [
            { area: "legs", percentage: 60, locked: false },
            { area: "back", percentage: 50, locked: false },
          ],
          current_location: "home",
          available_time: null,
          weather_condition: null,
          temperature: null,
          cycle_phase: null,
          cycle_symptoms: null,
          data_source: "manual",
        })
      ).toThrow(/sum to 100/);
    });

    it("rejects muscle_group_focus when areas are duplicated", () => {
      expect(() =>
        dailyStatePatchSchema.parse({
          energy_level: 6,
          sleep_quality: 7,
          sleep_hours: null,
          stress_level: 4,
          motivation_level: 8,
          soreness_areas: [],
          muscle_group_focus: [
            { area: "legs", percentage: 50, locked: false },
            { area: "legs", percentage: 50, locked: false },
          ],
          current_location: "home",
          available_time: null,
          weather_condition: null,
          temperature: null,
          cycle_phase: null,
          cycle_symptoms: null,
          data_source: "manual",
        })
      ).toThrow(/duplicate areas/);
    });
  });

  describe("computeOverallSoreness", () => {
    it("returns 0 for empty list", () => {
      expect(computeOverallSoreness([])).toBe(0);
    });

    it("returns average soreness level", () => {
      expect(
        computeOverallSoreness([
          { area: "legs", level: 2 },
          { area: "back", level: 4 },
          { area: "core", level: 6 },
        ])
      ).toBe(4);
    });
  });

  describe("buildDailyStateDoc", () => {
    it("builds schema-aligned doc and computes overall_soreness", () => {
      const patch = dailyStatePatchSchema.parse({
        energy_level: 6,
        sleep_quality: 7,
        sleep_hours: 7,
        stress_level: 4,
        motivation_level: 8,
        soreness_areas: [
          { area: "legs", level: 2 },
          { area: "back", level: 4 },
        ],
        muscle_group_focus: [],
        current_location: "home",
        available_time: 45,
        weather_condition: null,
        temperature: null,
        cycle_phase: null,
        cycle_symptoms: null,
        data_source: "manual",
      });

      const doc = buildDailyStateDoc({
        uid: "uid123",
        dateISO: "2025-12-30",
        patch,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        created_at: {} as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        updated_at: {} as any,
        saved_at_datetime: "2025-12-30T10:30:00.000Z",
      });

      expect(doc.id).toBe("uid123_2025-12-30");
      expect(doc.user_id).toBe("uid123");
      expect(doc.date).toBe("2025-12-30");
      expect(doc.overall_soreness).toBe(3);
      expect(timeOfDaySchema.safeParse(doc.time_of_day).success).toBe(true);
    });
  });
});
