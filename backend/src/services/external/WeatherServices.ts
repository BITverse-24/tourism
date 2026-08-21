const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

export type WeatherQuery = {
    latitude: number;
    longitude: number;

    /**
     * Number of forecast days to request.
     * Open-Meteo supports 0-16 on the standard forecast API.
     */
    forecastDays?: number;

    /**
     * Specific start date/time.
     *
     * Examples:
     * "2026-08-16"
     * "2026-08-16T14:00"
     */
    start?: string;

    /**
     * Optional end date/time.
     *
     * Examples:
     * "2026-08-16"
     * "2026-08-16T18:00"
     */
    end?: string;

    /**
     * Hourly variables to return.
     */
    hourly?: string[];

    /**
     * Daily variables to return.
     */
    daily?: string[];

    /**
     * "auto" resolves the timezone from the coordinates.
     * You can also use e.g. "Europe/Amsterdam".
     */
    timezone?: string;

    temperatureUnit?: "celsius" | "fahrenheit";

    windSpeedUnit?: "kmh" | "ms" | "mph" | "kn";

    precipitationUnit?: "mm" | "inch";

    /**
     * Include previous days in the result.
     */
    pastDays?: number;

    /**
     * Open-Meteo weather model.
     * Usually leave undefined and let Open-Meteo choose.
     */
    models?: string;
};

export async function getWeather(query: WeatherQuery) {
    const params = new URLSearchParams();

    params.set("latitude", String(query.latitude));
    params.set("longitude", String(query.longitude));

    params.set(
        "forecast_days",
        String(query.forecastDays ?? 7)
    );

    params.set(
        "timezone",
        query.timezone ?? "auto"
    );

    if (query.start) {
        const isDateTime = query.start.includes("T");

        if (isDateTime) {
            params.set("start_hour", query.start);
        } else {
            params.set("start_date", query.start);
        }
    }

    if (query.end) {
        const isDateTime = query.end.includes("T");

        if (isDateTime) {
            params.set("end_hour", query.end);
        } else {
            params.set("end_date", query.end);
        }
    }

    if (query.hourly?.length) {
        params.set(
            "hourly",
            query.hourly.join(",")
        );
    }

    if (query.daily?.length) {
        params.set(
            "daily",
            query.daily.join(",")
        );
    }

    if (query.temperatureUnit) {
        params.set(
            "temperature_unit",
            query.temperatureUnit
        );
    }

    if (query.windSpeedUnit) {
        params.set(
            "wind_speed_unit",
            query.windSpeedUnit
        );
    }

    if (query.precipitationUnit) {
        params.set(
            "precipitation_unit",
            query.precipitationUnit
        );
    }

    if (query.pastDays !== undefined) {
        params.set(
            "past_days",
            String(query.pastDays)
        );
    }

    if (query.models) {
        params.set("models", query.models);
    }

    const url = `${OPEN_METEO_URL}?${params}`;

    const response = await fetch(url);

    if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
            `Open-Meteo request failed (${response.status}): ${errorText}`
        );
    }

    return response.json();
}
