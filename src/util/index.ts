export { redactSensitiveInfo } from "./redact";

/**
 * Extracts a value from an object using a dot-notation path
 * @param obj The object to extract from
 * @param path The path in dot notation (e.g., "labels.service")
 * @returns The extracted value or undefined if not found
 */
export function getValueByPath(obj: unknown, path: string): unknown {
  if (obj === null || obj === undefined || typeof obj !== "object") {
    return undefined;
  }
  
  const parts = path.split(".");
  const current = parts.reduce<unknown>((acc, part) => {
    if (acc !== null && acc !== undefined && typeof acc === "object" && part in acc) {
      // Use Object.prototype to access the property
      return Object.prototype.hasOwnProperty.call(acc, part) 
        ? Object.getOwnPropertyDescriptor(acc, part)?.value 
        : undefined;
    }
    return undefined;
  }, obj);

  return current;
}
