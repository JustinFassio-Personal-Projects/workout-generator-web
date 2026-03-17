import { describe, it, expect } from "vitest";
import { Timestamp } from "firebase/firestore";
import { normalizeTrainerData } from "../trainer-normalize";
import { TRAINERS } from "@/types/trainer";
import type { Trainer } from "@/types/trainer";

describe("trainer-normalize", () => {
  describe("normalizeTrainerData", () => {
    describe("Basic Field Normalization", () => {
      it("should normalize trainer with camelCase fields", () => {
        const rawData = {
          name: "Test Trainer",
          nickname: "Test Nickname",
          tagline: "Test Tagline",
          description: "Test Description",
          philosophy: "Test Philosophy",
          personality: "Test Personality",
          imageUrl: "https://example.com/image.jpg",
          accentColor: "#FF0000",
          borderColor: "#000000",
          isActive: true,
          displayOrder: 5,
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");

        expect(result.name).toBe("Test Trainer");
        expect(result.nickname).toBe("Test Nickname");
        expect(result.tagline).toBe("Test Tagline");
        expect(result.description).toBe("Test Description");
        expect(result.philosophy).toBe("Test Philosophy");
        expect(result.personality).toBe("Test Personality");
        expect(result.imageUrl).toBe("https://example.com/image.jpg");
        expect(result.accentColor).toBe("#FF0000");
        expect(result.borderColor).toBe("#000000");
        expect(result.isActive).toBe(true);
        expect(result.displayOrder).toBe(5);
      });

      it("should normalize trainer with snake_case fields", () => {
        const rawData = {
          display_name: "Test Trainer",
          nickname: "Test Nickname",
          profile_image_url: "https://example.com/profile.jpg",
          is_active: false,
          order: 10,
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");

        expect(result.name).toBe("Test Trainer");
        expect(result.nickname).toBe("Test Nickname");
        expect(result.profile_image_url).toBe(
          "https://example.com/profile.jpg"
        );
        expect(result.imageUrl).toBe("https://example.com/profile.jpg");
        expect(result.isActive).toBe(false);
        expect(result.displayOrder).toBe(10);
      });

      it("should prioritize camelCase over snake_case when both are present", () => {
        const rawData = {
          name: "CamelCase Name",
          display_name: "SnakeCase Name",
          isActive: true,
          is_active: false,
          displayOrder: 5,
          order: 10,
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");

        expect(result.name).toBe("CamelCase Name");
        expect(result.isActive).toBe(true);
        expect(result.displayOrder).toBe(5);
      });
    });

    describe("Fallback to Base Trainer", () => {
      it("should fallback to base trainer when fields are missing", () => {
        const rawData = {};

        const result = normalizeTrainerData(rawData, "marcus_chen");
        const baseTrainer = TRAINERS.find((t) => t.id === "marcus_chen");

        expect(result.name).toBe(baseTrainer?.name);
        expect(result.nickname).toBe(baseTrainer?.nickname);
        expect(result.tagline).toBe(baseTrainer?.tagline);
        expect(result.description).toBe(baseTrainer?.description);
        expect(result.philosophy).toBe(baseTrainer?.philosophy);
        expect(result.personality).toBe(baseTrainer?.personality);
        expect(result.accentColor).toBe(baseTrainer?.accentColor);
        expect(result.borderColor).toBe(baseTrainer?.borderColor);
        expect(result.focuses).toEqual(baseTrainer?.focuses);
        expect(result.stats).toEqual(baseTrainer?.stats);
        expect(result.recommendedFor).toEqual(baseTrainer?.recommendedFor);
        expect(result.isActive).toBe(baseTrainer?.isActive);
        expect(result.displayOrder).toBe(baseTrainer?.displayOrder);
      });

      it("should fallback to base trainer when null/undefined values provided", () => {
        const rawData = {
          name: null,
          nickname: undefined,
          tagline: null,
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");
        const baseTrainer = TRAINERS.find((t) => t.id === "marcus_chen");

        expect(result.name).toBe(baseTrainer?.name);
        expect(result.nickname).toBe(baseTrainer?.nickname ?? "");
        expect(result.tagline).toBe(baseTrainer?.tagline ?? "");
      });

      it("should use id as name fallback when no base trainer exists", () => {
        const rawData = {};
        const unknownId = "unknown_trainer_id";

        const result = normalizeTrainerData(rawData, unknownId);

        expect(result.id).toBe(unknownId);
        expect(result.name).toBe(unknownId);
      });
    });

    describe("Image URL Handling", () => {
      it("should prioritize imageUrl over profile_image_url", () => {
        const rawData = {
          imageUrl: "https://example.com/image.jpg",
          profile_image_url: "https://example.com/profile.jpg",
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");

        expect(result.imageUrl).toBe("https://example.com/image.jpg");
        expect(result.profile_image_url).toBe(
          "https://example.com/profile.jpg"
        );
      });

      it("should use profile_image_url as imageUrl when imageUrl is missing", () => {
        const rawData = {
          profile_image_url: "https://example.com/profile.jpg",
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");

        expect(result.imageUrl).toBe("https://example.com/profile.jpg");
        expect(result.profile_image_url).toBe(
          "https://example.com/profile.jpg"
        );
      });

      it("should fallback to base trainer imageUrl when both are missing", () => {
        const rawData = {};
        const baseTrainer = TRAINERS.find((t) => t.id === "marcus_chen");

        const result = normalizeTrainerData(rawData, "marcus_chen");

        expect(result.imageUrl).toBe(baseTrainer?.imageUrl ?? null);
      });

      it("should handle null imageUrl values", () => {
        const rawData = {
          imageUrl: null,
          profile_image_url: null,
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");

        expect(result.imageUrl).toBeNull();
        expect(result.profile_image_url).toBeNull();
      });

      it("should normalize profile_image_storage_path", () => {
        const rawData = {
          profile_image_storage_path: "trainers/marcus_chen/image.jpg",
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");

        expect(result.profile_image_storage_path).toBe(
          "trainers/marcus_chen/image.jpg"
        );
      });
    });

    describe("Focuses Normalization", () => {
      it("should normalize focuses array with valid data", () => {
        const rawData = {
          focuses: [
            {
              id: "strength_training",
              name: "Strength Training",
              icon: "💪",
              isPrimary: true,
            },
            {
              id: "cardio",
              name: "Cardio",
              icon: "❤️",
              isPrimary: false,
            },
          ],
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");

        expect(result.focuses).toHaveLength(2);
        expect(result.focuses[0]).toEqual({
          id: "strength_training",
          name: "Strength Training",
          icon: "💪",
          isPrimary: true,
        });
        expect(result.focuses[1]).toEqual({
          id: "cardio",
          name: "Cardio",
          icon: "❤️",
          isPrimary: false,
        });
      });

      it("should normalize focuses with snake_case is_primary field", () => {
        const rawData = {
          focuses: [
            {
              id: "strength_training",
              name: "Strength Training",
              icon: "💪",
              is_primary: true,
            },
          ],
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");

        expect(result.focuses[0].isPrimary).toBe(true);
      });

      it("should filter out invalid focus items", () => {
        const rawData = {
          focuses: [
            { id: "valid", name: "Valid Focus", icon: "💪", isPrimary: true },
            null,
            undefined,
            "invalid",
            123,
            {},
          ],
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");

        expect(result.focuses).toHaveLength(1);
        expect(result.focuses[0].id).toBe("valid");
      });

      it("should use base trainer focuses when raw focuses array is empty", () => {
        const rawData = {
          focuses: [],
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");
        const baseTrainer = TRAINERS.find((t) => t.id === "marcus_chen");

        expect(result.focuses).toEqual(baseTrainer?.focuses ?? []);
      });

      it("should use base trainer focuses when focuses is not an array", () => {
        const rawData = {
          focuses: "not an array",
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");
        const baseTrainer = TRAINERS.find((t) => t.id === "marcus_chen");

        expect(result.focuses).toEqual(baseTrainer?.focuses ?? []);
      });

      it("should merge focuses with base trainer focuses by index", () => {
        const rawData = {
          focuses: [
            {
              id: "custom_strength",
              name: "Custom Strength",
              // Missing icon and isPrimary, should use base values
            },
          ],
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");
        const baseTrainer = TRAINERS.find((t) => t.id === "marcus_chen");

        expect(result.focuses[0].id).toBe("custom_strength");
        expect(result.focuses[0].name).toBe("Custom Strength");
        expect(result.focuses[0].icon).toBe(
          baseTrainer?.focuses[0]?.icon ?? "💪"
        );
      });
    });

    describe("Stats Normalization", () => {
      it("should normalize stats with camelCase fields", () => {
        const rawData = {
          stats: {
            workoutsGenerated: 100,
            avgRating: 4.5,
          },
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");

        expect(result.stats.workoutsGenerated).toBe(100);
        expect(result.stats.avgRating).toBe(4.5);
      });

      it("should normalize stats with snake_case fields", () => {
        const rawData = {
          stats: {
            workouts_generated: 200,
            avg_rating: 4.8,
          },
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");

        expect(result.stats.workoutsGenerated).toBe(200);
        expect(result.stats.avgRating).toBe(4.8);
      });

      it("should prioritize camelCase over snake_case for stats", () => {
        const rawData = {
          stats: {
            workoutsGenerated: 100,
            workouts_generated: 200,
            avgRating: 4.5,
            avg_rating: 4.8,
          },
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");

        expect(result.stats.workoutsGenerated).toBe(100);
        expect(result.stats.avgRating).toBe(4.5);
      });

      it("should fallback to base trainer stats when stats are missing", () => {
        const rawData = {};

        const result = normalizeTrainerData(rawData, "marcus_chen");
        const baseTrainer = TRAINERS.find((t) => t.id === "marcus_chen");

        expect(result.stats).toEqual(baseTrainer?.stats);
      });

      it("should handle invalid stat values", () => {
        const rawData = {
          stats: {
            workoutsGenerated: "invalid",
            avgRating: null,
          },
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");
        const baseTrainer = TRAINERS.find((t) => t.id === "marcus_chen");

        expect(result.stats.workoutsGenerated).toBe(
          baseTrainer?.stats.workoutsGenerated ?? 0
        );
        expect(result.stats.avgRating).toBe(baseTrainer?.stats.avgRating ?? 0);
      });

      it("should handle Infinity and NaN stat values", () => {
        const rawData = {
          stats: {
            workoutsGenerated: Infinity,
            avgRating: NaN,
          },
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");
        const baseTrainer = TRAINERS.find((t) => t.id === "marcus_chen");

        expect(result.stats.workoutsGenerated).toBe(
          baseTrainer?.stats.workoutsGenerated ?? 0
        );
        expect(result.stats.avgRating).toBe(baseTrainer?.stats.avgRating ?? 0);
      });
    });

    describe("RecommendedFor Normalization", () => {
      it("should normalize recommendedFor with camelCase field", () => {
        const rawData = {
          recommendedFor: ["build_muscle", "gain_strength"],
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");

        expect(result.recommendedFor).toEqual([
          "build_muscle",
          "gain_strength",
        ]);
      });

      it("should normalize recommendedFor with snake_case field", () => {
        const rawData = {
          recommended_for: ["lose_weight", "improve_cardio"],
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");

        expect(result.recommendedFor).toEqual([
          "lose_weight",
          "improve_cardio",
        ]);
      });

      it("should prioritize camelCase over snake_case for recommendedFor", () => {
        const rawData = {
          recommendedFor: ["build_muscle"],
          recommended_for: ["lose_weight"],
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");

        expect(result.recommendedFor).toEqual(["build_muscle"]);
      });

      it("should filter out non-string values from recommendedFor", () => {
        const rawData = {
          recommendedFor: [
            "build_muscle",
            null,
            undefined,
            123,
            "gain_strength",
          ],
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");

        expect(result.recommendedFor).toEqual([
          "build_muscle",
          "gain_strength",
        ]);
      });

      it("should fallback to base trainer recommendedFor when both are empty", () => {
        const rawData = {
          recommendedFor: [],
          recommended_for: [],
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");
        const baseTrainer = TRAINERS.find((t) => t.id === "marcus_chen");

        expect(result.recommendedFor).toEqual(
          baseTrainer?.recommendedFor ?? []
        );
      });

      it("should handle non-array recommendedFor values", () => {
        const rawData = {
          recommendedFor: "not an array",
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");
        const baseTrainer = TRAINERS.find((t) => t.id === "marcus_chen");

        expect(result.recommendedFor).toEqual(
          baseTrainer?.recommendedFor ?? []
        );
      });
    });

    describe("Prompt-Related Fields", () => {
      it("should normalize prompt_set_id from camelCase", () => {
        const rawData = {
          promptSetId: "prompt-set-123",
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");

        expect(result.prompt_set_id).toBe("prompt-set-123");
      });

      it("should normalize prompt_set_id from snake_case", () => {
        const rawData = {
          prompt_set_id: "prompt-set-456",
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");

        expect(result.prompt_set_id).toBe("prompt-set-456");
      });

      it("should prioritize camelCase over snake_case for prompt_set_id", () => {
        const rawData = {
          promptSetId: "prompt-set-123",
          prompt_set_id: "prompt-set-456",
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");

        expect(result.prompt_set_id).toBe("prompt-set-123");
      });

      it("should normalize prompt_injections from snake_case", () => {
        const rawData = {
          prompt_injections: ["injection-1", "injection-2"],
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");

        expect(result.prompt_injections).toEqual([
          "injection-1",
          "injection-2",
        ]);
      });

      it("should normalize prompt_injections from camelCase", () => {
        const rawData = {
          promptInjections: ["injection-3", "injection-4"],
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");

        expect(result.prompt_injections).toEqual([
          "injection-3",
          "injection-4",
        ]);
      });

      it("should prioritize snake_case over camelCase for prompt_injections", () => {
        const rawData = {
          prompt_injections: ["injection-1"],
          promptInjections: ["injection-2"],
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");

        expect(result.prompt_injections).toEqual(["injection-1"]);
      });

      it("should filter out non-string values from prompt_injections", () => {
        const rawData = {
          prompt_injections: [
            "injection-1",
            null,
            undefined,
            123,
            "injection-2",
          ],
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");

        expect(result.prompt_injections).toEqual([
          "injection-1",
          "injection-2",
        ]);
      });

      it("should handle null prompt_set_id", () => {
        const rawData = {
          prompt_set_id: null,
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");

        expect(result.prompt_set_id).toBeNull();
      });
    });

    describe("Timestamp Normalization", () => {
      it("should normalize Timestamp from Firestore", () => {
        const now = Timestamp.now();
        const rawData = {
          createdAt: now,
          updatedAt: now,
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");

        expect(result.createdAt).toBeInstanceOf(Timestamp);
        expect(result.updatedAt).toBeInstanceOf(Timestamp);
      });

      it("should normalize timestamps with snake_case fields", () => {
        const now = Timestamp.now();
        const rawData = {
          created_at: now,
          updated_at: now,
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");

        expect(result.createdAt).toBeInstanceOf(Timestamp);
        expect(result.updatedAt).toBeInstanceOf(Timestamp);
      });

      it("should convert timestamp-like objects with toDate method", () => {
        const date = new Date();
        const timestampLike = {
          toDate: () => date,
        };

        const rawData = {
          createdAt: timestampLike,
          updatedAt: timestampLike,
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");

        expect(result.createdAt).toBeInstanceOf(Timestamp);
        expect(result.updatedAt).toBeInstanceOf(Timestamp);
        expect(result.createdAt?.toDate()).toEqual(date);
        expect(result.updatedAt?.toDate()).toEqual(date);
      });

      it("should handle invalid timestamp values", () => {
        const rawData = {
          createdAt: "invalid",
          updatedAt: null,
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");

        expect(result.createdAt).toBeUndefined();
        expect(result.updatedAt).toBeUndefined();
      });
    });

    describe("Type Safety and Edge Cases", () => {
      it("should handle mixed valid and invalid field types", () => {
        const rawData = {
          name: "Valid Name",
          nickname: 123, // Invalid
          tagline: null,
          description: undefined,
          isActive: "true", // Invalid (string instead of boolean)
          displayOrder: "5", // Invalid (string instead of number)
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");
        const baseTrainer = TRAINERS.find((t) => t.id === "marcus_chen");

        expect(result.name).toBe("Valid Name");
        expect(result.nickname).toBe(baseTrainer?.nickname ?? "");
        expect(result.tagline).toBe(baseTrainer?.tagline ?? "");
        expect(result.description).toBe(baseTrainer?.description ?? "");
        expect(result.isActive).toBe(baseTrainer?.isActive ?? true);
        expect(result.displayOrder).toBe(baseTrainer?.displayOrder ?? 0);
      });

      it("should handle empty object", () => {
        const rawData = {};

        const result = normalizeTrainerData(rawData, "marcus_chen");

        expect(result).toBeDefined();
        expect(result.id).toBe("marcus_chen");
        expect(result.name).toBeTruthy();
      });

      it("should always return a valid Trainer object", () => {
        const rawData = {
          invalidField: "should be ignored",
          anotherInvalidField: { nested: "object" },
        };

        const result = normalizeTrainerData(rawData, "marcus_chen");

        expect(result).toBeDefined();
        expect(result.id).toBe("marcus_chen");
        expect(typeof result.name).toBe("string");
        expect(typeof result.nickname).toBe("string");
        expect(typeof result.isActive).toBe("boolean");
        expect(typeof result.displayOrder).toBe("number");
        expect(Array.isArray(result.focuses)).toBe(true);
        expect(Array.isArray(result.recommendedFor)).toBe(true);
        expect(result.stats).toBeDefined();
        expect(typeof result.stats.workoutsGenerated).toBe("number");
        expect(typeof result.stats.avgRating).toBe("number");
      });

      it("should handle different trainer IDs correctly", () => {
        const trainerIds: Trainer["id"][] = [
          "marcus_chen",
          "rivera_santos",
          "alex_kim",
          "jordan_williams",
          "elena_popov",
          "ryder_cross",
        ];

        trainerIds.forEach((id) => {
          const result = normalizeTrainerData({}, id);
          const baseTrainer = TRAINERS.find((t) => t.id === id);

          expect(result.id).toBe(id);
          if (baseTrainer) {
            expect(result.name).toBe(baseTrainer.name);
            expect(result.focuses.length).toBeGreaterThan(0);
          }
        });
      });
    });
  });
});
