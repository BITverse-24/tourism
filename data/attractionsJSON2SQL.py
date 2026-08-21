import json
import sqlite3
import sys
from pathlib import Path


# ============================================================
# CONFIGURATION
# ============================================================

DATABASE_FILE = "attractions.db"
JSON_FILE = "attractions.json"

# Change to True if you want existing attraction_id records
# to be replaced.
REPLACE_EXISTING = False


# ============================================================
# TABLE FIELDS
# Order matches the SQLite attraction table.
# ============================================================

COLUMNS = [
    "attraction_id",
    "city_id",
    "name",
    "alternate_names",
    "attraction_type",
    "subtypes",
    "description",
    "significance",
    "location_area",
    "latitude",
    "longitude",
    "visit_duration_min",
    "visit_duration_typical",
    "visit_duration_max",
    "best_time_of_day",
    "best_months",
    "avoid_months",
    "crowd_level",
    "tourism_level",
    "hidden_gem",
    "discovery_category",
    "local_authenticity",
    "photography_value",
    "indoor_outdoor",
    "adventure_level",
    "accessibility_level",
    "family_suitability",
    "elderly_suitability",
    "child_suitability",
    "romantic_suitability",
    "booking_required",
    "entry_type",
    "best_for",
    "source",
    "last_updated",
]


# ============================================================
# JSON ARRAY FIELDS
# These fields are stored in SQLite as TEXT containing JSON.
# ============================================================

JSON_ARRAY_FIELDS = {
    "alternate_names",
    "subtypes",
    "significance",
    "best_time_of_day",
    "best_months",
    "avoid_months",
    "best_for",
    "source",
}


# ============================================================
# BOOLEAN FIELDS
# SQLite stores booleans as INTEGER:
#
# True  -> 1
# False -> 0
# ============================================================

BOOLEAN_FIELDS = {
    "hidden_gem",
    "booking_required",
}


# ============================================================
# LOAD JSON
# Supports:
#
# [
#     {...},
#     {...}
# ]
#
# OR:
#
# {
#     ...
# }
# ============================================================

def load_json(json_file):
    with open(json_file, "r", encoding="utf-8") as file:
        data = json.load(file)

    # If the JSON contains a single object,
    # convert it into a list.
    if isinstance(data, dict):
        return [data]

    # If it already contains an array of objects.
    if isinstance(data, list):
        return data

    raise ValueError(
        "JSON root must be either an object or an array of objects."
    )


# ============================================================
# NORMALIZE ONE ATTRACTION RECORD
# ============================================================

def normalize_record(record):
    values = []

    for column in COLUMNS:
        value = record.get(column)

        # ----------------------------------------------------
        # JSON ARRAY FIELDS
        #
        # Example:
        #
        # ["History", "Architecture"]
        #
        # becomes:
        #
        # '["History", "Architecture"]'
        # ----------------------------------------------------
        if column in JSON_ARRAY_FIELDS:
            if value is None:
                values.append(None)
            else:
                if not isinstance(value, list):
                    raise ValueError(
                        f"Field '{column}' must be a JSON array. "
                        f"Found: {type(value).__name__}"
                    )

                values.append(
                    json.dumps(
                        value,
                        ensure_ascii=False,
                        separators=(",", ":")
                    )
                )

        # ----------------------------------------------------
        # BOOLEAN FIELDS
        #
        # True  -> 1
        # False -> 0
        # None  -> NULL
        # ----------------------------------------------------
        elif column in BOOLEAN_FIELDS:
            if value is None:
                values.append(None)

            elif isinstance(value, bool):
                values.append(int(value))

            else:
                raise ValueError(
                    f"Field '{column}' must be true, false, or null. "
                    f"Found: {value!r}"
                )

        # ----------------------------------------------------
        # ALL OTHER FIELDS
        # ----------------------------------------------------
        else:
            values.append(value)

    return tuple(values)


# ============================================================
# BUILD INSERT QUERY
# ============================================================

def build_insert_query():
    columns_sql = ", ".join(COLUMNS)
    placeholders = ", ".join("?" for _ in COLUMNS)

    if REPLACE_EXISTING:
        insert_type = "INSERT OR REPLACE"
    else:
        insert_type = "INSERT"

    return f"""
        {insert_type} INTO attraction (
            {columns_sql}
        )
        VALUES (
            {placeholders}
        )
    """


# ============================================================
# INSERT DATA
# ============================================================

def insert_attractions(database_file, records):
    query = build_insert_query()

    connection = sqlite3.connect(database_file)

    try:
        # Enable foreign key validation.
        connection.execute("PRAGMA foreign_keys = ON")

        cursor = connection.cursor()

        for index, record in enumerate(records, start=1):
            attraction_id = record.get("attraction_id", "<missing>")

            try:
                values = normalize_record(record)

                cursor.execute(query, values)

                print(
                    f"[{index}/{len(records)}] "
                    f"Inserted: {attraction_id}"
                )

            except Exception as error:
                raise RuntimeError(
                    f"Failed to insert record #{index} "
                    f"({attraction_id}): {error}"
                ) from error

        connection.commit()

        print()
        print(f"Successfully inserted {len(records)} attraction(s).")

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


# ============================================================
# MAIN
# ============================================================

def main():
    json_path = Path(JSON_FILE)
    database_path = Path(DATABASE_FILE)

    if not json_path.exists():
        print(f"ERROR: JSON file not found: {json_path}")
        sys.exit(1)

    if not database_path.exists():
        print(f"ERROR: Database file not found: {database_path}")
        sys.exit(1)

    try:
        records = load_json(json_path)

        print(f"Loaded {len(records)} attraction record(s).")

        insert_attractions(
            database_file=DATABASE_FILE,
            records=records
        )

    except Exception as error:
        print()
        print("IMPORT FAILED")
        print(error)
        sys.exit(1)


if __name__ == "__main__":
    main()
