import { readFile } from "node:fs/promises";
import { parse } from "csv-parse/sync";
import { CityRecord, GetCityInput, GetCityResult, SearchCitiesInput, SearchCitiesResult } from "../../../ai/candidate-design";
import { loadConfig } from "../app/config";
import { logger } from "../modules/logger";

type CsvRow = Record<string, string>;

let cachedCities: CityRecord[] | null = null;
let cachedCsvPath: string | null = null;

/**
 * Searches cities from the CSV file specified by CITIES_CSV_PATH.
 */
export async function searchCities(
    input: SearchCitiesInput,
): Promise<SearchCitiesResult> {
    logger.debug('agent 2 is using searchCities tool call', { req: input })
    const cities = await loadCities();

    const region = normalize(input.region);
    const tourismPopularity = normalize(input.tourism_popularity);

    const destinationTypes = new Set(
        input.destination_types
            .map(normalize)
            .filter((value): value is string => value !== null),
    );

    const climateTypes = new Set(
        input.climate_types
            .map(normalize)
            .filter((value): value is string => value !== null),
    );

    const filtered = cities.filter((city) => {
        if (region !== null && normalize(city.region) !== region) {
            return false;
        }

        if (
            tourismPopularity !== null &&
                normalize(city.tourism_popularity) !== tourismPopularity
        ) {
            return false;
        }

        if (
            climateTypes.size > 0 &&
                !climateTypes.has(normalize(city.climate_type) ?? "")
        ) {
            return false;
        }

        if (destinationTypes.size > 0) {
            const cityDestinationTypes = city.destination_type ?? [];

            const hasMatchingDestinationType = cityDestinationTypes.some(
                (destinationType) =>
                    destinationTypes.has(normalize(destinationType) ?? ""),
            );

            if (!hasMatchingDestinationType) {
                return false;
            }
        }

        return true;
    });

    logger.debug('sending agent 2 searchCities res', { res: { cities: filtered } });
    return {
        cities: filtered,
        next_cursor: null,
    };
}

/**
 * Gets one city by city_id from the CSV file specified by CITIES_CSV_PATH.
 */
export async function getCity(
    input: GetCityInput,
): Promise<GetCityResult> {
    logger.debug('agent 2 is using getCity tool call', { req: input })
    if (!input.city_id?.trim()) {
        throw new Error("city_id is required");
    }

    const cities = await loadCities();

    const city = cities.find(
        (candidate) => candidate.city_id === input.city_id,
    );

    if (!city) {
        throw new Error(`City not found: ${input.city_id}`);
    }

    logger.debug('sending agent 2 getCity res', { res: city });
    return { city };
}

async function loadCities(): Promise<CityRecord[]> {
    const csvPath = loadConfig(process.env).city_knowledgebase_csv_path

    if (!csvPath) {
        throw new Error(
            "Missing required environment variable for cities csv",
        );
    }

    // Reuse the cache when the same CSV is being used.
    if (cachedCities !== null && cachedCsvPath === csvPath) {
        return cachedCities;
    }

    const csvContents = await readFile(csvPath, "utf8");

    const rows = parse(csvContents, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
    }) as CsvRow[];

    cachedCities = rows.map(csvRowToCityRecord);
    cachedCsvPath = csvPath;

    return cachedCities;
}

function csvRowToCityRecord(row: CsvRow): CityRecord {
    const destination_type = [
        row.destination_type__001,
        row.destination_type__002,
        row.destination_type__003,
        row.destination_type__004,
        row.destination_type__005,
        row.destination_type__006,
    ].filter(isNonEmptyString);

    const city: CityRecord = {
        city_id: requireString(row.city_id, "city_id"),
        city_name: requireString(row.city_name, "city_name"),
    };

    addOptionalString(city, "state", row.state);
    addOptionalString(city, "region", row.region);
    addOptionalNumber(city, "latitude", row.latitude);
    addOptionalNumber(city, "longitude", row.longitude);
    addOptionalNumber(city, "elevation_m", row.elevation_m);
    addOptionalString(city, "climate_type", row.climate_type);

    if (destination_type.length > 0) {
        city.destination_type = destination_type;
    }

    addOptionalString(
        city,
        "tourism_popularity",
        row.tourism_popularity,
    );
    addOptionalString(
        city,
        "primary_airport",
        row.primary_airport,
    );
    addOptionalString(
        city,
        "primary_airport_iata",
        row.primary_airport_iata,
    );
    addOptionalString(
        city,
        "primary_railway_station",
        row.primary_railway_station,
    );
    addOptionalString(
        city,
        "primary_railway_station_code",
        row.primary_railway_station_code,
    );
    addOptionalNumber(
        city,
        "recommended_days_min",
        row.recommended_days_min,
    );
    addOptionalNumber(
        city,
        "recommended_days_max",
        row.recommended_days_max,
    );

    return city;
}

function requireString(
    value: string | undefined,
    fieldName: string,
): string {
    const trimmed = value?.trim();

    if (!trimmed) {
        throw new Error(`CSV row is missing required field: ${fieldName}`);
    }

    return trimmed;
}

function addOptionalString(
    target: CityRecord,
    key: string,
    value: string | undefined,
): void {
    const trimmed = value?.trim();

    if (trimmed) {
        target[key] = trimmed;
    }
}

function addOptionalNumber(
    target: CityRecord,
    key: string,
    value: string | undefined,
): void {
    const trimmed = value?.trim();

    if (!trimmed) {
        return;
    }

    const numberValue = Number(trimmed);

    if (!Number.isFinite(numberValue)) {
        throw new Error(
            `Invalid numeric value for ${key}: ${JSON.stringify(value)}`,
        );
    }

    target[key] = numberValue;
}

function normalize(value: string | null | undefined): string | null {
    const trimmed = value?.trim();

    return trimmed ? trimmed.toLowerCase() : null;
}

function isNonEmptyString(
    value: string | undefined,
): value is string {
    return Boolean(value?.trim());
}
