import { promises as fs } from "node:fs";
import { parse } from "csv-parse/sync";
import { CityRecord, DestinationScope, GetCityInput, GetCityResult, SearchCitiesInput, SearchCitiesResult } from "../../../ai/candidate-design";
import { loadConfig } from "../app/config";


const DATASET_REVISION = "1";

const REQUIRED_HEADERS = [
    "city_id",
    "city_name",
    "state",
    "region",
    "latitude",
    "longitude",
    "elevation_m",
    "climate_type",
    "destination_type",
    "tourism_popularity",
    "primary_airport",
    "primary_airport_iata",
    "primary_railway_station",
    "primary_railway_station_code",
    "recommended_days_min",
    "recommended_days_max",
] as const;

const NUMERIC_FIELDS = new Set([
    "latitude",
    "longitude",
    "elevation_m",
    "recommended_days_min",
    "recommended_days_max",
]);

const ARRAY_FIELDS = new Set([
    "destination_type",
    "source",
]);

interface Cursor {
    offset: number;
    dataset_revision: string;
}

interface DatasetCache {
    path: string;
    mtimeMs: number;
    cities: CityRecord[];
    byId: Map<string, CityRecord>;
}

let cache: DatasetCache | null = null;

export class CityNotFoundError extends Error {
    constructor(cityId: string) {
        super(`City not found: ${cityId}`);
        this.name = "CityNotFoundError";
    }
}

export class InvalidDatasetError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "InvalidDatasetError";
    }
}

function getCsvPath(): string {
    return loadConfig(process.env).city_knowledgebase_csv_path;
}

function normalize(value: unknown): string {
    return String(value ?? "").trim().toLowerCase();
}

function parseArray(value: unknown): string[] {
    if (value == null || String(value).trim() === "") {
        return [];
    }

    return String(value)
        .split("|")
        .map((item) => item.trim())
        .filter(Boolean);
}

