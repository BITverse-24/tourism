import { loadConfig } from "../app/config";
import { readFile } from "node:fs/promises";
import { parse } from "csv-parse/sync";
import { CityRecord, GetCityInput, GetCityResult, SearchCitiesInput, SearchCitiesResult } from "../../../ai/candidate-design";

// -----------------------------------------------------------------------------
// CSV configuration
// -----------------------------------------------------------------------------

function getCsvPath(): string {
    const path = loadConfig(process.env).city_knowledgebase_csv_path

    if (!path) {
        throw new Error(
            `Missing CITY_KNOWLEDGEBASE_CSV environment variable. ` +
                `Set it to the path of the cities CSV file.`,
        );
    }

    return path;
}

// -----------------------------------------------------------------------------
// CSV parsing
// -----------------------------------------------------------------------------

const ARRAY_COLUMNS = new Set([
    "destination_type",
    // Add more here if the CSV later gains array-valued columns.
    // "source",
]);

const NUMBER_COLUMNS = new Set([
    "latitude",
    "longitude",
    "elevation_m",
    "recommended_days_min",
    "recommended_days_max",
]);

function parsePipeSeparated(value: string): string[] {
    return value
        .split("|")
        .map((item) => item.trim())
        .filter(Boolean);
}

function parseCsvValue(
    column: string,
    value: string | undefined,
): unknown {
    if (value === undefined || value === "") {
        return undefined;
    }

    if (ARRAY_COLUMNS.has(column)) {
        return parsePipeSeparated(value);
    }

    if (NUMBER_COLUMNS.has(column)) {
        const number = Number(value);

        // Don't silently turn malformed numbers into NaN.
        if (Number.isNaN(number)) {
            throw new Error(
                `Invalid numeric value "${value}" in column "${column}".`,
            );
        }

        return number;
    }

    return value;
}

function rowToCityRecord(row: Record<string, string>): CityRecord {
    const record: Record<string, unknown> = {};

    for (const [column, value] of Object.entries(row)) {
        const parsed = parseCsvValue(column, value);

        // Omit empty/undefined optional fields.
        if (parsed !== undefined) {
            record[column] = parsed;
        }
    }

    if (typeof record.city_id !== "string" || !record.city_id) {
        throw new Error("CSV contains a row without a valid city_id.");
    }

    if (typeof record.city_name !== "string" || !record.city_name) {
        throw new Error(
            `CSV row for city_id "${record.city_id}" has no valid city_name.`,
        );
    }

    return record as CityRecord;
}

async function loadCities(): Promise<CityRecord[]> {
    const csvPath = getCsvPath();

    const csv = await readFile(csvPath, "utf8");

    const rows = parse(csv, {
        columns: true,
        skip_empty_lines: true,
        bom: true,
        trim: true,
    }) as Record<string, string>[];

    return rows.map(rowToCityRecord);
}

// -----------------------------------------------------------------------------
// Filtering helpers
// -----------------------------------------------------------------------------

function normalize(value: string): string {
    return value.trim().toLowerCase();
}

function matchesOneOf(
    actual: string | undefined,
    requested: string[],
): boolean {
    if (requested.length === 0) {
        return true;
    }

    if (!actual) {
        return false;
    }

    const normalizedActual = normalize(actual);

    return requested.some(
        (value) => normalize(value) === normalizedActual,
    );
}

function matchesDestinationTypes(
    actual: string[] | undefined,
    requested: string[],
): boolean {
    if (requested.length === 0) {
        return true;
    }

    if (!actual || actual.length === 0) {
        return false;
    }

    const actualSet = new Set(actual.map(normalize));

    // A city matches if it has at least one requested destination type.
    return requested.some((type) => actualSet.has(normalize(type)));
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export async function searchCities(
    input: SearchCitiesInput,
): Promise<SearchCitiesResult> {
    const cities = await loadCities();

    const filtered = cities.filter((city) => {
        // Region
        if (
            input.region !== null &&
                normalize(city.region ?? "") !== normalize(input.region)
        ) {
            return false;
        }

        // Destination type
        if (
            !matchesDestinationTypes(
                city.destination_type,
                input.destination_types,
            )
        ) {
            return false;
        }

        // Climate type
        if (
            !matchesOneOf(city.climate_type, input.climate_types)
        ) {
            return false;
        }

        // Tourism popularity
        if (
            input.tourism_popularity !== null &&
                normalize(city.tourism_popularity ?? "") !==
                normalize(input.tourism_popularity)
        ) {
            return false;
        }

        return true;
    });

    return {
        cities: filtered,
        next_cursor: null,
    };
}

export async function getCity(
    input: GetCityInput,
): Promise<GetCityResult> {
    const cities = await loadCities();

    const city = cities.find(
        (candidate) => candidate.city_id === input.city_id,
    );

    if (!city) {
        throw new Error(`City not found: ${input.city_id}`);
    }

    return {
        city,
    };
}
