import type { PublicationFields } from "./schema";

const PUBLIC_CLASSIFICATIONS = new Set<PublicationFields["classification"]>([
  "A",
  "B",
]);

const INTERNAL_SOURCE_KEYS = new Set(["sourceReferenceInternal"]);
const PUBLICATION_CONTROL_KEYS = new Set(["classification", "publicApproved"]);
const OMIT_DENIED_NESTED_VALUE = Symbol("omit-denied-nested-value");

type PublicationEligibilityFields = Pick<
  PublicationFields,
  "classification" | "publicApproved"
> &
  Partial<Pick<PublicationFields, "developmentPlaceholder">>;

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
export function isPubliclyEligible(
  record: PublicationEligibilityFields,
): boolean {
  return (
    PUBLIC_CLASSIFICATIONS.has(record.classification) &&
    record.publicApproved === true &&
    record.developmentPlaceholder !== true
  );
}

function publicationEligibilityForNestedValue(
  value: Record<string, unknown>,
): boolean | null {
  if (value.developmentPlaceholder === true) {
    return false;
  }

  const isPublicationGoverned = [...PUBLICATION_CONTROL_KEYS].some((key) =>
    Object.hasOwn(value, key),
  );

  if (!isPublicationGoverned) {
    return null;
  }

  const { classification, publicApproved, developmentPlaceholder } = value;

  if (
    (classification !== "A" &&
      classification !== "B" &&
      classification !== "C" &&
      classification !== "D") ||
    typeof publicApproved !== "boolean" ||
    (developmentPlaceholder !== undefined &&
      typeof developmentPlaceholder !== "boolean")
  ) {
    return false;
  }

  return isPubliclyEligible({
    classification,
    publicApproved,
    ...(developmentPlaceholder === undefined ? {} : { developmentPlaceholder }),
  });
}

function filterDeniedNestedPublicationValues(
  value: unknown,
  isRoot = false,
): unknown | typeof OMIT_DENIED_NESTED_VALUE {
  if (Array.isArray(value)) {
    const filteredItems = value.flatMap((item) => {
      const filtered = filterDeniedNestedPublicationValues(item);
      return filtered === OMIT_DENIED_NESTED_VALUE ? [] : [filtered];
    });

    return value.length > 0 && filteredItems.length === 0
      ? OMIT_DENIED_NESTED_VALUE
      : filteredItems;
  }

  if (typeof value !== "object" || value === null) {
    return value;
  }

  const record = value as Record<string, unknown>;

  if (!isRoot && publicationEligibilityForNestedValue(record) === false) {
    return OMIT_DENIED_NESTED_VALUE;
  }

  const publicEntries = Object.entries(record).flatMap(([key, childValue]) => {
    const filtered = filterDeniedNestedPublicationValues(childValue);
    return filtered === OMIT_DENIED_NESTED_VALUE
      ? []
      : [[key, filtered] as const];
  });

  return Object.fromEntries(publicEntries);
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

  const nestedFilteredRecord = filterDeniedNestedPublicationValues(
    record,
    true,
  );

  if (nestedFilteredRecord === OMIT_DENIED_NESTED_VALUE) {
    return null;
  }

  return stripInternalSourceReferences(nestedFilteredRecord) as PublicRecord<T>;
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
