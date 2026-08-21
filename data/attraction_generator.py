"""
Attraction Generator & Schema Validator module for Dataset 2 (Attraction Knowledgebase).
Constructs Gemini prompts, calls API, validates output schema per docs/DATASET.md §2.5 & §2.6.
"""

import json
import os
import re
import datetime
from typing import Dict, List, Any, Tuple, Optional

# Standard controlled taxonomies per docs/DATASET.md §2.5
TAXONOMIES = {
    "attraction_type": {
        "Fort", "Temple", "Museum", "Beach", "Waterfall", "Market", "Viewpoint",
        "National_Park", "Palace", "Garden", "Lake", "Monument", "Sanctuary",
        "Cave", "Bridge", "Dam", "Religious_Site", "Historic_Site"
    },
    "crowd_level": {"Very_Low", "Low", "Moderate", "High", "Very_High"},
    "tourism_level": {"Major_Tourist", "Popular", "Moderately_Touristed", "Local", "Niche"},
    "discovery_category": {
        "Must_See", "Popular", "Local_Favorite", "Hidden_Gem", "Offbeat",
        "Seasonal", "Special_Interest", "Worth_Detour"
    },
    "local_authenticity": {"Very_High", "High", "Moderate", "Low", "Very_Low"},
    "photography_value": {"Very_High", "High", "Moderate", "Low", "Very_Low"},
    "indoor_outdoor": {"Indoor", "Outdoor", "Mixed"},
    "adventure_level": {"None", "Low", "Moderate", "High", "Extreme"},
    "accessibility_level": {"Very_Easy", "Easy", "Moderate", "Difficult", "Very_Difficult"},
    "suitability": {"Excellent", "Good", "Moderate", "Poor", "Unsuitable"},
    "entry_type": {
        "Free", "Paid", "Donation", "Restricted", "Reservation_Required",
        "Permit_Required", "Seasonal"
    },
    "best_time_of_day": {
        "Early_Morning", "Morning", "Afternoon", "Late_Afternoon", "Sunset",
        "Evening", "Night", "Anytime"
    }
}


def sanitize_attraction_id(name: str, city_id: str) -> str:
    """Create attraction_id using attraction_name_{city_id} in lowercase with underscores."""
    clean_name = re.sub(r'[^a-zA-Z0-9]+', '_', name).strip('_').lower()
    clean_city = city_id.lower()
    return f"{clean_name}_{clean_city}"


def validate_attraction_record(record: Dict[str, Any], canonical_city_id: str) -> Tuple[bool, List[str]]:
    """
    Validate an attraction record against docs/DATASET.md §2.5 & §2.6 requirements.
    Returns (is_valid, error_messages).
    """
    errors = []

    # city_id match invariant
    if record.get("city_id") != canonical_city_id:
        errors.append(f"city_id mismatch: expected '{canonical_city_id}', got '{record.get('city_id')}'")

    # Name and ID
    if not record.get("name"):
        errors.append("Missing required field 'name'")
    if not record.get("attraction_id"):
        errors.append("Missing required field 'attraction_id'")

    # Required strings
    for field in ["attraction_type", "description", "location_area", "crowd_level",
                  "tourism_level", "discovery_category", "local_authenticity",
                  "photography_value", "indoor_outdoor", "adventure_level",
                  "accessibility_level", "family_suitability", "elderly_suitability",
                  "child_suitability", "romantic_suitability", "entry_type", "last_updated"]:
        if not record.get(field):
            errors.append(f"Missing required field '{field}'")

    # Required arrays
    for field in ["significance", "best_for", "source"]:
        val = record.get(field)
        if not isinstance(val, list) or len(val) == 0:
            errors.append(f"Field '{field}' must be a non-empty list")

    # Boolean fields
    if not isinstance(record.get("hidden_gem"), bool):
        errors.append("Field 'hidden_gem' must be boolean")

    # Lat/Lng numbers
    lat = record.get("latitude")
    lng = record.get("longitude")
    if not isinstance(lat, (int, float)) or not (-90 <= lat <= 90):
        errors.append(f"Invalid latitude: {lat}")
    if not isinstance(lng, (int, float)) or not (-180 <= lng <= 180):
        errors.append(f"Invalid longitude: {lng}")

    # Duration integers
    dur_min = record.get("visit_duration_min")
    dur_typ = record.get("visit_duration_typical")
    if not isinstance(dur_min, int) or dur_min <= 0:
        errors.append(f"Invalid visit_duration_min: {dur_min}")
    if not isinstance(dur_typ, int) or dur_typ < (dur_min or 0):
        errors.append(f"Invalid visit_duration_typical: {dur_typ} (must be >= min)")

    dur_max = record.get("visit_duration_max")
    if dur_max is not None and (not isinstance(dur_max, int) or dur_max < dur_typ):
        errors.append(f"Invalid visit_duration_max: {dur_max} (must be >= typical)")

    # Date check
    last_up = record.get("last_updated")
    if last_up:
        try:
            datetime.date.fromisoformat(str(last_up))
        except ValueError:
            errors.append(f"Field 'last_updated' must be YYYY-MM-DD, got '{last_up}'")

    return (len(errors) == 0, errors)


