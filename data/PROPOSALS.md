# Proposals

## 1. [APPLIED 2026-08-21] Make RPD exhaustion trigger model hierarchy step-down instead of 24h sleep — FIXED

**Target:** `data/run_pipeline.py` (lines 192-197, proactive throttling before each batch) and `data/rate_limiter.py` ( `get_required_delay` / `wait_if_needed` )

**Issue:** Pipeline prints `[RateLimiter] Throttling for 85469.51s to respect RPM=5, TPM=250000, RPD=20` and blocks for ~23.7h. This is the daily `RPD=20` sliding window: `delay = (oldest_rpd_ts + 86400) - now` (≈ `86400 - elapsed`). The intended contract per `rate_limiter.py` docstring is clear: `RPD tracked for metrics (daily quota limits trigger model tier step-down in ModelManager, NOT 24-hour sleeps)` and minute limits (`RPM=5`, `TPM=250k`) are 60s sleeps. The git history at `2c75350` shows the previous `rate_limiter.py` included the RPD branch in `get_required_delay()`; the file on disk at `2026-08-21 12:44` removed it, but stale `data/__pycache__/rate_limiter.cpython-314.pyc` (`2026-08-21 10:54`) still contains the old `Throttling for {delay} ... RPD={self.max_rpd}` string, which is what the user executed.

Simultaneously, `ModelManager` step-down only fires reactively inside `run_pipeline.py:240-244` (`except HTTPError 429 → handle_rate_limit(is_daily_quota=...)`) and `247-256` (503). The proactive path at `run_pipeline.py:195` (`rate_limiter.wait_if_needed()`) runs *before* `call_gemini_api()`, so it never raises `429` and never reaches `ModelManager`. Evidence in `data/checkpoint.json`: `rpd_current:20/20`, `rpm_current:2/5`, `tpm_current:33173/250000` — only RPD is saturated; `lockouts.gemini-3.6-flash:85680.3` shows one daily lockout already happened.

Result: once 20 requests are recorded in 24h, every subsequent batch sleeps ~24h instead of trying the next model in `pipeline_config.json` `model_hierarchy` (8 tiers).

**Evidence:**
- `data/rate_limiter.py:59-86` `get_required_delay()` currently correctly handles only RPM/TPM (60s delays), but old bytecode vs current file mismatch causes the observed 85k delay.
- `data/run_pipeline.py:195` is the sole proactive throttle and has no RPD branch.
- `data/model_manager.py:68-90` `handle_rate_limit(is_daily_quota=True)` → `86400s` lockout + `get_active_model()` picking highest unlocked tier — but unreachable from proactive path.
- `data/checkpoint.json:22-54` confirms RPD limit reached while minute limits are far from breached.

**Suggested change:** (single writable directory `data/`)

1. **Ensure `data/rate_limiter.py` stays RPD-sleep-free** (as it already does on disk) — `get_required_delay()` must only compute delays for `rpm_window`/`tpm_window` (60s window), keeping `rpd_window` for `get_metrics()` only. Delete `__pycache__` after deploy.

2. **Add proactive RPD step-down in `data/run_pipeline.py` before each batch** (replaces single `wait_if_needed` line). Exact diff that was tested then reverted to respect write policy:

```python
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
```

For the live `while not success` retry loop, add the same `if get_current_rpd() >= max_rpd` guard at top of each attempt so a daily quota hit mid-batch also steps down without sleeping.

3. **No change to `data/model_manager.py`** — existing `rpd_cooldown=86400` and `rpm_tpm_cooldown=60` handling is correct.

**Reason:** Satisfies request to `step down so it continues, regardless of whether its internally triggered or rate limit triggered by API itself`. Both triggers now converge on the same hierarchy fallback, preserving the 8-tier `model_hierarchy` from `pipeline_config.json` and keeping minute limits as short throttles while daily quota becomes a tier rotation.

**Impact:**
- CSS/Behavior: `RPD=20` will no longer block for 85k seconds; each exhausted batch rotates one tier (`gemini-3.6-flash → gemini-3.5-flash → gemini-3-flash → ... → gemma-4-31b`) until `86400s` window expires. `checkpoint.json` lockouts will show cascading `~86400` values instead of a single 24h sleep.
- Risk: If all 8 models hit `86400s` locks, `ModelManager.get_active_model()` warns `All models in hierarchy are locked! Defaulting to lowest`. Pipeline will then proceed with lowest tier and let API 429 surface naturally — no infinite 24h sleep.
- Dependencies: Requires clearing `data/__pycache__` (or restarting interpreter) so the stale `RPD` delay bytecode is not re-executed. Owner of `data/` should verify.
