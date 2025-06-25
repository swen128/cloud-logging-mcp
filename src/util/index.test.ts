import { describe, expect, test } from "bun:test";
import { getValueByPath, redactSensitiveInfo } from "./index";

describe("Utility Functions", () => {
  describe("redactSensitiveInfo", () => {
    test("should redact API keys", () => {
      const text = 'apiKey: "abcdef1234567890"';
      const redacted = redactSensitiveInfo(text);
      expect(redacted).toContain("****");
      expect(redacted).not.toContain("abcdef1234567890");
      // Should preserve first and last 4 chars
      expect(redacted).toMatch(/apiKey: "abcd\*+7890"/);
    });

    test("should redact credit card numbers", () => {
      const text = "My card is 1234-5678-9012-3456";
      const redacted = redactSensitiveInfo(text);
      expect(redacted).toContain("****");
      expect(redacted).not.toContain("1234-5678-9012-3456");
    });

    test("should redact email addresses", () => {
      const text = "Contact me at user@example.com";
      const redacted = redactSensitiveInfo(text);
      expect(redacted).toContain("****");
      expect(redacted).not.toContain("user@example.com");
    });

    test("should redact IP addresses", () => {
      const text = "Server IP: 192.168.1.1";
      const redacted = redactSensitiveInfo(text);
      expect(redacted).toContain("****");
      expect(redacted).not.toContain("192.168.1.1");
    });

    test("should handle empty input", () => {
      expect(redactSensitiveInfo("")).toBe("");
      expect(redactSensitiveInfo(null as unknown as string)).toBe(null as unknown as string);
      expect(redactSensitiveInfo(undefined as unknown as string)).toBe(
        undefined as unknown as string,
      );
    });
  });

  describe("getValueByPath", () => {
    const testObj = {
      name: "Test",
      metadata: {
        labels: {
          service: "api",
          version: "v1",
        },
      },
      data: {
        message: "Hello",
      },
    };

    test("should get value from top level", () => {
      expect(getValueByPath(testObj, "name")).toBe("Test");
    });

    test("should get value from nested path", () => {
      expect(getValueByPath(testObj, "metadata.labels.service")).toBe("api");
      expect(getValueByPath(testObj, "data.message")).toBe("Hello");
    });

    test("should return undefined for non-existent path", () => {
      expect(getValueByPath(testObj, "foo")).toBeUndefined();
      expect(getValueByPath(testObj, "metadata.foo")).toBeUndefined();
      expect(getValueByPath(testObj, "metadata.labels.foo")).toBeUndefined();
    });

    test("should handle non-object input", () => {
      expect(getValueByPath(null, "name")).toBeUndefined();
      expect(getValueByPath(undefined, "name")).toBeUndefined();
      expect(getValueByPath("string", "name")).toBeUndefined();
    });
  });
});
