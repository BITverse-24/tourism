import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { loadConfig } from "../app/config";
import { AttractionRecord, GetAttractionsByIdsInput, GetAttractionsByIdsResult, QueryAttractionsInput, QueryAttractionsResult } from "../../../ai/candidate-design";


/**
 * Hardcoded for now as requested.
 */
const DATASET_REVISION = "local-v1";

/**
 * SQLite database path.
 *
 * Example:
 * ATTRACTIONS_DB_PATH=/data/attractions.sqlite
 */
const DB_PATH = loadConfig(process.env).attractions_knowledgebase_sqlite_path

if (!DB_PATH) {
  throw new Error("attractions sqlite not provided");
}

const db = new Database(DB_PATH, {
  readonly: true,
});

/**
 * Array-like columns in the SQLite schema.
 *
 * Empty/null values become [].
 */
const ARRAY_COLUMNS = new Set([
  "alternate_names",
  "subtypes",
  "best_time_of_day",
  "best_months",
  "avoid_months",
  "best_for",
  "source",
]);

/**
 * Convert a pipe-separated SQLite value into an array.
 *
 * "Family|Photography|History"
 *   -> ["Family", "Photography", "History"]
 *
 * null / "" -> []
 */
function parsePipeSeparated(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (typeof value !== "string") {
    return [];
  }

  if (!value.trim()) {
    return [];
  }

  return value
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Convert a SQLite row into the API's AttractionRecord.
 *
 * We intentionally preserve all database columns because AttractionRecord
 * allows arbitrary additional properties.
 */
function rowToAttraction(row: Record<string, unknown>): AttractionRecord {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    if (ARRAY_COLUMNS.has(key)) {
      result[key] = parsePipeSeparated(value);
    } else {
      result[key] = value;
    }
  }

  return result as AttractionRecord;
}

function normalize(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .trim();
}

/**
 * Escape LIKE special characters.
 *
 * We don't want user input containing "%" or "_" to act as SQL wildcards.
 */
