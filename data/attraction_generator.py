"""
Attraction Generator & Schema Validator module for Dataset 2 (Attraction Knowledgebase).
Integrates data/SYSTEM_PROMPT.md, constructs detailed prompts with field descriptions and
EXPLICIT PREVIOUS BATCH EXCLUSION LISTS to prevent cross-batch attraction duplication,
defines explicit Gemini responseSchema for structured JSON output,
and validates response records per docs/DATASET.md §2.5 & §2.6.
"""

import json
import os
import re
import datetime
from typing import Dict, List, Any, Tuple, Optional


# Gemini API OpenAPI Response Schema for Structured Output Enforcing
ATTRACTION_RESPONSE_SCHEMA = {
    "type": "ARRAY",
    "description": "List of researched tourism attraction records matching Dataset 2 schema in docs/DATASET.md §2.5",
    "items": {
        "type": "OBJECT",
        "properties": {
            "city_id": {"type": "STRING", "description": "Exact city_id foreign key from city.csv"},
            "attraction_id": {"type": "STRING", "description": "Unique identifier attraction_name_{city_id} in lowercase with underscores"},
            "name": {"type": "STRING", "description": "Canonical English name of the attraction without city/state suffix"},
            "alternate_names": {
                "type": "ARRAY",
                "items": {"type": "STRING"},
                "description": "Established local names, historical names, or transliteration variants"
            },
            "attraction_type": {
                "type": "STRING",
                "description": "Primary category (e.g. Fort, Temple, Museum, Beach, Waterfall, Market, Viewpoint, National_Park, Garden, Lake)"
            },
            "subtypes": {
                "type": "ARRAY",
                "items": {"type": "STRING"},
                "description": "Specific sub-characteristics (e.g. Hill_Fort, Historic_Site). Do not duplicate attraction_type."
            },
            "description": {"type": "STRING", "description": "Concise, factual explanation of what visitors encounter and primary significance"},
            "significance": {
                "type": "ARRAY",
                "items": {"type": "STRING"},
                "description": "Intrinsic significance reasons (e.g. Historical, Architectural, Religious, Cultural, Natural, UNESCO_Heritage)"
            },
            "location_area": {"type": "STRING", "description": "Neighborhood, locality, district, or area name"},
            "latitude": {"type": "NUMBER", "description": "Decimal degree latitude of POI"},
            "longitude": {"type": "NUMBER", "description": "Decimal degree longitude of POI"},
            "visit_duration_min": {"type": "INTEGER", "description": "Minimum realistic visit duration in MINUTES"},
            "visit_duration_typical": {"type": "INTEGER", "description": "Typical expected visit duration in MINUTES"},
            "visit_duration_max": {"type": "INTEGER", "description": "Thorough exploration visit duration in MINUTES (must be >= typical)"},
            "best_time_of_day": {
                "type": "ARRAY",
                "items": {"type": "STRING"},
                "description": "Best visiting times (Early_Morning, Morning, Afternoon, Late_Afternoon, Sunset, Evening, Night, Anytime)"
            },
            "best_months": {
                "type": "ARRAY",
                "items": {"type": "STRING"},
                "description": "Best months to visit (full month names)"
            },
            "avoid_months": {
                "type": "ARRAY",
                "items": {"type": "STRING"},
                "description": "Months when visiting is substantially less desirable due to weather/monsoon/closure"
            },
            "crowd_level": {"type": "STRING", "description": "Typical crowd intensity: Very_Low, Low, Moderate, High, Very_High"},
            "tourism_level": {"type": "STRING", "description": "Tourism ecosystem prominence: Major_Tourist, Popular, Moderately_Touristed, Local, Niche"},
            "hidden_gem": {"type": "BOOLEAN", "description": "Set to true only if attraction is genuinely lesser-known with high tourism value"},
            "discovery_category": {"type": "STRING", "description": "Surface category: Must_See, Popular, Local_Favorite, Hidden_Gem, Offbeat, Seasonal, Special_Interest, Worth_Detour"},
            "local_authenticity": {"type": "STRING", "description": "Representation of local culture/life: Very_High, High, Moderate, Low, Very_Low"},
            "photography_value": {"type": "STRING", "description": "Suitability for photography: Very_High, High, Moderate, Low, Very_Low"},
            "indoor_outdoor": {"type": "STRING", "description": "Physical environment: Indoor, Outdoor, Mixed"},
            "adventure_level": {"type": "STRING", "description": "Adventure/physical intensity: None, Low, Moderate, High, Extreme"},
            "accessibility_level": {"type": "STRING", "description": "Physical access difficulty: Very_Easy, Easy, Moderate, Difficult, Very_Difficult"},
            "family_suitability": {"type": "STRING", "description": "Suitability for families: Excellent, Good, Moderate, Poor, Unsuitable"},
            "elderly_suitability": {"type": "STRING", "description": "Suitability for elderly travelers: Excellent, Good, Moderate, Poor, Unsuitable"},
            "child_suitability": {"type": "STRING", "description": "Suitability for children: Excellent, Good, Moderate, Poor, Unsuitable"},
            "romantic_suitability": {"type": "STRING", "description": "Suitability for couples: Excellent, Good, Moderate, Poor, Unsuitable"},
            "booking_required": {"type": "BOOLEAN", "description": "True if advance reservation is normally required"},
            "entry_type": {"type": "STRING", "description": "Access payment model: Free, Paid, Donation, Restricted, Reservation_Required, Permit_Required, Seasonal"},
            "best_for": {
                "type": "ARRAY",
                "items": {"type": "STRING"},
                "description": "Relevant traveler motivations (History, Architecture, Culture, Nature, Wildlife, Photography, Food, etc.)"
            },
            "source": {
                "type": "ARRAY",
                "items": {"type": "STRING"},
                "description": "Authoritative sources verifying attraction factual details"
            },
            "last_updated": {"type": "STRING", "description": "Date of research in ISO YYYY-MM-DD format"}
        },
        "required": [
            "city_id", "attraction_id", "name", "attraction_type", "description",
            "significance", "location_area", "latitude", "longitude",
            "visit_duration_min", "visit_duration_typical", "crowd_level",
            "tourism_level", "hidden_gem", "discovery_category",
            "local_authenticity", "photography_value", "indoor_outdoor",
            "adventure_level", "accessibility_level", "family_suitability",
            "elderly_suitability", "child_suitability", "romantic_suitability",
            "entry_type", "best_for", "source", "last_updated"
        ]
    }
}


