"""
Main execution pipeline for Dataset 2 (Attraction Knowledgebase) generation.
Integrates city_loader, rate_limiter, model_manager, attraction_generator, and writer.
"""

import argparse
import json
import os
import sys
import time
import urllib.request
import urllib.error
from typing import Dict, List, Any

# Ensure local data directory is in sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from city_loader import load_cities
from rate_limiter import RateLimiter
from model_manager import ModelManager
from attraction_generator import (
    generate_prompt_for_city_batch,
    extract_json_from_response,
    validate_attraction_record,
    mock_generate_attractions
)
from writer import DatasetWriter


def call_gemini_api(model_name: str, prompt: str, api_key: str) -> Tuple[str, int, int]:
    """
    Invoke Gemini REST API with specified model_name and prompt.
    Returns (response_text, prompt_tokens, candidate_tokens, status_code).
    Raises urllib.error.HTTPError on HTTP errors (e.g. 429).
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json"
        }
    }

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")

    with urllib.request.urlopen(req, timeout=60) as resp:
        body = resp.read().decode("utf-8")
        res_json = json.loads(body)

        text = ""
        candidates = res_json.get("candidates", [])
        if candidates and "content" in candidates[0]:
            parts = candidates[0]["content"].get("parts", [])
            if parts:
                text = parts[0].get("text", "")

        usage = res_json.get("usageMetadata", {})
        total_tokens = usage.get("totalTokenCount", len(prompt) // 4 + len(text) // 4)

        return text, total_tokens, resp.status


def run_pipeline(
    config_path: str = "data/pipeline_config.json",
    dry_run: bool = False,
    resume: bool = True,
    target_city_id: Optional[str] = None
):
    print("=" * 70)
    print("ATTRACTION KNOWLEDGEBASE DATA GENERATION PIPELINE")
    print("=" * 70)

    # 1. Load config
    if not os.path.isabs(config_path):
        config_path = os.path.join(os.path.dirname(SCRIPT_DIR), config_path)
    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)

    rate_cfg = config.get("rate_limits", {})
    rate_limiter = RateLimiter(
        max_rpm=rate_cfg.get("max_rpm", 5),
        max_rpd=rate_cfg.get("max_rpd", 20),
        max_tpm=rate_cfg.get("max_tpm", 250000)
    )

    model_manager = ModelManager(
        model_hierarchy=config.get("model_hierarchy"),
        rpm_tpm_cooldown=config.get("cooldown_seconds", {}).get("rpm_tpm", 60),
        rpd_cooldown=config.get("cooldown_seconds", {}).get("rpd", 86400)
    )

    writer = DatasetWriter(
        output_dir=config.get("output_dir", "data/output"),
        checkpoint_file=config.get("checkpoint_file", "data/checkpoint.json")
    )

    # 2. Load cities from city.csv
    cities = load_cities(config.get("city_csv_path", "data/city.csv"))
    if target_city_id:
        cities = [c for c in cities if c["city_id"] == target_city_id]
        if not cities:
            print(f"[Pipeline] Error: Target city_id '{target_city_id}' not found in city.csv!")
            return

    print(f"[Pipeline] Loaded {len(cities)} canonical cities from city.csv.")

    # 3. Checkpoint state
    checkpoint = writer.load_checkpoint() if resume else {"completed_city_ids": [], "city_progress": {}}
    completed_cities = set(checkpoint.get("completed_city_ids", []))

    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key and not dry_run:
        print("[Pipeline] WARNING: GEMINI_API_KEY environment variable not set. Forcing --dry-run mode.")
        dry_run = True

    print(f"[Pipeline] Mode: {'DRY RUN (Simulation)' if dry_run else 'LIVE GEMINI API'}")
    print(f"[Pipeline] Initial active model: {model_manager.get_active_model()}")

    total_attractions = checkpoint.get("total_attractions", 0)

    # 4. Iterate over cities
    for idx, city in enumerate(cities, 1):
        city_id = city["city_id"]

        if city_id in completed_cities and resume:
            print(f"[{idx}/{len(cities)}] Skipping city '{city_id}' (already completed in checkpoint)")
            continue

        target_attractions = city["target_attractions"]
        batch_size = config.get("batch_size_attractions", 15)
        needed_batches = (target_attractions + batch_size - 1) // batch_size

        print("-" * 60)
        print(f"[{idx}/{len(cities)}] Processing City: {city['city_name']} ({city_id})")
        print(f"  State: {city['state']} | Target POIs: {target_attractions} ({needed_batches} batches)")

        city_attractions = []

        for batch_idx in range(needed_batches):
            attractions_in_batch = min(batch_size, target_attractions - len(city_attractions))
            if attractions_in_batch <= 0:
                break

            prompt = generate_prompt_for_city_batch(city, attractions_in_batch, batch_idx)
            estimated_tokens = 2000 + (attractions_in_batch * 200)

            # Proactive rate limit delay check
            rate_limiter.wait_if_needed(estimated_tokens=estimated_tokens, verbose=True)

            # Active model resolution (handles cooldown timer resets and upgrades)
            active_model = model_manager.get_active_model()

            if dry_run:
                records, tokens_used = mock_generate_attractions(city, attractions_in_batch)
                rate_limiter.record_request(tokens_used)
                model_manager.record_success(active_model)
                city_attractions.extend(records)
                print(f"  Batch {batch_idx+1}/{needed_batches}: Generated {len(records)} mock POIs using {active_model} ({tokens_used} tokens)", flush=True)
            else:
                # Live Gemini Call with retry/fallback logic
                success = False
                attempts = 0
                max_attempts = len(model_manager.hierarchy) * 2

                while not success and attempts < max_attempts:
                    attempts += 1
                    active_model = model_manager.get_active_model()

                    try:
                        print(f"  Batch {batch_idx+1}/{needed_batches}: Querying {active_model} for {attractions_in_batch} POIs...", flush=True)
                        response_text, tokens_used, status_code = call_gemini_api(active_model, prompt, api_key)

                        rate_limiter.record_request(tokens_used)
                        model_manager.record_success(active_model)

                        parsed = extract_json_from_response(response_text)
                        if isinstance(parsed, list):
                            valid_batch = []
                            for item in parsed:
                                is_valid, errs = validate_attraction_record(item, city_id)
                                if is_valid:
                                    valid_batch.append(item)
                                else:
                                    print(f"    Schema validation warning for POI '{item.get('name')}': {errs}", flush=True)

                            city_attractions.extend(valid_batch)
                            print(f"    Batch {batch_idx+1} succeeded: {len(valid_batch)} validated POIs generated.", flush=True)
                            success = True

                    except urllib.error.HTTPError as e:
                        if e.code == 429:
                            is_daily = "daily" in str(e).lower() or "quota" in str(e).lower()
                            new_model = model_manager.handle_rate_limit(active_model, is_daily_quota=is_daily)
                            print(f"    HTTP 429 Rate Limit on {active_model}. Switched to fallback: {new_model}", flush=True)
                            time.sleep(2)
                        else:
                            print(f"    HTTP Error {e.code} on {active_model}: {e.reason}", flush=True)
                            time.sleep(5)
                    except Exception as ex:
                        print(f"    Unexpected error querying {active_model}: {ex}", flush=True)
                        time.sleep(3)

        # 5. Incremental citywise write & checkpointing
        if city_attractions:
            total_attractions = writer.append_city_attractions(city_id, city_attractions)
            completed_cities.add(city_id)

            metrics = {
                "rate_limiter": rate_limiter.get_metrics(),
                "models": model_manager.get_status_report()
            }
            writer.save_checkpoint(
                completed_city_ids=list(completed_cities),
                city_progress={city_id: len(city_attractions)},
                total_attractions=total_attractions,
                metrics=metrics
            )
            print(f"  Completed '{city_id}'. Saved {len(city_attractions)} attractions. Checkpoint updated.")

    print("=" * 70)
    print(f"PIPELINE EXECUTION FINISHED. Total Dataset Attractions: {total_attractions}")
    print("=" * 70)


def print_status(config_path: str = "data/pipeline_config.json"):
    writer = DatasetWriter()
    cp = writer.load_checkpoint()
    attractions = writer.load_existing_attractions()
    print("=" * 60)
    print("PIPELINE STATUS REPORT")
    print("=" * 60)
    print(f"Completed Cities: {len(cp.get('completed_city_ids', []))}/100")
    print(f"Total Stored Attractions (attractions.json): {len(attractions)}")
    if cp.get("metrics"):
        print("Last Metrics Snapshot:", json.dumps(cp["metrics"], indent=2))
    print("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Attraction Data Generation Pipeline")
    parser.add_argument("--dry-run", action="store_true", help="Run simulation without live API calls")
    parser.add_argument("--no-resume", action="store_true", help="Start from scratch ignoring checkpoint")
    parser.add_argument("--city", type=str, default=None, help="Run pipeline for specific city_id")
    parser.add_argument("--status", action="store_true", help="Print pipeline status and exit")

    args = parser.parse_args()

    if args.status:
        print_status()
    else:
        run_pipeline(dry_run=args.dry_run, resume=not args.no_resume, target_city_id=args.city)
