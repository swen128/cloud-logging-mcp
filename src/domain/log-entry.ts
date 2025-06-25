import * as R from "ramda";
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

// TODO: refactor
const extractLogSummaryText = (entry: RawLogEntry, summaryFields?: string[]): string => {
  const useFields = R.both(R.is(Array), R.complement(R.isEmpty))(summaryFields);

  if (useFields && summaryFields !== undefined) {
    const summaryFromFields = processSummaryFields(summaryFields)(entry);

    return R.unless(
      R.complement(R.isEmpty),
      () => extractSummaryWithoutFields(entry),
      summaryFromFields,
    );
  }
  return extractSummaryWithoutFields(entry);
};

// TODO: refactor
const processSummaryFields = R.curry((fields: string[], entry: RawLogEntry): string => {
  const createPart = (field: string): string | null => {
    const value = viewPath(field, entry);
    return R.isNil(value) ? null : `${field}: ${String(value)}`;
  };

  return R.pipe(
    R.map(createPart),
    R.reject(R.isNil),
    (parts) => (R.isEmpty(parts) ? "" : redactSensitiveInfo(R.join(", ", parts))), // Ensure string return
  )(fields);
});

const viewPath = (pathStr: string, obj: unknown): unknown => {
  if (typeof obj !== 'object' || obj === null) {
    return undefined;
  }
  return R.path(R.split(".", pathStr), obj);
};

const extractSummaryWithoutFields = (entry: RawLogEntry): string =>
  truncate(
    getTextPayload(entry) ??
      getJsonMessage(entry) ??
      getProtoMessage(entry) ??
      getNestedJsonMessage(entry) ??
      stringifyProtoPayload(entry) ??
      stringifyJsonPayload(entry) ??
      "",
  );

// TODO: refactor
const findMessage = (obj: unknown): string | undefined => {
  if (!R.is(Object, obj) || R.isNil(obj)) return undefined;

  if (typeof obj === 'object' && obj !== null && 'message' in obj) {
    const descriptor = Object.getOwnPropertyDescriptor(obj, 'message');
    if (descriptor !== undefined && 'value' in descriptor) {
      return String(descriptor.value);
    }
    return undefined;
  }

  if (typeof obj === 'object' && obj !== null) {
    return R.reduce(
      (acc: string | undefined, value) => acc ?? findMessage(value),
      undefined,
      R.values(obj),
    );
  }
  
  return undefined;
};

const flatMap =
  <T, U>(f: (arg: T) => U) =>
  (maybe: T | undefined): U | undefined =>
    maybe === undefined ? undefined : f(maybe);

const getTextPayload = R.pipe(R.prop("textPayload"), (val) =>
  typeof val === "string" ? val : undefined,
);

const getJsonMessage = R.pipe(R.path(["jsonPayload", "message"]), (val) =>
  typeof val === "string" ? val : undefined,
);

const getProtoMessage = R.pipe(R.path(["protoPayload", "message"]), (val) =>
  typeof val === "string" ? val : undefined,
);

const getNestedJsonMessage = R.pipe(R.prop("jsonPayload"), findMessage);

const truncate = (str: string): string => (str.length > 300 ? `${str.substring(0, 300)}...` : str);

const stringifyJsonPayload = R.pipe(R.prop("jsonPayload"), flatMap(JSON.stringify));

const stringifyProtoPayload = R.pipe(R.prop("protoPayload"), flatMap(JSON.stringify));
