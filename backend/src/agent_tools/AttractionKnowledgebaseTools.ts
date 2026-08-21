import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { loadConfig } from "../app/config";
import { AttractionRecord, GetAttractionsByIdsInput, GetAttractionsByIdsResult, QueryAttractionsInput, QueryAttractionsResult } from "../../../ai/candidate-design";


// -----------------------------------------------------------------------------
// Database
// -----------------------------------------------------------------------------

const DB_PATH = loadConfig(process.env).attractions_knowledgebase_sqlite_path

if (!DB_PATH) {
    throw new Error(
        "Missing required environment variable: ATTRACTIONS_DB_PATH"
    );
}

/**
 * Read-only connection.
 *
 * fileMustExist prevents accidentally creating an empty SQLite database if
 * ATTRACTIONS_DB_PATH is misspelled.
 */
const db = new Database(DB_PATH, {
    readonly: true,
    fileMustExist: true,
});

// SQLite can otherwise have an unnecessarily low busy timeout in some setups.
db.pragma("busy_timeout = 5000");

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

const MAX_QUERY_RESULTS = 100;

/**
 * These DB columns contain pipe-separated arrays.
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
 * Split a pipe-separated DB value.
 *
 * Empty/null values become [].
 */
function parsePipeArray(value: unknown): string[] {
    if (value === null || value === undefined) {
        return [];
    }

    if (typeof value !== "string") {
        return [String(value)];
    }

    return value
        .split("|")
        .map((x) => x.trim())
        .filter(Boolean);
}

/**
 * Convert a raw SQLite row into the API's AttractionRecord.
 *
 * All DB columns are retained, but pipe-separated columns are converted
 * into string arrays.
 */
function rowToAttraction(row: Record<string, unknown>): AttractionRecord {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(row)) {
        if (ARRAY_COLUMNS.has(key)) {
            result[key] = parsePipeArray(value);
        } else {
            result[key] = value;
        }
    }

    return result as AttractionRecord;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function assertNonEmptyString(value: unknown, field: string): asserts value is string {
    if (typeof value !== "string" || value.trim() === "") {
        throw new TypeError(`${field} must be a non-empty string`);
    }
}

function assertStringArray(value: unknown, field: string): asserts value is string[] {
    if (!Array.isArray(value)) {
        throw new TypeError(`${field} must be an array`);
    }

    for (const item of value) {
        if (typeof item !== "string") {
            throw new TypeError(`${field} must contain only strings`);
        }
    }
}

/**
 * Escape SQLite LIKE special characters.
 */
function escapeLike(value: string): string {
    return value
        .replace(/\\/g, "\\\\")
        .replace(/%/g, "\\%")
        .replace(/_/g, "\\_");
}

/**
 * Produces:
 *
 *   ('|' || column || '|') LIKE '%|value|%'
 *
 * which allows exact token matching in a pipe-separated field.
 *
 * Example:
 *   best_for = "Family|Photography|History"
 *
 * searching for "Photography" matches, while "Photo" doesn't.
 */
function pipeTokenCondition(
    column: string,
    value: string
): { sql: string; params: string[] } {
    return {
        sql: `(
('|' || LOWER(COALESCE(${column}, '')) || '|')
LIKE ?
ESCAPE '\\'
)`,
        params: [`%|${escapeLike(value.toLowerCase())}|%`],
    };
}

/**
 * Build an OR expression for a set of exact tokens.
 */
function pipeTokenAnyCondition(
    column: string,
    values: string[]
): { sql: string; params: string[] } | null {
    if (values.length === 0) {
        return null;
    }

    const conditions: string[] = [];
    const params: string[] = [];

    for (const value of values) {
        const condition = pipeTokenCondition(column, value);
        conditions.push(condition.sql);
        params.push(...condition.params);
    }

    return {
        sql: `(${conditions.join(" OR ")})`,
        params,
    };
}

// -----------------------------------------------------------------------------
// queryAttractions
// -----------------------------------------------------------------------------