function parseNumber(value: unknown): number | undefined {
    if (value == null || String(value).trim() === "") {
        return undefined;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : undefined;
}

function convertRecord(raw: Record<string, string>): CityRecord {
    const record: Record<string, unknown> = {};

    for (const [key, rawValue] of Object.entries(raw)) {
        // Array fields are pipe-separated.
        if (ARRAY_FIELDS.has(key)) {
            record[key] = parseArray(rawValue);
            continue;
        }

        // Numeric fields become actual numbers.
        if (NUMERIC_FIELDS.has(key)) {
            record[key] = parseNumber(rawValue);
            continue;
        }

        // Keep everything else as a string, except empty values.
        const value = rawValue?.trim() ?? "";
        record[key] = value === "" ? undefined : value;
    }

    return record as CityRecord;
}

async function loadDataset(): Promise<DatasetCache> {
    const csvPath = getCsvPath();
    const stat = await fs.stat(csvPath);

    if (
        cache &&
            cache.path === csvPath &&
            cache.mtimeMs === stat.mtimeMs
    ) {
        return cache;
    }

    const csv = await fs.readFile(csvPath, "utf8");

    const records = parse(csv, {
        columns: true,
        skip_empty_lines: true,
        bom: true,
        relax_column_count: false,
        trim: false,
    }) as Record<string, string>[];

    if (records.length === 0) {
        throw new InvalidDatasetError("CSV dataset is empty");
    }

    const actualHeaders = Object.keys(records[0]);

    for (const requiredHeader of REQUIRED_HEADERS) {
        if (!actualHeaders.includes(requiredHeader)) {
            throw new InvalidDatasetError(
                `CSV is missing required column: ${requiredHeader}`
            );
        }
    }

    const cities = records.map(convertRecord);

    const byId = new Map<string, CityRecord>();

    for (const city of cities) {
        if (!city.city_id) {
            throw new InvalidDatasetError(
                "CSV contains a row without city_id"
            );
        }

        if (byId.has(city.city_id)) {
            throw new InvalidDatasetError(
                `Duplicate city_id in CSV: ${city.city_id}`
            );
        }

        byId.set(city.city_id, city);
    }

    cache = {
        path: csvPath,
        mtimeMs: stat.mtimeMs,
        cities,
        byId,
    };

    return cache;
}

function encodeCursor(cursor: Cursor): string {
    return Buffer.from(
        JSON.stringify(cursor),
        "utf8"
    ).toString("base64url");
}

function decodeCursor(cursor: string): Cursor {
    try {
        const decoded = Buffer.from(cursor, "base64url").toString("utf8");
        const parsed = JSON.parse(decoded) as Partial<Cursor>;

        if (
            typeof parsed.offset !== "number" ||
                !Number.isInteger(parsed.offset) ||
                parsed.offset < 0 ||
                typeof parsed.dataset_revision !== "string"
        ) {
            throw new Error("Invalid cursor");
        }

        return {
            offset: parsed.offset,
            dataset_revision: parsed.dataset_revision,
        };
    } catch {
        throw new Error("Invalid pagination cursor");
    }
}

function matchesDestinationScope(
    city: CityRecord,
    scope: DestinationScope
): boolean {
    /*
     * resolved_city_ids is used deliberately.

     * This is especially important for country scopes because
     * the supplied CSV does not contain a country column.
     */
    if (scope.resolved_city_ids.length > 0) {
        return scope.resolved_city_ids.includes(city.city_id);
    }

    /*
     * If resolved_city_ids is empty, we can still make a useful
     * best-effort match for city/region scopes.
     *
     * Country scopes cannot be resolved from this CSV alone.
     */
    switch (scope.type) {
        case "city":
            return normalize(city.city_name) === normalize(scope.name);

        case "region":
            return normalize(city.region) === normalize(scope.name);

        case "country":
            return false;

        default:
            return false;
    }
}

function matchesFilters(
    city: CityRecord,
    filters: SearchCitiesInput["filters"]
): boolean {
    // Region
    if (
        filters.region !== null &&
            normalize(city.region) !== normalize(filters.region)
    ) {
        return false;
    }

    // Destination types.
    //
    // Semantics:
    // filters.destination_types = ["beach", "cultural"]
    // means the city must have AT LEAST ONE of those types.
    if (filters.destination_types.length > 0) {
        const cityTypes = (city.destination_type ?? []).map(normalize);

        const requestedTypes = filters.destination_types.map(normalize);

        const hasMatchingType = requestedTypes.some((type) =>
            cityTypes.includes(type)
                                                   );

        if (!hasMatchingType) {
            return false;
        }
    }

    // Climate types.
    if (filters.climate_types.length > 0) {
        const requestedClimates = filters.climate_types.map(normalize);

        if (
            !requestedClimates.includes(
                normalize(city.climate_type)
            )
        ) {
            return false;
        }
    }

    // Tourism popularity.
    if (
        filters.tourism_popularity !== null &&
            normalize(city.tourism_popularity) !==
            normalize(filters.tourism_popularity)
    ) {
        return false;
    }

    return true;
}

function matchesAllowedIds(
    city: CityRecord,
    allowedCityIds: string[]
): boolean {
    if (allowedCityIds.length === 0) {
        return true;
    }

    return allowedCityIds.includes(city.city_id);
}

function validatePageSize(pageSize: number): number {
    if (
        !Number.isInteger(pageSize) ||
            pageSize <= 0
    ) {
        throw new Error(
            `page_size must be a positive integer`
        );
    }

    // Prevent accidentally requesting millions of records.
    return Math.min(pageSize, 100);
}

export async function searchCities(
    input: SearchCitiesInput
): Promise<SearchCitiesResult> {
    const dataset = await loadDataset();

    if (input.dataset_revision !== DATASET_REVISION) {
        throw new Error(
            `Unsupported dataset revision: ${input.dataset_revision}`
        );
    }

    const pageSize = validatePageSize(input.page_size);

    /*
     * Currently searchCities does not accept a cursor in its input.
     *
     * Therefore this implementation always returns the first page.
     *
     * If you want actual pagination, add:
     *
     *   cursor?: string | null;
     *
     * to SearchCitiesInput.
     */

    const matchingCities = dataset.cities.filter((city) => {
        if (
            !matchesDestinationScope(
                city,
                input.destination_scope
            )
        ) {
            return false;
        }

        if (
            !matchesAllowedIds(
                city,
                input.allowed_city_ids
            )
        ) {
            return false;
        }

        if (
            !matchesFilters(
                city,
                input.filters
            )
        ) {
            return false;
        }

        return true;
    });

    const cities = matchingCities.slice(0, pageSize);

    const hasMore = matchingCities.length > pageSize;

    return {
        cities,
        dataset_revision: DATASET_REVISION,
        next_cursor: null,
        // hasMore
        //   ? encodeCursor({
        //       offset: pageSize,
        //       dataset_revision: DATASET_REVISION,
        //     })
        //   : null,
    };
}

export async function getCity(
    input: GetCityInput
): Promise<GetCityResult> {
    const dataset = await loadDataset();

    /*
     * Per your request, dataset_revision is effectively ignored
     * for now and the implementation uses the hardcoded revision.
     */
    const city = dataset.byId.get(input.city_id);

    if (!city) {
        throw new CityNotFoundError(input.city_id);
    }

    return {
        city,
        dataset_revision: DATASET_REVISION,
    };
}