function escapeLike(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

/**
 * Score an attraction against a search query.
 *
 * Higher = more relevant.
 */
function scoreAttraction(
  attraction: AttractionRecord,
  queryTokens: string[],
): number {
  if (queryTokens.length === 0) {
    return 0;
  }

  const name = normalize(attraction.name ?? "");
  const alternateNames = (attraction.alternate_names as string[] | undefined)
    ?.map(normalize)
    .join(" ") ?? "";

  const attractionType = normalize(attraction.attraction_type ?? "");
  const subtypes = (attraction.subtypes as string[] | undefined)
    ?.map(normalize)
    .join(" ") ?? "";

  const description = normalize(attraction.description ?? "");
  const significance = normalize(
    typeof attraction.significance === "string"
      ? attraction.significance
      : "",
  );
  const locationArea = normalize(
    typeof attraction.location_area === "string"
      ? attraction.location_area
      : "",
  );
  const bestFor = (attraction.best_for as string[] | undefined)
    ?.map(normalize)
    .join(" ") ?? "";

  let score = 0;

  for (const token of queryTokens) {
    if (name.includes(token)) {
      score += 100;
    }

    if (alternateNames.includes(token)) {
      score += 70;
    }

    if (attractionType.includes(token)) {
      score += 50;
    }

    if (subtypes.includes(token)) {
      score += 40;
    }

    if (bestFor.includes(token)) {
      score += 30;
    }

    if (description.includes(token)) {
      score += 10;
    }

    if (significance.includes(token)) {
      score += 10;
    }

    if (locationArea.includes(token)) {
      score += 10;
    }
  }

  // Extra boost for exact name match.
  const normalizedQuery = queryTokens.join(" ");

  if (name === normalizedQuery) {
    score += 500;
  }

  return score;
}

function matchesBestFor(
  attraction: AttractionRecord,
  requested: string[],
): boolean {
  if (requested.length === 0) {
    return true;
  }

  const attractionBestFor = (
    (attraction.best_for as string[] | undefined) ?? []
  ).map(normalize);

  const requestedNormalized = requested.map(normalize);

  // OR semantics.
  return requestedNormalized.some((value) =>
    attractionBestFor.includes(value),
  );
}

function matchesAttractionType(
  attraction: AttractionRecord,
  requested: string[],
): boolean {
  if (requested.length === 0) {
    return true;
  }

  const type = normalize(attraction.attraction_type ?? "");

  return requested
    .map(normalize)
    .some((requestedType) => requestedType === type);
}

function tokenizeQuery(query: string): string[] {
  return normalize(query)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

/**
 * Builds the initial SQLite query.
 *
 * We let SQLite narrow the result set by city and query terms, then do
 * ranking/filtering in TypeScript. This avoids constructing complicated
 * dynamic SQL for all of the filtering semantics.
 */
function findCandidateRows(
  cityId: string,
  queryTokens: string[],
): Record<string, unknown>[] {
  if (queryTokens.length === 0) {
    const statement = db.prepare(`
      SELECT *
      FROM attraction
      WHERE city_id = ?
    `);

    return statement.all(cityId) as Record<string, unknown>[];
  }

  const searchableColumns = [
    "name",
    "alternate_names",
    "description",
    "significance",
    "location_area",
    "attraction_type",
    "subtypes",
    "best_for",
  ];

  /**
   * We use OR here only to get candidate rows.
   *
   * TypeScript subsequently requires every query token to actually occur
   * somewhere in the searchable record.
   */
  const tokenConditions: string[] = [];
  const params: unknown[] = [cityId];

  for (const token of queryTokens) {
    const escapedToken = `%${escapeLike(token)}%`;

    const columnConditions = searchableColumns.map(
      (column) => `${column} LIKE ? ESCAPE '\\' COLLATE NOCASE`,
    );

    tokenConditions.push(`(${columnConditions.join(" OR ")})`);

    for (let i = 0; i < searchableColumns.length; i++) {
      params.push(escapedToken);
    }
  }

  const statement = db.prepare(`
    SELECT *
    FROM attraction
    WHERE city_id = ?
      AND (${tokenConditions.join(" OR ")})
  `);

  return statement.all(...params) as Record<string, unknown>[];
}

function attractionContainsAllQueryTokens(
  attraction: AttractionRecord,
  tokens: string[],
): boolean {
  if (tokens.length === 0) {
    return true;
  }

  const searchableText = [
    attraction.name,
    attraction.alternate_names,
    attraction.description,
    attraction.significance,
    attraction.location_area,
    attraction.attraction_type,
    attraction.subtypes,
    attraction.best_for,
  ]
    .flatMap((value) => {
      if (Array.isArray(value)) {
        return value;
      }

      if (typeof value === "string") {
        return [value];
      }

      return [];
    })
    .map(normalize)
    .join(" ");

  return tokens.every((token) => searchableText.includes(token));
}

function clampPageSize(pageSize: number): number {
  if (!Number.isFinite(pageSize)) {
    return 20;
  }

  return Math.min(Math.max(Math.floor(pageSize), 1), 100);
}

export async function queryAttractions(
  input: QueryAttractionsInput,
): Promise<QueryAttractionsResult> {
  const pageSize = clampPageSize(input.page_size);

  const excludedIds = new Set(
    (input.excluded_attraction_ids ?? []).map((id) => id.trim()),
  );

  const queryTokens = tokenizeQuery(input.query);

  const rows = findCandidateRows(
    input.city_id,
    queryTokens,
  );

  const attractions = rows
    .map(rowToAttraction)
    .filter((attraction) => {
      // Exclusions always win.
      if (excludedIds.has(attraction.attraction_id)) {
        return false;
      }

      if (!matchesBestFor(attraction, input.best_for ?? [])) {
        return false;
      }

      if (
        !matchesAttractionType(
          attraction,
          input.attraction_types ?? [],
        )
      ) {
        return false;
      }

      if (
        !attractionContainsAllQueryTokens(
          attraction,
          queryTokens,
        )
      ) {
        return false;
      }

      return true;
    })
    .map((attraction) => ({
      attraction,
      score: scoreAttraction(attraction, queryTokens),
    }))
    .sort((a, b) => {
      // Relevance first.
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      // Stable deterministic fallback.
      return a.attraction.name.localeCompare(
        b.attraction.name,
      );
    })
    .slice(0, pageSize)
    .map(({ attraction }) => attraction);

  return {
    attractions,
    dataset_revision: DATASET_REVISION,
    query_id: randomUUID(),
    next_cursor: null,
  };
}

export async function getAttractionsByIds(
  input: GetAttractionsByIdsInput,
): Promise<GetAttractionsByIdsResult> {
  const pageSize = clampPageSize(input.page_size);

  const excludedIds = new Set(
    (input.excluded_attraction_ids ?? []).map((id) => id.trim()),
  );

  const requestedIds = input.attraction_ids
    .map((id) => id.trim())
    .filter(Boolean)
    .filter((id) => !excludedIds.has(id));

  if (requestedIds.length === 0) {
    return {
      attractions: [],
      dataset_revision: DATASET_REVISION,
    };
  }

  /**
   * Remove duplicate IDs while preserving caller order.
   */
  const uniqueIds = [...new Set(requestedIds)].slice(0, pageSize);

  const placeholders = uniqueIds.map(() => "?").join(", ");

  const statement = db.prepare(`
    SELECT *
    FROM attraction
    WHERE city_id = ?
      AND attraction_id IN (${placeholders})
  `);

  const rows = statement.all(
    input.city_id,
    ...uniqueIds,
  ) as Record<string, unknown>[];

  const attractionsById = new Map<string, AttractionRecord>(
    rows.map((row) => {
      const attraction = rowToAttraction(row);
      return [attraction.attraction_id, attraction];
    }),
  );

  /**
   * Return records in the same order as attraction_ids.
   */
  const attractions: AttractionRecord[] = [];

  for (const id of uniqueIds) {
    const attraction = attractionsById.get(id);

    if (attraction) {
      attractions.push(attraction);
    }
  }

  return {
    attractions,
    dataset_revision: DATASET_REVISION,
  };
}
