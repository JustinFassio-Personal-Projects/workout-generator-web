import { describe, it, expect, vi, beforeEach } from "vitest";
import { Timestamp } from "firebase/firestore";
import type { AiPrompt, PromptInjection, PromptSet } from "@/types/firestore";
import type { Trainer } from "@/types/trainer";

// Hoist mock variables to avoid initialization order issues
const { mockDocGet, mockDoc, mockCollection } = vi.hoisted(() => {
  const mockDocGet = vi.fn();
  const mockDoc = vi.fn(() => ({
    get: mockDocGet,
  }));
  const mockCollection = vi.fn((collectionName: string) => {
    if (collectionName === "prompt_sets") {
      return {
        doc: mockDoc,
        where: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => ({
              get: vi.fn(),
            })),
          })),
        })),
      };
    }
    return {
      doc: mockDoc,
    };
  });

  return { mockDocGet, mockDoc, mockCollection };
});

// Mock firebase-admin
vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: mockCollection,
  },
}));

// Import after mocks are defined
import {
  resolvePromptForTarget,
  resolvePromptSetForTrainer,
} from "../ai-prompts";

// Mock prompt normalization to return data as-is (simplified for testing)
vi.mock("@/lib/prompt-normalize", () => ({
  normalizeAiPrompt: vi.fn(
    (data: Record<string, unknown>, id: string): AiPrompt => {
      return {
        ...(data as unknown as AiPrompt),
        id,
        is_active:
          typeof data.is_active === "boolean"
            ? data.is_active
            : typeof (data as { isActive?: boolean }).isActive === "boolean"
              ? (data as { isActive: boolean }).isActive
              : true,
      };
    }
  ),
  normalizePromptSet: vi.fn(
    (data: Record<string, unknown>, id: string): PromptSet => {
      return {
        ...(data as unknown as PromptSet),
        id,
        is_active:
          typeof data.is_active === "boolean"
            ? data.is_active
            : typeof (data as { isActive?: boolean }).isActive === "boolean"
              ? (data as { isActive: boolean }).isActive
              : true,
        is_default:
          typeof data.is_default === "boolean"
            ? data.is_default
            : typeof (data as { isDefault?: boolean }).isDefault === "boolean"
              ? (data as { isDefault: boolean }).isDefault
              : false,
      };
    }
  ),
  normalizePromptInjection: vi.fn(
    (data: Record<string, unknown>, id: string): PromptInjection => {
      return {
        ...(data as unknown as PromptInjection),
        id,
        is_active:
          typeof data.is_active === "boolean"
            ? data.is_active
            : typeof (data as { isActive?: boolean }).isActive === "boolean"
              ? (data as { isActive: boolean }).isActive
              : true,
      };
    }
  ),
}));

