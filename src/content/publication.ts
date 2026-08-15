import type { PublicationFields } from "./schema";

const PUBLIC_CLASSIFICATIONS = new Set<PublicationFields["classification"]>([
  "A",
  "B",
]);

const INTERNAL_SOURCE_KEYS = new Set(["sourceReferenceInternal"]);

export type PublicRecord<T> = T extends readonly (infer Item)[]
  ? PublicRecord<Item>[]
  : T extends object
    ? {
        [Key in keyof T as Key extends "sourceReferenceInternal"
          ? never
          : Key]: PublicRecord<T[Key]>;
      }
    : T;

export interface DevelopmentPlaceholderFinding {
  id?: string;
  path: string;
}

export function isDevelopmentPlaceholder(
  value: unknown,
): value is Record<string, unknown> & { developmentPlaceholder: true } {
  return (
    typeof value === "object" &&
    value !== null &&
    "developmentPlaceholder" in value &&
    value.developmentPlaceholder === true
  );
}

/**
 * Publication is deny-by-default: approval and an eligible classification are
 * both required, while development material is always excluded.
 */
export function isPubliclyEligible(record: PublicationFields): boolean {
  return (
    PUBLIC_CLASSIFICATIONS.has(record.classification) &&
    record.publicApproved === true &&
    record.developmentPlaceholder === false
  );
}

export function stripInternalSourceReferences<T>(value: T): PublicRecord<T> {
  if (Array.isArray(value)) {
    return value.map((item) =>
      stripInternalSourceReferences(item),
    ) as PublicRecord<T>;
  }

  if (typeof value === "object" && value !== null) {
    const publicEntries = Object.entries(value).flatMap(([key, childValue]) => {
      if (INTERNAL_SOURCE_KEYS.has(key)) {
        return [];
      }

      return [[key, stripInternalSourceReferences(childValue)] as const];
    });

    return Object.fromEntries(publicEntries) as PublicRecord<T>;
  }

  return value as PublicRecord<T>;
}

export function toPublicRecord<T extends PublicationFields>(
  record: T,
): PublicRecord<T> | null {
  if (!isPubliclyEligible(record)) {
    return null;
  }

  return stripInternalSourceReferences(record);
}

export function filterPublicRecords<T extends PublicationFields>(
  records: readonly T[],
): PublicRecord<T>[] {
  return records.flatMap((record) => {
    const publicRecord = toPublicRecord(record);
    return publicRecord === null ? [] : [publicRecord];
  });
}

export function findDevelopmentPlaceholders(
  value: unknown,
): DevelopmentPlaceholderFinding[] {
  const findings: DevelopmentPlaceholderFinding[] = [];

  function visit(candidate: unknown, path: string): void {
    if (Array.isArray(candidate)) {
      candidate.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }

    if (typeof candidate !== "object" || candidate === null) {
      return;
    }

    const record = candidate as Record<string, unknown>;

    if (isDevelopmentPlaceholder(record)) {
      findings.push({
        ...(typeof record.id === "string" ? { id: record.id } : {}),
        path,
      });
    }

    Object.entries(record).forEach(([key, childValue]) => {
      visit(childValue, path === "$" ? `$.${key}` : `${path}.${key}`);
    });
  }

  visit(value, "$");
  return findings;
}

export function assertNoDevelopmentPlaceholders(value: unknown): void {
  const findings = findDevelopmentPlaceholders(value);

  if (findings.length === 0) {
    return;
  }

  const locations = findings
    .map((finding) =>
      finding.id ? `${finding.id} at ${finding.path}` : finding.path,
    )
    .join(", ");

  throw new Error(`Development placeholders detected: ${locations}`);
}
