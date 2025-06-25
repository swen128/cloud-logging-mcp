export { redactSensitiveInfo } from "./redact";

/**
 * Extracts a value from an object using a dot-notation path
 * @param obj The object to extract from
 * @param path The path in dot notation (e.g., "labels.service")
 * @returns The extracted value or undefined if not found
 */
export function getValueByPath(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== "object") {
    return undefined;
  }
  
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}
