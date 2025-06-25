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
  return text === '' 
    ? text
    : SENSITIVE_PATTERNS.reduce((currentText, pattern) => {
        return currentText.replace(pattern, (match) => {
          return pattern.toString().includes("key|api")
            ? match.replace(/(['"'])[^'"']+(['"'])/g, (m: string, p1: string, p2: string) => {
                const value = m.substring(p1.length, m.length - p2.length);
                return value.length <= 8
                  ? `${p1}${"*".repeat(value.length)}${p2}`
                  : `${p1}${value.substring(0, 4)}${"*".repeat(value.length - 8)}${value.substring(value.length - 4)}${p2}`;
              })
            : "*".repeat(match.length);
        });
      }, text);
}