# Load SYSTEM_PROMPT.md dynamically
def load_system_prompt(prompt_path: str = "data/SYSTEM_PROMPT.md") -> str:
    if not os.path.isabs(prompt_path):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        candidate = os.path.join(base_dir, prompt_path)
        if os.path.exists(candidate):
            prompt_path = candidate
    if os.path.exists(prompt_path):
        with open(prompt_path, "r", encoding="utf-8") as f:
            return f.read().strip()
    return "You are the Attraction Knowledge Base Research Agent for an India-only AI travel planning system."


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


def generate_prompt_for_city_batch(
    city: Dict[str, Any],
    count: int,
    batch_index: int,
    existing_attraction_names: Optional[List[str]] = None
) -> str:
    """
    Generate structured Gemini user prompt requesting JSON array of attractions,
    including explicit EXCLUSION CONTEXT of previously generated attraction names to prevent duplicates.
    """
    today = datetime.date.today().isoformat()

    exclusion_clause = ""
    if existing_attraction_names and len(existing_attraction_names) > 0:
        names_list = "\n".join(f"- {name}" for name in existing_attraction_names)
        exclusion_clause = f"""
EXCLUDED ATTRACTIONS (PREVIOUSLY GENERATED FOR THIS CITY - DO NOT REPEAT ANY OF THESE):
{names_list}

DO NOT include any of the above places or their direct duplicates. Discover NEW, distinct attractions.
"""

    return f"""CITY TARGET DETAILS:
- City Name: {city['city_name']}
- State: {city['state']}
- Canonical city_id: {city['city_id']}
- Region: {city['region']}
- Latitude: {city['latitude']}
- Longitude: {city['longitude']}

TASK:
Generate exactly {count} NEW, distinct, researched tourism attractions for {city['city_name']} (Batch {batch_index + 1}).

CRITICAL INVARIANTS:
1. "city_id" MUST strictly be "{city['city_id']}".
2. "attraction_id" MUST follow format "attraction_name_{city['city_id']}" in lowercase with underscores.
3. Every attraction MUST be a real, verifiable POI in or practically associated with {city['city_name']}.
4. "last_updated" MUST be "{today}".
5. Output ONLY a valid JSON array matching the provided response schema.
{exclusion_clause}
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


def mock_generate_attractions(city: Dict[str, Any], count: int, offset: int = 0) -> Tuple[List[Dict[str, Any]], int]:
    """Mock generator for dry-run testing without API calls."""
    today = datetime.date.today().isoformat()
    results = []
    types = ["Fort", "Temple", "Museum", "Garden", "Market", "Viewpoint", "Lake"]

    for i in range(count):
        idx_val = offset + i + 1
        att_type = types[idx_val % len(types)]
        name = f"{city['city_name']} {att_type} {idx_val}"
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
            "latitude": round(city["latitude"] + (idx_val * 0.005), 4),
            "longitude": round(city["longitude"] + (idx_val * 0.005), 4),
            "visit_duration_min": 60,
            "visit_duration_typical": 120,
            "visit_duration_max": 180,
            "best_time_of_day": ["Morning", "Sunset"],
            "best_months": ["October", "November", "December", "January", "February", "March"],
            "avoid_months": ["May", "June"],
            "crowd_level": "Moderate",
            "tourism_level": "Popular",
            "hidden_gem": (idx_val % 5 == 0),
            "discovery_category": "Must_See" if idx_val < 3 else "Popular",
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
    prompt_text = load_system_prompt()
    print(f"System prompt loaded successfully ({len(prompt_text)} characters).")
    print(f"Response Schema properties count: {len(ATTRACTION_RESPONSE_SCHEMA['items']['properties'])}")
