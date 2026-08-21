# Attraction Knowledgebase Data Generation Pipeline

Minimal, resilient data generation pipeline for **Dataset 2 (Attraction Knowledgebase)** specified in [`docs/DATASET.md`](../docs/DATASET.md).

## Features

- **100 Canonical Cities**: Directly parses [`data/city.csv`](city.csv) to guarantee exact `city_id` foreign key alignment.
- **Dynamic 50–80 Attractions Per City**: Allocates target attraction counts based on city scope and popularity.
- **3-Dimensional Rate Limiting**: Enforces strict sliding windows:
  - **Requests Per Minute (RPM)**: 5
  - **Requests Per Day (RPD)**: 20
  - **Tokens Per Minute (TPM)**: 250,000 (250k)
- **4-Tier Model Fallback & Cooldown Recovery**:
  1. `gemini-3.7-flash` (Primary)
  2. `gemini-3.6`
  3. `gemini-3.5`
  4. `gemini-3.5-flash-lite`
  - On HTTP 429 / rate-limit errors, locks the affected model for a cooldown period (60s / 86400s) and cascades down the hierarchy.
  - Automatically checks lockout timers and upgrades back to higher model tiers as soon as cooldown windows expire.
- **Incremental Citywise JSON Persistence**: Saves completed city attraction records immediately to [`data/output/attractions.json`](output/attractions.json).
- **Atomic Checkpointing & Resumption**: Maintains progress in [`data/checkpoint.json`](checkpoint.json) to pause/resume seamlessly across days.

---

## Directory Structure

```text
data/
├── city.csv                  # 100 canonical cities input
├── pipeline_config.json      # Rate limits, model hierarchy, batch sizes
├── city_loader.py            # CSV reader & target attraction calculator
├── rate_limiter.py           # 3D sliding window rate limiter
├── model_manager.py          # Model fallback hierarchy & recovery timers
├── attraction_generator.py   # Gemini prompt builder & §2.5 schema validator
├── writer.py                 # Incremental JSON appender & checkpoint manager
├── run_pipeline.py           # CLI entry point
├── checkpoint.json           # Progress checkpoint state
└── output/
    └── attractions.json      # Dataset 2 JSON output file
```

---

## CLI Usage Commands

### 1. Check Pipeline Status
```bash
python3 data/run_pipeline.py --status
```

### 2. Dry-Run Simulation (No API Quota Used)
```bash
python3 data/run_pipeline.py --dry-run
```

### 3. Dry-Run for a Specific City
```bash
python3 data/run_pipeline.py --dry-run --city shimla_himachal_pradesh
```

### 4. Live API Execution
```bash
export GEMINI_API_KEY="your-gemini-api-key"
python3 data/run_pipeline.py
```

### 5. Start From Scratch (Ignore Checkpoint)
```bash
python3 data/run_pipeline.py --no-resume
```
