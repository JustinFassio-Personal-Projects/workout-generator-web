import { describe, it, expect } from "vitest";
import {
  parseServiceAccountKey,
  getServiceAccountProjectId,
} from "../parse-service-account";

const MINIMAL_SA = {
  type: "service_account",
  project_id: "test-project",
  client_email: "test@test-project.iam.gserviceaccount.com",
  private_key_id: "key-id",
  private_key: "-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n",
};

describe("parse-service-account", () => {
  describe("parseServiceAccountKey", () => {
    it("parses valid JSON without extra quotes", () => {
      const raw = JSON.stringify(MINIMAL_SA);
      const result = parseServiceAccountKey(raw);
      expect(result.type).toBe("service_account");
      expect(result.project_id).toBe("test-project");
    });

    it("strips surrounding single quotes", () => {
      const raw = `'${JSON.stringify(MINIMAL_SA)}'`;
      const result = parseServiceAccountKey(raw);
      expect(result.project_id).toBe("test-project");
    });

    it("trims leading and trailing whitespace", () => {
      const raw = `  ${JSON.stringify(MINIMAL_SA)}  `;
      const result = parseServiceAccountKey(raw);
      expect(result.project_id).toBe("test-project");
    });

    it("throws on invalid JSON", () => {
      expect(() => parseServiceAccountKey("not json")).toThrow();
      expect(() => parseServiceAccountKey("{ invalid }")).toThrow();
      expect(() => parseServiceAccountKey("")).toThrow();
    });

    it("throws when JSON is valid but stripped result is invalid", () => {
      expect(() => parseServiceAccountKey("''")).toThrow();
    });
  });

  describe("getServiceAccountProjectId", () => {
    it("returns projectId when present (camelCase)", () => {
      const sa = { projectId: "camel-project" };
      expect(getServiceAccountProjectId(sa)).toBe("camel-project");
    });

    it("returns project_id when present (snake_case)", () => {
      const sa = { project_id: "snake-project" };
      expect(getServiceAccountProjectId(sa)).toBe("snake-project");
    });

    it("prefers projectId over project_id when both exist", () => {
      const sa = { projectId: "camel", project_id: "snake" };
      expect(getServiceAccountProjectId(sa)).toBe("camel");
    });

    it("returns undefined when neither is set", () => {
      const sa = {};
      expect(getServiceAccountProjectId(sa)).toBeUndefined();
    });
  });
});
