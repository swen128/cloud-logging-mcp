/**
 * Patterns for redacting sensitive information
 */
const SENSITIVE_PATTERNS = [
  // API keys and tokens
  /((['"]?)(?:key|api[_-]?key|token|secret|password|credential|auth)\2\s*[:=]\s*['"])[^'"]+(['"])/gi,
  // Credit card numbers
  /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  // Email addresses
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  // IP addresses
  /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
];

/**
 * Redacts sensitive information from text
 * @param text The text to redact
 * @returns Redacted text
 */
export function redactSensitiveInfo(text: string): string {
  if (!text) return text;

  let redactedText = text;
  for (const pattern of SENSITIVE_PATTERNS) {
    redactedText = redactedText.replace(pattern, (match) => {
      if (pattern.toString().includes("key|api")) {
        // For API keys, preserve first and last 4 chars
        return match.replace(/(['"])[^'"]+(['"])/g, (m, p1, p2) => {
          const value = m.substring(p1.length, m.length - p2.length);
          if (value.length <= 8) return `${p1}${"*".repeat(value.length)}${p2}`;
          return `${p1}${value.substring(0, 4)}${"*".repeat(value.length - 8)}${value.substring(value.length - 4)}${p2}`;
        });
      }
      return "*".repeat(match.length);
    });
  }

  return redactedText;
}
