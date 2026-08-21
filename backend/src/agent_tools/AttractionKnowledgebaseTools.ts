import Database from "better-sqlite3";
import { loadConfig } from "../app/config";
import { AttractionRecord, GetAttractionsByIdsInput, GetAttractionsByIdsResult, QueryAttractionsInput, QueryAttractionsResult } from "../../../ai/candidate-design";
import { logger } from "../modules/logger";

/**
 * These are all JSON-array columns in the SQLite schema.
 *
 * When rows are read from SQLite, they are converted from JSON strings
 * into normal JavaScript arrays.
 */
const JSON_ARRAY_COLUMNS = new Set([
    "alternate_names",
    "subtypes",
    "significance",
    "best_time_of_day",
    "best_months",
    "avoid_months",
    "best_for",
    "source",
]);

let database: Database.Database | undefined;

function getDatabase(): Database.Database {
    if (database) {
        return database;
    }

    const dbPath = loadConfig(process.env).attractions_knowledgebase_sqlite_path

    if (!dbPath) {
        throw new Error(
            "Missing sqlite attractions db environment variable. " +
                "Set it to the path of your SQLite database.",
        );
    }

    database = new Database(dbPath, {
        readonly: true,
        fileMustExist: true,
    });

    return database;
}

function parseJsonArray(value: unknown): unknown {
    if (value === null || value === undefined) {
        return value;
    }

    if (typeof value !== "string") {
        return value;
    }

    try {
        const parsed: unknown = JSON.parse(value);

        // The schema guarantees these should be arrays, but this makes the
        // application layer defensive against malformed database contents.
        return Array.isArray(parsed) ? parsed : value;
    } catch {
        return value;
    }
}

function normalizeAttractionRow(
    row: Record<string, unknown>,
): AttractionRecord {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(row)) {
        result[key] = JSON_ARRAY_COLUMNS.has(key)
            ? parseJsonArray(value)
            : value;
    }

    return result as AttractionRecord;
}

function normalizeStringArray(
    values: string[] | undefined,
): string[] {
    if (!values || values.length === 0) {
        return [];
    }

    return [
        ...new Set(
            values
                .map((value) => value.trim())
                .filter((value) => value.length > 0),
        ),
    ];
}

function createQueryId(): string {
    return `query_${crypto.randomUUID().replace(/-/g, "")}`;
}

/**
 * Escapes LIKE wildcards so that user input is treated as ordinary text.
 *
 * We use "\" as the SQLite LIKE escape character.
 */
function escapeLike(value: string): string {
    return value
        .replace(/\\/g, "\\\\")
        .replace(/%/g, "\\%")
        .replace(/_/g, "\\_");
}

/**
 * Searches attractions within a city.
 *
 * Matching semantics:
 * - query:
 *     case-insensitive substring match against:
 *     name, alternate_names, description, location_area, attraction_type
 *
 * - best_for:
 *     OR semantics. An attraction matches when at least one requested value
 *     exists in its JSON best_for array.
 *
 * - attraction_types:
 *     OR semantics. An attraction matches when at least one requested value
 *     matches either attraction_type or an item in subtypes.
 */
export async function queryAttractions(
    input: QueryAttractionsInput,
): Promise<QueryAttractionsResult> {
    logger.debug('agent 2 is using the queryAttractions tool call', { req: input })
    const db = getDatabase();

    const cityId = input.city_id.trim();

    if (!cityId) {
        throw new Error("input.city_id must not be empty");
    }

    const query = input.query.trim();
    const bestFor = normalizeStringArray(input.best_for);
    const attractionTypes = normalizeStringArray(input.attraction_types);

    const where: string[] = ["a.city_id = ?"];
    const params: unknown[] = [cityId];

    if (query.length > 0) {
        const likeQuery = `%${escapeLike(query)}%`;

        where.push(`
(
a.name LIKE ? ESCAPE '\\' COLLATE NOCASE
OR a.description LIKE ? ESCAPE '\\' COLLATE NOCASE
OR a.location_area LIKE ? ESCAPE '\\' COLLATE NOCASE
OR a.attraction_type LIKE ? ESCAPE '\\' COLLATE NOCASE
OR EXISTS (
SELECT 1
FROM json_each(a.alternate_names)
WHERE json_each.value LIKE ? ESCAPE '\\' COLLATE NOCASE
)
)
`);

        params.push(
            likeQuery,
            likeQuery,
            likeQuery,
            likeQuery,
            likeQuery,
        );
    }

    if (bestFor.length > 0) {
        const placeholders = bestFor.map(() => "?").join(", ");

        where.push(`
EXISTS (
SELECT 1
FROM json_each(a.best_for)
WHERE json_each.value IN (${placeholders})
)
`);

        params.push(...bestFor);
    }

    if (attractionTypes.length > 0) {
        const placeholders = attractionTypes.map(() => "?").join(", ");

        where.push(`
(
a.attraction_type IN (${placeholders})
OR EXISTS (
SELECT 1
FROM json_each(a.subtypes)
WHERE json_each.value IN (${placeholders})
)
)
`);

        // The placeholder list appears twice.
        params.push(...attractionTypes, ...attractionTypes);
    }

    const sql = `
SELECT a.*
FROM attraction AS a
WHERE ${where.join("\nAND ")}
ORDER BY a.name COLLATE NOCASE ASC, a.attraction_id ASC
`;

    const rows = db
        .prepare(sql)
        .all(...params) as Record<string, unknown>[];

    logger.debug('sending agent 2 result of queryAttractions res')

    return {
        attractions: rows.map(normalizeAttractionRow),
        query_id: createQueryId(),
        next_cursor: null,
    };
}

/**
 * Fetches attractions by ID within a specific city.
 *
 * The returned attractions preserve the order of input.attraction_ids.
 * IDs that do not exist, or belong to another city, are omitted.
 */
export async function getAttractionsByIds(
    input: GetAttractionsByIdsInput,
): Promise<GetAttractionsByIdsResult> {
    logger.debug('agent 2 is using the getAttractionsByIds tool call', { req: input })
    const db = getDatabase();

    const cityId = input.city_id.trim();

    if (!cityId) {
        throw new Error("input.city_id must not be empty");
    }

    const attractionIds = normalizeStringArray(input.attraction_ids);

    if (attractionIds.length === 0) {
        return {
            attractions: [],
        };
    }

    /*
     * SQLite has a maximum number of bound parameters. Chunking keeps this
     * reliable even if a caller supplies a very large list of IDs.
     *
     * The exact SQLite limit varies by build, so 900 leaves room below the
     * common 999-variable limit.
     */
    const CHUNK_SIZE = 900;

    const attractionsById = new Map<string, AttractionRecord>();

    for (let start = 0; start < attractionIds.length; start += CHUNK_SIZE) {
        const chunk = attractionIds.slice(start, start + CHUNK_SIZE);
        const placeholders = chunk.map(() => "?").join(", ");

        const sql = `
SELECT a.*
FROM attraction AS a
WHERE a.city_id = ?
AND a.attraction_id IN (${placeholders})
`;

        const rows = db
            .prepare(sql)
            .all(cityId, ...chunk) as Record<string, unknown>[];

        for (const row of rows) {
            const attraction = normalizeAttractionRow(row);

            attractionsById.set(
                attraction.attraction_id,
                attraction,
            );
        }
    }

    logger.debug('sending agent 2 result of getAttractionsById res')
    return {
        attractions: attractionIds
            .map((id) => attractionsById.get(id))
            .filter(
                (attraction): attraction is AttractionRecord =>
                    attraction !== undefined,
            ),
    };
}
