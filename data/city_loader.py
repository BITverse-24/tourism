"""
City Loader module for reading 100 canonical cities from data/city.csv.
Guarantees exact city_id alignment with Dataset 1 contract in docs/DATASET.md.
"""

import csv
import os
import zlib
from typing import Dict, List, Any


def calculate_target_attractions(city_row: Dict[str, str]) -> int:
    """
    Deterministically calculate target attraction count (50-80) based on
    recommended_days_max, tourism_popularity, and a stable CRC32 seed.
    """
    city_id = city_row.get("city_id", "").strip().lower()
    try:
        max_days = int(city_row.get("recommended_days_max", 2))
    except ValueError:
        max_days = 2

    popularity = city_row.get("tourism_popularity", "Moderate").strip().lower()

    # Stable 100% deterministic hash integer based on city_id string
    stable_hash = zlib.crc32(city_id.encode("utf-8"))

    if max_days >= 5 or popularity == "very high":
        target = 75 + (stable_hash % 6)  # Exactly 75 to 80
    elif max_days >= 3 or popularity == "high":
        target = 63 + (stable_hash % 8)  # Exactly 63 to 70
    else:
        target = 50 + (stable_hash % 10) # Exactly 50 to 59

    return min(80, max(50, target))


def load_cities(csv_path: str = "data/city.csv") -> List[Dict[str, Any]]:
    """
    Load city records from CSV and return structured dicts with exact city_ids.
    """
    if not os.path.isabs(csv_path):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        candidate = os.path.join(base_dir, csv_path)
        if os.path.exists(candidate):
            csv_path = candidate

    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"City CSV file not found at: {csv_path}")

    cities = []
    with open(csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            city_id = row.get("city_id", "").strip()
            if not city_id:
                continue

            target_count = calculate_target_attractions(row)

            # Gather destination types from destination_type__XXX headers
            dest_types = []
            for k, v in row.items():
                if k and k.startswith("destination_type") and v and v.strip():
                    dest_types.append(v.strip())

            cities.append({
                "city_id": city_id,
                "city_name": row.get("city_name", "").strip(),
                "state": row.get("state", "").strip(),
                "region": row.get("region", "").strip(),
                "latitude": float(row["latitude"]) if row.get("latitude") else 0.0,
                "longitude": float(row["longitude"]) if row.get("longitude") else 0.0,
                "climate_type": row.get("climate_type", "").strip(),
                "destination_types": dest_types,
                "tourism_popularity": row.get("tourism_popularity", "").strip(),
                "recommended_days_min": int(row.get("recommended_days_min", 1)),
                "recommended_days_max": int(row.get("recommended_days_max", 3)),
                "target_attractions": target_count
            })

    return cities


if __name__ == "__main__":
    loaded = load_cities()
    print(f"Loaded {len(loaded)} canonical cities from city.csv.")
    for c in loaded[:5]:
        print(f"  {c['city_id']}: target POIs = {c['target_attractions']}")
