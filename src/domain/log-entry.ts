import { redactSensitiveInfo } from "../util";
import type { LogSeverity, RawLogEntry } from "./api";
import type { LogId } from "./log-id";

/**
 * Log entry summary with essential information
 */
type LogSummary = {
  insertId: LogId;
  timestamp: string;
  severity: LogSeverity;
  summary: string;
};

export function summarize(entry: RawLogEntry, summaryFields?: string[]): LogSummary {
  const summary = extractLogSummaryText(entry, summaryFields);

  return {
    insertId: entry.insertId,
    timestamp: entry.timestamp,
    severity: entry.severity,
    summary,
  };
}

const extractLogSummaryText = (entry: RawLogEntry, summaryFields?: string[]): string => {
  const useFields = Array.isArray(summaryFields) && summaryFields.length > 0;

  return (useFields && summaryFields !== undefined)
    ? ((): string => {
        const summaryFromFields = processSummaryFields(summaryFields, entry);
        return summaryFromFields === "" ? extractSummaryWithoutFields(entry) : summaryFromFields;
      })()
    : extractSummaryWithoutFields(entry);
};

const processSummaryFields = (fields: string[], entry: RawLogEntry): string => {
  const parts: string[] = [];
  
  for (const field of fields) {
    const value = viewPath(field, entry);
    if (value !== null && value !== undefined) {
      parts.push(`${field}: ${String(value)}`);
    }
  }
  
  return parts.length === 0 ? "" : redactSensitiveInfo(parts.join(", "));
};

const viewPath = (pathStr: string, obj: unknown): unknown => {
  if (typeof obj !== 'object' || obj === null) {
    return undefined;
  }
  
  const parts = pathStr.split(".");
  const getProperty = (target: object, key: string): unknown => {
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    return descriptor?.value;
  };
  
  const result = parts.reduce<unknown>((current, part) => 
    (typeof current === 'object' && current !== null && part in current)
      ? getProperty(current, part)
      : undefined
  , obj);
  
  return result;
};

const extractSummaryWithoutFields = (entry: RawLogEntry): string => {
  const rawSummary = 
    getTextPayload(entry) ??
    getJsonMessage(entry) ??
    getProtoMessage(entry) ??
    getNestedJsonMessage(entry) ??
    stringifyProtoPayload(entry) ??
    stringifyJsonPayload(entry) ??
    "";
  
  return truncate(redactSensitiveInfo(rawSummary));
};

const findMessage = (obj: unknown): string | undefined => {
  if (typeof obj !== 'object' || obj === null) return undefined;

  if ('message' in obj) {
    const descriptor = Object.getOwnPropertyDescriptor(obj, 'message');
    return (descriptor !== undefined && 'value' in descriptor)
      ? String(descriptor.value)
      : undefined;
  }

  for (const value of Object.values(obj)) {
    const found = findMessage(value);
    if (found !== undefined) {
      return found;
    }
  }
  
  return undefined;
};

const flatMap =
  <T, U>(f: (arg: T) => U) =>
  (maybe: T | undefined): U | undefined =>
    maybe === undefined ? undefined : f(maybe);

const getTextPayload = (entry: RawLogEntry): string | undefined => {
  const val = entry.textPayload;
  return typeof val === "string" ? val : undefined;
};

const getJsonMessage = (entry: RawLogEntry): string | undefined => {
  const payload = entry.jsonPayload;
  return (typeof payload === 'object' && payload !== null && 'message' in payload)
    ? (typeof payload.message === "string" ? payload.message : undefined)
    : undefined;
};

const getProtoMessage = (entry: RawLogEntry): string | undefined => {
  const payload = entry.protoPayload;
  return (typeof payload === 'object' && payload !== null && 'message' in payload)
    ? (typeof payload.message === "string" ? payload.message : undefined)
    : undefined;
};

const getNestedJsonMessage = (entry: RawLogEntry): string | undefined => {
  return findMessage(entry.jsonPayload);
};

const truncate = (str: string): string => (str.length > 300 ? `${str.substring(0, 300)}...` : str);

const stringifyJsonPayload = (entry: RawLogEntry): string | undefined => {
  return flatMap(JSON.stringify)(entry.jsonPayload);
};

const stringifyProtoPayload = (entry: RawLogEntry): string | undefined => {
  return flatMap(JSON.stringify)(entry.protoPayload);
};