def generate_prompt_for_city_batch(city: Dict[str, Any], count: int, batch_index: int) -> str:
    """Generate structured Gemini prompt requesting JSON array of attractions."""
    today = datetime.date.today().isoformat()
    return f"""You are an expert tourism data researcher creating Dataset 2 (Attraction Knowledgebase) records.
Generate exactly {count} researched, real-world tourism attractions for the city:
- City Name: {city['city_name']}
- State: {city['state']}
- Canonical city_id: {city['city_id']}
- Region: {city['region']}

Target Batch: Batch {batch_index + 1} ({count} attractions).

CRITICAL REQUIREMENTS:
1. Every record MUST set "city_id": "{city['city_id']}".
2. Set "attraction_id" as lowercase "attraction_name_{city['city_id']}" with underscores.
3. Every attraction must be a real, verifiable POI in or immediately adjacent to {city['city_name']}.
4. Set "last_updated": "{today}".
5. Ensure valid coordinates (latitude, longitude) for {city['city_name']}.
6. Output ONLY a valid JSON array of object records matching the schema. No markdown prose around the JSON.

SCHEMA SPECIFICATION FOR EACH ATTRACTION RECORD:
{{
  "city_id": "{city['city_id']}",
  "attraction_id": "string",
  "name": "string",
  "alternate_names": ["string"],
  "attraction_type": "string (e.g. Fort, Temple, Museum, Beach, Waterfall, Market, Viewpoint, National_Park, Garden, Lake, Monument)",
  "subtypes": ["string"],
  "description": "string (factual, no marketing)",
  "significance": ["Historical", "Architectural", "Cultural", "Religious", "Natural", "UNESCO_Heritage"],
  "location_area": "string",
  "latitude": 0.0,
  "longitude": 0.0,
  "visit_duration_min": 60,
  "visit_duration_typical": 120,
  "visit_duration_max": 180,
  "best_time_of_day": ["Morning", "Sunset"],
  "best_months": ["October", "November", "December", "January", "February", "March"],
  "avoid_months": ["May", "June"],
  "crowd_level": "High",
  "tourism_level": "Major_Tourist",
  "hidden_gem": false,
  "discovery_category": "Must_See",
  "local_authenticity": "High",
  "photography_value": "Very_High",
  "indoor_outdoor": "Mixed",
  "adventure_level": "Low",
  "accessibility_level": "Moderate",
  "family_suitability": "Good",
  "elderly_suitability": "Good",
  "child_suitability": "Good",
  "romantic_suitability": "Good",
  "booking_required": false,
  "entry_type": "Paid",
  "best_for": ["History", "Architecture", "Photography"],
  "source": ["Official Tourism Department"],
  "last_updated": "{today}"
}}
"""


def extract_json_from_response(text: str) -> Any:
    """Extract JSON object/array from model output text, handling markdown fences."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    return json.loads(text)


def mock_generate_attractions(city: Dict[str, Any], count: int) -> Tuple[List[Dict[str, Any]], int]:
    """Mock generator for dry-run testing without API calls."""
    today = datetime.date.today().isoformat()
    results = []
    types = ["Fort", "Temple", "Museum", "Garden", "Market", "Viewpoint", "Lake"]

    for i in range(count):
        att_type = types[i % len(types)]
        name = f"{city['city_name']} {att_type} {i + 1}"
        att_id = sanitize_attraction_id(name, city["city_id"])

        record = {
            "city_id": city["city_id"],
            "attraction_id": att_id,
            "name": name,
            "alternate_names": [f"Old {name}"],
            "attraction_type": att_type,
            "subtypes": ["Historic_Site"],
            "description": f"A historic {att_type.lower()} located in {city['city_name']}, {city['state']}.",
            "significance": ["Historical", "Architectural"],
            "location_area": f"Central {city['city_name']}",
            "latitude": round(city["latitude"] + (i * 0.005), 4),
            "longitude": round(city["longitude"] + (i * 0.005), 4),
            "visit_duration_min": 60,
            "visit_duration_typical": 120,
            "visit_duration_max": 180,
            "best_time_of_day": ["Morning", "Sunset"],
            "best_months": ["October", "November", "December", "January", "February", "March"],
            "avoid_months": ["May", "June"],
            "crowd_level": "Moderate",
            "tourism_level": "Popular",
            "hidden_gem": (i % 5 == 0),
            "discovery_category": "Must_See" if i < 3 else "Popular",
            "local_authenticity": "High",
            "photography_value": "High",
            "indoor_outdoor": "Mixed",
            "adventure_level": "Low",
            "accessibility_level": "Easy",
            "family_suitability": "Good",
            "elderly_suitability": "Good",
            "child_suitability": "Good",
            "romantic_suitability": "Good",
            "booking_required": False,
            "entry_type": "Paid",
            "best_for": ["History", "Architecture", "Photography"],
            "source": [f"{city['state']} Tourism Department"],
            "last_updated": today
        }
        results.append(record)

    tokens = count * 250
    return results, tokens


if __name__ == "__main__":
    sample_city = {
        "city_id": "shimla_himachal_pradesh",
        "city_name": "Shimla",
        "state": "Himachal Pradesh",
        "region": "North India",
        "latitude": 31.1048,
        "longitude": 77.1734
    }
    records, tokens = mock_generate_attractions(sample_city, count=3)
    print(f"Mock generated {len(records)} records using {tokens} tokens.")
    valid, errs = validate_attraction_record(records[0], sample_city["city_id"])
    print(f"Validation status: {valid}, errors: {errs}")