export async function queryAttractions(
    input: QueryAttractionsInput
): Promise<QueryAttractionsResult> {
    assertNonEmptyString(input.city_id, "city_id");
    assertStringArray(input.best_for, "best_for");
    assertStringArray(input.attraction_types, "attraction_types");

    if (typeof input.query !== "string") {
        throw new TypeError("query must be a string");
    }

    const cityId = input.city_id.trim();
    const query = input.query.trim();

    const bestFor = [...new Set(
        input.best_for
            .map((x) => x.trim())
            .filter(Boolean)
    )];

    const attractionTypes = [...new Set(
        input.attraction_types
            .map((x) => x.trim())
            .filter(Boolean)
    )];

    const where: string[] = ["city_id = ?"];
    const params: unknown[] = [cityId];

    // ---------------------------------------------------------------------------
    // best_for filter
    // ---------------------------------------------------------------------------

    const bestForCondition = pipeTokenAnyCondition("best_for", bestFor);

    if (bestForCondition) {
        where.push(bestForCondition.sql);
        params.push(...bestForCondition.params);
    }

    // ---------------------------------------------------------------------------
    // attraction_types filter
    // ---------------------------------------------------------------------------

    if (attractionTypes.length > 0) {
        const placeholders = attractionTypes.map(() => "?").join(", ");

        where.push(`
LOWER(attraction_type) IN (
${placeholders}
)
`);

        params.push(...attractionTypes.map((x) => x.toLowerCase()));
    }

    // ---------------------------------------------------------------------------
    // Free-text search
    // ---------------------------------------------------------------------------

    let scoreSql = "0";

    if (query.length > 0) {
        const search = `%${escapeLike(query.toLowerCase())}%`;

        const textColumns = [
            "name",
            "alternate_names",
            "description",
            "significance",
            "location_area",
            "subtypes",
            "attraction_type",
        ];

        const textConditions = textColumns.map(
            (column) => `
LOWER(COALESCE(${column}, '')) LIKE ?
ESCAPE '\\'
`
        );

        where.push(`
(${textConditions.join(" OR ")})
`);

        for (const _ of textColumns) {
            params.push(search);
        }

        // Simple deterministic relevance scoring.
        //
        // Exact-ish name matches get highest weight, followed by alternate names,
        // then the other searchable fields.
        scoreSql = `
(
CASE
WHEN LOWER(name) = ? THEN 100
WHEN LOWER(name) LIKE ? ESCAPE '\\' THEN 80
WHEN LOWER(COALESCE(alternate_names, '')) LIKE ? ESCAPE '\\' THEN 60
WHEN LOWER(COALESCE(attraction_type, '')) LIKE ? ESCAPE '\\' THEN 40
WHEN LOWER(COALESCE(subtypes, '')) LIKE ? ESCAPE '\\' THEN 30
WHEN LOWER(COALESCE(significance, '')) LIKE ? ESCAPE '\\' THEN 20
WHEN LOWER(COALESCE(description, '')) LIKE ? ESCAPE '\\' THEN 10
WHEN LOWER(COALESCE(location_area, '')) LIKE ? ESCAPE '\\' THEN 5
ELSE 0
END
)
`;

        // These parameters belong to scoreSql and must appear before the WHERE
        // parameters when the complete SQL is assembled below.
    }

    let sql: string;

    if (query.length > 0) {
        const q = query.toLowerCase();
        const exact = q;
        const contains = `%${escapeLike(q)}%`;

        const scoreParams = [
            exact,
            contains,
            contains,
            contains,
            contains,
            contains,
            contains,
            contains,
        ];

        sql = `
SELECT
attraction.*,
${scoreSql} AS _search_score
FROM attraction
WHERE ${where.join(" AND ")}
ORDER BY
_search_score DESC,
attraction.name COLLATE NOCASE ASC,
attraction.attraction_id ASC
LIMIT ${MAX_QUERY_RESULTS}
`;

        const rows = db
            .prepare(sql)
            .all(...scoreParams, ...params) as Record<string, unknown>[];

        return {
            attractions: rows.map((row) => {
                // Don't expose our internal ranking column.
                const { _search_score: _, ...attractionRow } = row;
                return rowToAttraction(attractionRow);
            }),
            query_id: randomUUID(),
            next_cursor: null,
        };
    }

    // No free-text query: deterministic ordering.
    sql = `
SELECT attraction.*
FROM attraction
WHERE ${where.join(" AND ")}
ORDER BY
attraction.name COLLATE NOCASE ASC,
attraction.attraction_id ASC
LIMIT ${MAX_QUERY_RESULTS}
`;

    const rows = db
        .prepare(sql)
        .all(...params) as Record<string, unknown>[];

    return {
        attractions: rows.map(rowToAttraction),
        query_id: randomUUID(),
        next_cursor: null,
    };
}

// -----------------------------------------------------------------------------
// getAttractionsByIds
// -----------------------------------------------------------------------------

export async function getAttractionsByIds(
    input: GetAttractionsByIdsInput
): Promise<GetAttractionsByIdsResult> {
    assertNonEmptyString(input.city_id, "city_id");
    assertStringArray(input.attraction_ids, "attraction_ids");

    const cityId = input.city_id.trim();

    // Remove duplicates while retaining caller's order.
    const attractionIds = [...new Set(
        input.attraction_ids
            .map((x) => x.trim())
            .filter(Boolean)
    )];

    if (attractionIds.length === 0) {
        return {
            attractions: [],
        };
    }

    const placeholders = attractionIds.map(() => "?").join(", ");

    const sql = `
SELECT attraction.*
FROM attraction
WHERE city_id = ?
AND attraction_id IN (${placeholders})
`;

    const rows = db
        .prepare(sql)
        .all(cityId, ...attractionIds) as Record<string, unknown>[];

    /*
     * SQL IN does not guarantee input order.
     *
     * Return results in the same order as attraction_ids, which is generally
     * much more useful to API consumers.
     */
    const byId = new Map<string, AttractionRecord>();

    for (const row of rows) {
        const attraction = rowToAttraction(row);
        byId.set(attraction.attraction_id, attraction);
    }

    const attractions: AttractionRecord[] = [];

    for (const id of attractionIds) {
        const attraction = byId.get(id);

        if (attraction) {
            attractions.push(attraction);
        }
    }

    return {
        attractions,
    };
}
