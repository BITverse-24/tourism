"""
Main execution pipeline for Dataset 2 (Attraction Knowledgebase) generation.
Integrates official google-genai Python SDK via Chat.send_message pattern with thinking_budget=1024,
city_loader, rate_limiter, model_manager (single API key with 4-tier model hierarchy step-down & timer recovery),
attraction_generator (with SYSTEM_PROMPT.md & responseSchema), and writer with IMMEDIATE BATCHWISE PERSISTENCE.
"""

import argparse
import json
import os
import sys
import time
import urllib.error
from typing import Dict, List, Any, Tuple, Optional

from google import genai
from google.genai import types

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
    mock_generate_attractions,
    load_system_prompt,
    ATTRACTION_RESPONSE_SCHEMA
)
from writer import DatasetWriter


def call_gemini_api(model_name: str, prompt: str, api_key: str, system_instruction: str = "") -> Tuple[str, int, int]:
    """
    Invoke official Google GenAI Python SDK using Chat.send_message pattern.
    Configures thinking_budget=1024 (~5-10s reasoning).
    Returns (response_text, total_tokens, status_code).
    Raises urllib.error.HTTPError on 429 rate limit / quota errors.
    """
    client = genai.Client(api_key=api_key)

    config = types.GenerateContentConfig(
        temperature=0.2,
        response_mime_type="application/json",
        response_schema=ATTRACTION_RESPONSE_SCHEMA,
        thinking_config=types.ThinkingConfig(thinking_budget=1024),
    )
    if system_instruction:
        config.system_instruction = system_instruction

    try:
        chat = client.chats.create(
            model=model_name,
            config=config
        )
        response = chat.send_message(prompt)

        text = response.text or ""
        total_tokens = 0
        if response.usage_metadata and response.usage_metadata.total_token_count:
            total_tokens = response.usage_metadata.total_token_count
        else:
            total_tokens = (len(prompt) + len(text)) // 4

        return text, total_tokens, 200

    except Exception as e:
        err_msg = str(e)
        if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg or "quota" in err_msg.lower():
            raise urllib.error.HTTPError(url="", code=429, msg=err_msg, hdrs={}, fp=None)
        raise e


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

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key and not dry_run:
        print("[Pipeline] WARNING: GEMINI_API_KEY environment variable not set. Forcing --dry-run mode.")
        dry_run = True

    # Separate dry-run files from main production files
    if dry_run:
        output_dir = "data/output"
        checkpoint_file = "data/checkpoint_dryrun.json"
        main_json = "attractions_dryrun.json"
    else:
        output_dir = config.get("output_dir", "data/output")
        checkpoint_file = config.get("checkpoint_file", "data/checkpoint.json")
        main_json = "attractions.json"

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
        output_dir=output_dir,
        checkpoint_file=checkpoint_file
    )
    writer.json_path = os.path.join(writer.output_dir, main_json)

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
    city_progress = checkpoint.get("city_progress", {})

    system_instruction = load_system_prompt()
    print(f"[Pipeline] System prompt loaded from data/SYSTEM_PROMPT.md ({len(system_instruction)} chars)")
    print(f"[Pipeline] Mode: {'DRY RUN (Isolated simulation)' if dry_run else 'LIVE GEMINI API (Production)'}")
    print(f"[Pipeline] Output Target: {writer.json_path}")
    print(f"[Pipeline] Checkpoint Target: {writer.checkpoint_file}")
    print(f"[Pipeline] Initial active model: {model_manager.get_active_model()}")

    total_attractions = checkpoint.get("total_attractions", 0)

    # 4. Iterate over cities
    for idx, city in enumerate(cities, 1):
        city_id = city["city_id"]

        if city_id in completed_cities and resume:
            print(f"[{idx}/{len(cities)}] Skipping city '{city_id}' (already completed in checkpoint)")
            continue

        target_attractions = city["target_attractions"]
        batch_size = config.get("batch_size_attractions", 25)
        already_generated = city_progress.get(city_id, 0)
        remaining_target = max(0, target_attractions - already_generated)

        if remaining_target <= 0:
            completed_cities.add(city_id)
            continue

        needed_batches = (remaining_target + batch_size - 1) // batch_size

        print("-" * 60)
        print(f"[{idx}/{len(cities)}] Processing City: {city['city_name']} ({city_id})")
        print(f"  State: {city['state']} | Target POIs: {target_attractions} (Already saved: {already_generated}, Remaining: {remaining_target} in {needed_batches} batches)")

        city_batch_generated = 0

        for batch_idx in range(needed_batches):
            attractions_in_batch = min(batch_size, remaining_target - city_batch_generated)
            if attractions_in_batch <= 0:
                break

            existing_saved = writer.load_existing_attractions()
            existing_city_names = [item["name"] for item in existing_saved if item.get("city_id") == city_id and "name" in item]

            prompt = generate_prompt_for_city_batch(
                city=city,
                count=attractions_in_batch,
                batch_index=batch_idx,
                existing_attraction_names=existing_city_names
            )
            estimated_tokens = 2500 + (attractions_in_batch * 200)

            # Proactive DAILY QUOTA handling: RPD exhaustion triggers model step-down, NOT 24h sleep
            # Fires on internal tracking regardless of API 429. Reactive path below handles API-triggered quota.
            if rate_limiter.get_current_rpd() >= rate_limiter.max_rpd:
                pre_model = model_manager.get_active_model()
                next_m = model_manager.handle_rate_limit(pre_model, is_daily_quota=True)
                print(f"[Pipeline] Proactive RPD limit hit ({rate_limiter.get_current_rpd()}/{rate_limiter.max_rpd} in 24h). Stepping down {pre_model} -> {next_m} instead of waiting 24h", flush=True)

            # Proactive minute-limit delay check (RPM/TPM only — 60s wait, never 24h)
            rate_limiter.wait_if_needed(estimated_tokens=estimated_tokens, verbose=True)

            active_model = model_manager.get_active_model()
            valid_batch = []

            if dry_run:
                records, tokens_used = mock_generate_attractions(city, attractions_in_batch, offset=len(existing_city_names))
                rate_limiter.record_request(tokens_used)
                model_manager.record_success(active_model)
                valid_batch = records
                print(f"  Batch {batch_idx+1}/{needed_batches}: Generated {len(valid_batch)} mock POIs using {active_model} ({tokens_used} tokens)", flush=True)
            else:
                # Live Gemini Call using recommended Chat.send_message pattern
                success = False
                attempts = 0
                max_attempts = len(model_manager.hierarchy) * 2

                while not success and attempts < max_attempts:
                    attempts += 1
                    # Proactive daily quota check inside retry loop — step down even between attempts
                    if rate_limiter.get_current_rpd() >= rate_limiter.max_rpd:
                        pre = model_manager.get_active_model()
                        nxt = model_manager.handle_rate_limit(pre, is_daily_quota=True)
                        print(f"    [Retry] Proactive RPD hit ({rate_limiter.get_current_rpd()}/{rate_limiter.max_rpd}). {pre} -> {nxt}", flush=True)
                    active_model = model_manager.get_active_model()

                    try:
                        print(f"  Batch {batch_idx+1}/{needed_batches}: Querying {active_model} for {attractions_in_batch} POIs...", flush=True)
                        response_text, tokens_used, status_code = call_gemini_api(
                            model_name=active_model,
                            prompt=prompt,
                            api_key=api_key,
                            system_instruction=system_instruction
                        )

                        rate_limiter.record_request(tokens_used)
                        model_manager.record_success(active_model)

                        parsed = extract_json_from_response(response_text)
                        if isinstance(parsed, list):
                            for item in parsed:
                                is_valid, errs = validate_attraction_record(item, city_id)
                                if is_valid:
                                    valid_batch.append(item)
                                else:
                                    print(f"    Schema validation warning for POI '{item.get('name')}': {errs}", flush=True)

                            print(f"    Batch {batch_idx+1} succeeded: {len(valid_batch)} validated POIs generated.", flush=True)
                            success = True

                    except urllib.error.HTTPError as e:
                        if e.code == 429:
                            is_daily = "daily" in str(e).lower() or "quota" in str(e).lower()
                            next_m = model_manager.handle_rate_limit(active_model, is_daily_quota=is_daily)
                            print(f"    HTTP 429 Rate Limit on {active_model}. Stepping down to: {next_m}", flush=True)
                            time.sleep(2)
                        elif e.code in (500, 502, 503, 504):
                            next_m = model_manager.handle_rate_limit(active_model, cooldown_override=10)
                            print(f"    HTTP {e.code} Unavailable on {active_model}. Temporarily stepping down for 1 batch to: {next_m}", flush=True)
                            time.sleep(1)
                        else:
                            print(f"    HTTP Error {e.code} on {active_model}: {e.reason}", flush=True)
                            time.sleep(5)
                    except Exception as ex:
                        err_str = str(ex)
                        if "503" in err_str or "UNAVAILABLE" in err_str or "high demand" in err_str.lower() or "overloaded" in err_str.lower():
                            next_m = model_manager.handle_rate_limit(active_model, cooldown_override=10)
                            print(f"    503 Service Unavailable on {active_model}. Temporarily stepping down for 1 batch to: {next_m}", flush=True)
                            time.sleep(1)
                        elif "timeout" in err_str.lower() or "timed out" in err_str.lower():
                            next_m = model_manager.handle_rate_limit(active_model, cooldown_override=10)
                            print(f"    Timeout on {active_model}. Stepping down to: {next_m}", flush=True)
                        else:
                            print(f"    SDK error querying {active_model}: {ex}", flush=True)
                        time.sleep(3)

            # IMMEDIATE BATCHWISE PERSISTENCE: Save into output file as soon as batch completes!
            if valid_batch:
                total_attractions = writer.append_city_attractions(city_id, valid_batch)
                city_batch_generated += len(valid_batch)
                current_city_total = already_generated + city_batch_generated
                city_progress[city_id] = current_city_total

                metrics = {
                    "rate_limiter": rate_limiter.get_metrics(),
                    "models": model_manager.get_status_report()
                }
                writer.save_checkpoint(
                    completed_city_ids=list(completed_cities),
                    city_progress=city_progress,
                    total_attractions=total_attractions,
                    metrics=metrics
                )
                print(f"    --> BATCH PERSISTED: Appended {len(valid_batch)} POIs to {writer.json_path}. Checkpoint updated.", flush=True)

        # Mark city as fully completed when all batches finish
        completed_cities.add(city_id)
        writer.save_checkpoint(
            completed_city_ids=list(completed_cities),
            city_progress=city_progress,
            total_attractions=total_attractions,
            metrics={
                "rate_limiter": rate_limiter.get_metrics(),
                "models": model_manager.get_status_report()
            }
        )
        print(f"  Completed city '{city_id}'. Saved total {city_progress.get(city_id, 0)} attractions.")

    print("=" * 70)
    print(f"PIPELINE EXECUTION FINISHED. Total Dataset Attractions: {total_attractions}")
    print("=" * 70)


def print_status(config_path: str = "data/pipeline_config.json"):
    writer = DatasetWriter()
    cp = writer.load_checkpoint()
    attractions = writer.load_existing_attractions()
    print("=" * 60)
    print("PRODUCTION PIPELINE STATUS REPORT")
    print("=" * 60)
    print(f"Completed Cities: {len(cp.get('completed_city_ids', []))}/100")
    print(f"Total Stored Attractions (attractions.json): {len(attractions)}")
    if cp.get("metrics"):
        print("Last Metrics Snapshot:", json.dumps(cp["metrics"], indent=2))
    print("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Attraction Data Generation Pipeline")
    parser.add_argument("--dry-run", action="store_true", help="Run simulation without live API calls using dry-run files")
    parser.add_argument("--no-resume", action="store_true", help="Start from scratch ignoring checkpoint")
    parser.add_argument("--city", type=str, default=None, help="Run pipeline for specific city_id")
    parser.add_argument("--status", action="store_true", help="Print pipeline status and exit")

    args = parser.parse_args()

    if args.status:
        print_status()
    else:
        run_pipeline(dry_run=args.dry_run, resume=not args.no_resume, target_city_id=args.city)