describe("ai-prompts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("resolvePromptForTarget - Template Rendering", () => {
    it("should render template variables correctly", async () => {
      const prompt: AiPrompt = {
        id: "test-prompt",
        name: "Test Prompt",
        type: "workout_generation",
        category: "workout_generation",
        content: "Hello {{trainer_name}}, your focus is {{focus}}",
        version: 1,
        is_active: true,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
        created_by: "admin",
      };

      const promptSet: PromptSet = {
        id: "test-set",
        name: "Test Set",
        workout_generation_prompt_id: "test-prompt",
        is_active: true,
        is_default: false,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      const trainer: Trainer = {
        id: "marcus_chen",
        name: "Marcus Chen",
        nickname: "The Foundation",
        tagline: "",
        description: "",
        philosophy: "",
        personality: "",
        imageUrl: null,
        accentColor: "",
        borderColor: "",
        focuses: [],
        stats: { workoutsGenerated: 0, avgRating: 0 },
        recommendedFor: [],
        isActive: true,
        displayOrder: 0,
      };

      // Mock Firestore responses
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        id: "test-prompt",
        data: () => prompt,
      });

      const result = await resolvePromptForTarget({
        trainer,
        promptSet,
        target: "workout_generation",
        context: { focus: "strength" },
      });

      expect(result.prompt).toContain("Marcus Chen");
      expect(result.prompt).toContain("strength");
      expect(result.metadata?.prompt_set_id).toBe("test-set");
    });

    it("should handle missing template variables gracefully", async () => {
      const prompt: AiPrompt = {
        id: "test-prompt",
        name: "Test Prompt",
        type: "workout_generation",
        category: "workout_generation",
        content: "Hello {{trainer_name}}, missing: {{missing_var}}",
        version: 1,
        is_active: true,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
        created_by: "admin",
      };

      const promptSet: PromptSet = {
        id: "test-set",
        name: "Test Set",
        workout_generation_prompt_id: "test-prompt",
        is_active: true,
        is_default: false,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      mockDocGet.mockResolvedValueOnce({
        exists: true,
        id: "test-prompt",
        data: () => prompt,
      });

      const result = await resolvePromptForTarget({
        promptSet,
        target: "workout_generation",
        context: {},
      });

      // Missing variables should be replaced with empty string
      expect(result.prompt).toBeTruthy();
      expect(result.prompt).not.toContain("{{missing_var}}");
    });
  });

  describe("resolvePromptForTarget - Injection Conditions", () => {
    it("should apply injection when fitness_level condition matches", async () => {
      const prompt: AiPrompt = {
        id: "base-prompt",
        name: "Base Prompt",
        type: "coach_explain",
        category: "coach_explain",
        content: "Base prompt content",
        version: 1,
        is_active: true,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
        created_by: "admin",
      };

      const injection: PromptInjection = {
        id: "beginner-injection",
        name: "Beginner Injection",
        type: "append",
        content: "This is for beginners",
        priority: 10,
        is_active: true,
        conditions: {
          fitness_level: ["beginner"],
        },
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      const promptSet: PromptSet = {
        id: "test-set",
        name: "Test Set",
        coach_explain_prompt_id: "base-prompt",
        injection_ids: ["beginner-injection"],
        is_active: true,
        is_default: false,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      mockDocGet
        .mockResolvedValueOnce({
          exists: true,
          id: "base-prompt",
          data: () => prompt,
        })
        .mockResolvedValueOnce({
          exists: true,
          id: "beginner-injection",
          data: () => injection,
        });

      const result = await resolvePromptForTarget({
        promptSet,
        target: "coach_explain",
        context: { user_fitness_level: "beginner" },
      });

      expect(result.prompt).toContain("Base prompt content");
      expect(result.prompt).toContain("This is for beginners");
      expect(result.metadata?.injection_ids).toContain("beginner-injection");
    });

    it("should not apply injection when fitness_level condition does not match", async () => {
      const prompt: AiPrompt = {
        id: "base-prompt",
        name: "Base Prompt",
        type: "coach_explain",
        category: "coach_explain",
        content: "Base prompt content",
        version: 1,
        is_active: true,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
        created_by: "admin",
      };

      const injection: PromptInjection = {
        id: "beginner-injection",
        name: "Beginner Injection",
        type: "append",
        content: "This is for beginners",
        priority: 10,
        is_active: true,
        conditions: {
          fitness_level: ["beginner"],
        },
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      const promptSet: PromptSet = {
        id: "test-set",
        name: "Test Set",
        coach_explain_prompt_id: "base-prompt",
        injection_ids: ["beginner-injection"],
        is_active: true,
        is_default: false,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      mockDocGet
        .mockResolvedValueOnce({
          exists: true,
          id: "base-prompt",
          data: () => prompt,
        })
        .mockResolvedValueOnce({
          exists: true,
          id: "beginner-injection",
          data: () => injection,
        });

      const result = await resolvePromptForTarget({
        promptSet,
        target: "coach_explain",
        context: { user_fitness_level: "advanced" },
      });

      expect(result.prompt).toBe("Base prompt content");
      expect(result.prompt).not.toContain("This is for beginners");
      expect(result.metadata?.injection_ids).toEqual([]);
    });

    it("should apply injection when has_injuries condition matches", async () => {
      const prompt: AiPrompt = {
        id: "base-prompt",
        name: "Base Prompt",
        type: "workout_generation",
        category: "workout_generation",
        content: "Base prompt content",
        version: 1,
        is_active: true,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
        created_by: "admin",
      };

      const injection: PromptInjection = {
        id: "injury-warning",
        name: "Injury Warning",
        type: "append",
        content: "CRITICAL SAFETY: User has injuries",
        priority: 10,
        is_active: true,
        conditions: {
          has_injuries: true,
        },
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      const promptSet: PromptSet = {
        id: "test-set",
        name: "Test Set",
        workout_generation_prompt_id: "base-prompt",
        injection_ids: ["injury-warning"],
        is_active: true,
        is_default: false,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      mockDocGet
        .mockResolvedValueOnce({
          exists: true,
          id: "base-prompt",
          data: () => prompt,
        })
        .mockResolvedValueOnce({
          exists: true,
          id: "injury-warning",
          data: () => injection,
        });

      const result = await resolvePromptForTarget({
        promptSet,
        target: "workout_generation",
        context: { user_injuries: ["knee", "shoulder"] },
      });

      expect(result.prompt).toContain("CRITICAL SAFETY");
      expect(result.metadata?.injection_ids).toContain("injury-warning");
    });
  });

  describe("resolvePromptForTarget - Injection Application", () => {
    it("should prepend injection content", async () => {
      const prompt: AiPrompt = {
        id: "base-prompt",
        name: "Base Prompt",
        type: "workout_generation",
        category: "workout_generation",
        content: "Base prompt content",
        version: 1,
        is_active: true,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
        created_by: "admin",
      };

      const injection: PromptInjection = {
        id: "prepend-injection",
        name: "Prepend Test",
        type: "prepend",
        content: "Prepended content",
        priority: 10,
        is_active: true,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      const promptSet: PromptSet = {
        id: "test-set",
        name: "Test Set",
        workout_generation_prompt_id: "base-prompt",
        injection_ids: ["prepend-injection"],
        is_active: true,
        is_default: false,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      mockDocGet
        .mockResolvedValueOnce({
          exists: true,
          id: "base-prompt",
          data: () => prompt,
        })
        .mockResolvedValueOnce({
          exists: true,
          id: "prepend-injection",
          data: () => injection,
        });

      const result = await resolvePromptForTarget({
        promptSet,
        target: "workout_generation",
      });

      expect(result.prompt).toContain("Prepended content");
      expect(result.prompt).toContain("Base prompt content");
      // Prepend should come first
      expect(result.prompt?.indexOf("Prepended content")).toBeLessThan(
        result.prompt?.indexOf("Base prompt content") ?? -1
      );
    });

    it("should append injection content", async () => {
      const prompt: AiPrompt = {
        id: "base-prompt",
        name: "Base Prompt",
        type: "workout_generation",
        category: "workout_generation",
        content: "Base prompt content",
        version: 1,
        is_active: true,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
        created_by: "admin",
      };

      const injection: PromptInjection = {
        id: "append-injection",
        name: "Append Test",
        type: "append",
        content: "Appended content",
        priority: 10,
        is_active: true,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      const promptSet: PromptSet = {
        id: "test-set",
        name: "Test Set",
        workout_generation_prompt_id: "base-prompt",
        injection_ids: ["append-injection"],
        is_active: true,
        is_default: false,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      mockDocGet
        .mockResolvedValueOnce({
          exists: true,
          id: "base-prompt",
          data: () => prompt,
        })
        .mockResolvedValueOnce({
          exists: true,
          id: "append-injection",
          data: () => injection,
        });

      const result = await resolvePromptForTarget({
        promptSet,
        target: "workout_generation",
      });

      expect(result.prompt).toContain("Base prompt content");
      expect(result.prompt).toContain("Appended content");
      // Append should come after
      expect(result.prompt?.indexOf("Base prompt content")).toBeLessThan(
        result.prompt?.indexOf("Appended content") ?? -1
      );
    });

    it("should replace section when target_section is found", async () => {
      const prompt: AiPrompt = {
        id: "base-prompt",
        name: "Base Prompt",
        type: "workout_generation",
        category: "workout_generation",
        content: "Base prompt with TARGET_SECTION to replace",
        version: 1,
        is_active: true,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
        created_by: "admin",
      };

      const injection: PromptInjection = {
        id: "replace-injection",
        name: "Replace Test",
        type: "replace_section",
        target_section: "TARGET_SECTION",
        content: "Replaced content",
        priority: 10,
        is_active: true,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      const promptSet: PromptSet = {
        id: "test-set",
        name: "Test Set",
        workout_generation_prompt_id: "base-prompt",
        injection_ids: ["replace-injection"],
        is_active: true,
        is_default: false,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      mockDocGet
        .mockResolvedValueOnce({
          exists: true,
          id: "base-prompt",
          data: () => prompt,
        })
        .mockResolvedValueOnce({
          exists: true,
          id: "replace-injection",
          data: () => injection,
        });

      const result = await resolvePromptForTarget({
        promptSet,
        target: "workout_generation",
      });

      expect(result.prompt).toContain("Replaced content");
      expect(result.prompt).not.toContain("TARGET_SECTION");
    });

    it("should fallback to append when replace_section target not found", async () => {
      const prompt: AiPrompt = {
        id: "base-prompt",
        name: "Base Prompt",
        type: "workout_generation",
        category: "workout_generation",
        content: "Base prompt without target",
        version: 1,
        is_active: true,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
        created_by: "admin",
      };

      const injection: PromptInjection = {
        id: "replace-injection",
        name: "Replace Test",
        type: "replace_section",
        target_section: "MISSING_SECTION",
        content: "Fallback content",
        priority: 10,
        is_active: true,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      const promptSet: PromptSet = {
        id: "test-set",
        name: "Test Set",
        workout_generation_prompt_id: "base-prompt",
        injection_ids: ["replace-injection"],
        is_active: true,
        is_default: false,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      // Mock console.warn to verify warning is logged
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      mockDocGet
        .mockResolvedValueOnce({
          exists: true,
          id: "base-prompt",
          data: () => prompt,
        })
        .mockResolvedValueOnce({
          exists: true,
          id: "replace-injection",
          data: () => injection,
        });

      const result = await resolvePromptForTarget({
        promptSet,
        target: "workout_generation",
      });

      expect(result.prompt).toContain("Base prompt without target");
      expect(result.prompt).toContain("Fallback content");
      // Check that console.warn was called with a message containing the expected text
      // The implementation now passes two arguments: message string and context object
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("could not find target_section"),
        expect.any(Object)
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe("resolvePromptForTarget - Prompt ID Resolution", () => {
    it("should resolve workout_generation prompt ID with fallback", async () => {
      const prompt: AiPrompt = {
        id: "workout-prompt",
        name: "Workout Prompt",
        type: "workout_generation",
        category: "workout_generation",
        content: "Workout prompt content",
        version: 1,
        is_active: true,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
        created_by: "admin",
      };

      const promptSet: PromptSet = {
        id: "test-set",
        name: "Test Set",
        workout_generation_prompt_id: "workout-prompt",
        is_active: true,
        is_default: false,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      mockDocGet.mockResolvedValueOnce({
        exists: true,
        id: "workout-prompt",
        data: () => prompt,
      });

      const result = await resolvePromptForTarget({
        promptSet,
        target: "workout_generation",
      });

      expect(result.prompt).toBe("Workout prompt content");
      expect(result.metadata?.prompt_ids).toContain("workout-prompt");
    });

    it("should fallback to system_prompt_id when workout_generation_prompt_id is missing", async () => {
      const prompt: AiPrompt = {
        id: "system-prompt",
        name: "System Prompt",
        type: "system",
        category: "general",
        content: "System prompt content",
        version: 1,
        is_active: true,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
        created_by: "admin",
      };

      const promptSet: PromptSet = {
        id: "test-set",
        name: "Test Set",
        system_prompt_id: "system-prompt",
        is_active: true,
        is_default: false,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      mockDocGet.mockResolvedValueOnce({
        exists: true,
        id: "system-prompt",
        data: () => prompt,
      });

      const result = await resolvePromptForTarget({
        promptSet,
        target: "workout_generation",
      });

      expect(result.prompt).toBe("System prompt content");
    });

    it("should return null prompt when no prompt IDs are available", async () => {
      const promptSet: PromptSet = {
        id: "test-set",
        name: "Test Set",
        is_active: true,
        is_default: false,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      const result = await resolvePromptForTarget({
        promptSet,
        target: "workout_generation",
      });

      expect(result.prompt).toBeNull();
      expect(result.metadata?.prompt_set_id).toBe("test-set");
      expect(result.metadata?.prompt_ids).toEqual([]);
    });
  });

  describe("resolvePromptSetForTrainer", () => {
    it("should return trainer's prompt set when available", async () => {
      const trainer: Trainer = {
        id: "marcus_chen",
        name: "Marcus Chen",
        nickname: "",
        tagline: "",
        description: "",
        philosophy: "",
        personality: "",
        imageUrl: null,
        prompt_set_id: "trainer-prompt-set",
        accentColor: "",
        borderColor: "",
        focuses: [],
        stats: { workoutsGenerated: 0, avgRating: 0 },
        recommendedFor: [],
        isActive: true,
        displayOrder: 0,
      };

      const promptSet: PromptSet = {
        id: "trainer-prompt-set",
        name: "Trainer Prompt Set",
        is_active: true,
        is_default: false,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      mockDocGet.mockResolvedValueOnce({
        exists: true,
        id: "trainer-prompt-set",
        data: () => promptSet,
      });

      const result = await resolvePromptSetForTrainer(trainer);

      expect(result).not.toBeNull();
      expect(result?.id).toBe("trainer-prompt-set");
    });

    it("should fallback to default prompt set when trainer has no prompt_set_id", async () => {
      const trainer: Trainer = {
        id: "marcus_chen",
        name: "Marcus Chen",
        nickname: "",
        tagline: "",
        description: "",
        philosophy: "",
        personality: "",
        imageUrl: null,
        accentColor: "",
        borderColor: "",
        focuses: [],
        stats: { workoutsGenerated: 0, avgRating: 0 },
        recommendedFor: [],
        isActive: true,
        displayOrder: 0,
      };

      const defaultPromptSet: PromptSet = {
        id: "default-prompt-set",
        name: "Default Prompt Set",
        is_active: true,
        is_default: true,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      const mockWhere = vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => ({
            get: vi.fn().mockResolvedValue({
              empty: false,
              docs: [
                {
                  exists: true,
                  id: "default-prompt-set",
                  data: () => defaultPromptSet,
                },
              ],
            }),
          })),
        })),
      }));

      mockCollection.mockReturnValueOnce({
        doc: mockDoc,
        where: mockWhere,
      });

      const result = await resolvePromptSetForTrainer(trainer);

      expect(result).not.toBeNull();
      expect(result?.id).toBe("default-prompt-set");
      expect(result?.is_default).toBe(true);
    });

    it("should return null when no prompt set is available", async () => {
      const trainer: Trainer = {
        id: "marcus_chen",
        name: "Marcus Chen",
        nickname: "",
        tagline: "",
        description: "",
        philosophy: "",
        personality: "",
        imageUrl: null,
        accentColor: "",
        borderColor: "",
        focuses: [],
        stats: { workoutsGenerated: 0, avgRating: 0 },
        recommendedFor: [],
        isActive: true,
        displayOrder: 0,
      };

      const mockWhere = vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => ({
            get: vi.fn().mockResolvedValue({
              empty: true,
              docs: [],
            }),
          })),
        })),
      }));

      mockCollection.mockReturnValueOnce({
        doc: mockDoc,
        where: mockWhere,
      });

      const result = await resolvePromptSetForTrainer(trainer);

      expect(result).toBeNull();
    });
  });

  describe("Injection Priority Sorting", () => {
    it("should apply injections in priority order", async () => {
      const prompt: AiPrompt = {
        id: "base-prompt",
        name: "Base Prompt",
        type: "workout_generation",
        category: "workout_generation",
        content: "Base",
        version: 1,
        is_active: true,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
        created_by: "admin",
      };

      const injection1: PromptInjection = {
        id: "injection-1",
        name: "First Injection",
        type: "append",
        content: "First",
        priority: 20,
        is_active: true,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      const injection2: PromptInjection = {
        id: "injection-2",
        name: "Second Injection",
        type: "append",
        content: "Second",
        priority: 10,
        is_active: true,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      const promptSet: PromptSet = {
        id: "test-set",
        name: "Test Set",
        workout_generation_prompt_id: "base-prompt",
        injection_ids: ["injection-1", "injection-2"],
        is_active: true,
        is_default: false,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      mockDocGet
        .mockResolvedValueOnce({
          exists: true,
          id: "base-prompt",
          data: () => prompt,
        })
        .mockResolvedValueOnce({
          exists: true,
          id: "injection-1",
          data: () => injection1,
        })
        .mockResolvedValueOnce({
          exists: true,
          id: "injection-2",
          data: () => injection2,
        });

      const result = await resolvePromptForTarget({
        promptSet,
        target: "workout_generation",
      });

      // Lower priority (10) should come before higher priority (20)
      expect(result.prompt).toContain("Base");
      expect(result.prompt).toContain("Second");
      expect(result.prompt).toContain("First");
      const secondIndex = result.prompt?.indexOf("Second") ?? -1;
      const firstIndex = result.prompt?.indexOf("First") ?? -1;
      expect(secondIndex).toBeLessThan(firstIndex);
    });
  });
});
