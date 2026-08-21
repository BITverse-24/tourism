"""
Rate Limiter module implementing minute-level sliding window tracking and proactive throttling:
- Requests Per Minute (RPM): max 5 (60s sliding window)
- Tokens Per Minute (TPM): max 250,000 (60s sliding window)
- Requests Per Day (RPD): tracked for metrics (daily quota limits trigger model tier step-down in ModelManager, NOT 24-hour sleeps)
- Per-model overrides: lite models RPD=500, gemma RPD=14000 TPM=16000 RPM=30
"""

import time
from collections import deque
from typing import Dict, Any, Optional


class RateLimiter:
    def __init__(self, max_rpm: int = 5, max_rpd: int = 20, max_tpm: int = 250000):
        self.max_rpm = max_rpm
        self.max_rpd = max_rpd
        self.max_tpm = max_tpm

        # Deques of (timestamp, token_count)
        self.rpm_window = deque()  # last 60 seconds
        self.tpm_window = deque()  # last 60 seconds
        self.rpd_window = deque()  # last 86,400 seconds (24h)

        self.total_requests = 0
        self.total_tokens = 0

    def _purge_expired(self, now: float):
        """Purge entries older than their window limits."""
        # 60s window for RPM and TPM
        cutoff_60s = now - 60.0
        while self.rpm_window and self.rpm_window[0][0] < cutoff_60s:
            self.rpm_window.popleft()
        while self.tpm_window and self.tpm_window[0][0] < cutoff_60s:
            self.tpm_window.popleft()

        # 86400s window for RPD metrics tracking
        cutoff_24h = now - 86400.0
        while self.rpd_window and self.rpd_window[0][0] < cutoff_24h:
            self.rpd_window.popleft()

    def get_current_tpm(self, now: float = None) -> int:
        if now is None:
            now = time.time()
        self._purge_expired(now)
        return sum(tokens for _, tokens in self.tpm_window)

    def get_current_rpm(self, now: float = None) -> int:
        if now is None:
            now = time.time()
        self._purge_expired(now)
        return len(self.rpm_window)

    def get_current_rpd(self, now: float = None) -> int:
        if now is None:
            now = time.time()
        self._purge_expired(now)
        return len(self.rpd_window)

    def get_required_delay(self, estimated_tokens: int = 5000) -> float:
        """
        Calculate seconds to sleep before making a request to avoid exceeding minute limits (RPM=5, TPM=250k).
        Note: Daily quota (RPD) is handled by ModelManager stepping down model tiers, NOT by 24-hour sleeps.
        """
        now = time.time()
        self._purge_expired(now)

        delays = []

        # RPM check (max 5 per 60s)
        if len(self.rpm_window) >= self.max_rpm:
            oldest_rpm_ts = self.rpm_window[0][0]
            delays.append(max(0.0, (oldest_rpm_ts + 60.0) - now + 0.1))

        # TPM check (max 250,000 per 60s)
        current_tpm = sum(t for _, t in self.tpm_window)
        if current_tpm + estimated_tokens > self.max_tpm:
            # Need to wait until enough tokens fall out of the 60s window
            needed_reduction = (current_tpm + estimated_tokens) - self.max_tpm
            freed = 0
            for ts, tok in self.tpm_window:
                freed += tok
                if freed >= needed_reduction:
                    delays.append(max(0.0, (ts + 60.0) - now + 0.1))
                    break

        return max(delays) if delays else 0.0

    def wait_if_needed(self, estimated_tokens: int = 5000, verbose: bool = True) -> float:
        """
        Proactively sleep if sending request would breach minute limits (RPM=5, TPM=250k).
        """
        delay = self.get_required_delay(estimated_tokens)
        if delay > 0:
            if verbose:
                print(f"[RateLimiter] Throttling for {delay:.2f}s to respect RPM={self.max_rpm}, TPM={self.max_tpm}", flush=True)
            time.sleep(delay)
        return delay

    def record_request(self, tokens_used: int):
        """Record a completed request with timestamp and tokens consumed."""
        now = time.time()
        self._purge_expired(now)

        self.rpm_window.append((now, tokens_used))
        self.tpm_window.append((now, tokens_used))
        self.rpd_window.append((now, tokens_used))

        self.total_requests += 1
        self.total_tokens += tokens_used

    def get_metrics(self) -> Dict[str, Any]:
        """Return snapshot of live rate limiter metrics."""
        now = time.time()
        self._purge_expired(now)
        return {
            "rpm_current": len(self.rpm_window),
            "rpm_limit": self.max_rpm,
            "rpd_current": len(self.rpd_window),
            "rpd_limit": self.max_rpd,
            "tpm_current": sum(t for _, t in self.tpm_window),
            "tpm_limit": self.max_tpm,
            "total_requests": self.total_requests,
            "total_tokens": self.total_tokens
        }


class PerModelRateLimiter:
    """
    Wrapper that tracks separate sliding windows per model, so each model
    respects its own RPM/TPM/RPD limits (lite=500 RPD, gemma=14000/16000/30).
    Hierarchy step-down only happens when the *active* model's own RPD is hit.
    """

    def __init__(self, default_limits: Optional[Dict[str, int]] = None, per_model_limits: Optional[Dict[str, Dict[str, int]]] = None):
        if default_limits is None:
            default_limits = {"max_rpm": 5, "max_rpd": 20, "max_tpm": 250000}
        if per_model_limits is None:
            per_model_limits = {}
        self.default_limits = default_limits
        self.per_model_limits = per_model_limits
        self.limiters: Dict[str, RateLimiter] = {}

    def _limits_for(self, model_name: str) -> Dict[str, int]:
        # explicit match first
        if model_name in self.per_model_limits:
            return self.per_model_limits[model_name]
        # substring fallback for lite/gemma families
        lower = model_name.lower()
        if "gemma" in lower:
            # gemma-4-31b variants
            for k, v in self.per_model_limits.items():
                if "gemma" in k.lower():
                    return v
            return {"max_rpm": 30, "max_rpd": 14000, "max_tpm": 16000}
        if "lite" in lower:
            for k, v in self.per_model_limits.items():
                if "lite" in k.lower():
                    return v
            return {"max_rpm": 5, "max_rpd": 500, "max_tpm": 250000}
        return self.default_limits

    def get_limiter(self, model_name: str) -> RateLimiter:
        if model_name not in self.limiters:
            lim = self._limits_for(model_name)
            self.limiters[model_name] = RateLimiter(
                max_rpm=lim.get("max_rpm", 5),
                max_rpd=lim.get("max_rpd", 20),
                max_tpm=lim.get("max_tpm", 250000)
            )
        return self.limiters[model_name]

    # Per-model API mirrors RateLimiter but scoped to model_name
    def get_current_rpd(self, model_name: str, now: float = None) -> int:
        return self.get_limiter(model_name).get_current_rpd(now)

    def get_current_rpm(self, model_name: str, now: float = None) -> int:
        return self.get_limiter(model_name).get_current_rpm(now)

    def get_current_tpm(self, model_name: str, now: float = None) -> int:
        return self.get_limiter(model_name).get_current_tpm(now)

    def get_required_delay(self, model_name: str, estimated_tokens: int = 5000) -> float:
        return self.get_limiter(model_name).get_required_delay(estimated_tokens)

    def wait_if_needed(self, model_name: str, estimated_tokens: int = 5000, verbose: bool = True) -> float:
        return self.get_limiter(model_name).wait_if_needed(estimated_tokens, verbose)

    def record_request(self, model_name: str, tokens_used: int):
        self.get_limiter(model_name).record_request(tokens_used)

    def is_rpd_exhausted(self, model_name: str) -> bool:
        lim = self.get_limiter(model_name)
        return lim.get_current_rpd() >= lim.max_rpd

    def get_metrics(self) -> Dict[str, Any]:
        # aggregate + per-model breakdown
        per_model = {m: lim.get_metrics() for m, lim in self.limiters.items()}
        total_requests = sum(v["total_requests"] for v in per_model.values())
        total_tokens = sum(v["total_tokens"] for v in per_model.values())
        return {
            "per_model": per_model,
            "total_requests": total_requests,
            "total_tokens": total_tokens,
            # backward compat: expose active-like top-level using most-used limiter
            "rpd_current": per_model[list(per_model.keys())[-1]]["rpd_current"] if per_model else 0,
            "rpd_limit": per_model[list(per_model.keys())[-1]]["rpd_limit"] if per_model else 0,
        }

    def get_metrics_for(self, model_name: str) -> Dict[str, Any]:
        return self.get_limiter(model_name).get_metrics()


if __name__ == "__main__":
    limiter = RateLimiter(max_rpm=5, max_rpd=20, max_tpm=250000)
    print("Initial metrics:", limiter.get_metrics())
    for i in range(3):
        limiter.record_request(tokens_used=1500)
    print("After 3 requests:", limiter.get_metrics())

    print("\n--- PerModelRateLimiter demo ---")
    per = PerModelRateLimiter(
        default_limits={"max_rpm": 5, "max_rpd": 20, "max_tpm": 250000},
        per_model_limits={
            "gemini-2.5-flash-lite": {"max_rpm": 5, "max_rpd": 500, "max_tpm": 250000},
            "gemma-4-31b": {"max_rpm": 30, "max_rpd": 14000, "max_tpm": 16000},
        },
    )
    for _ in range(20):
        per.record_request("gemini-3.6-flash", 1000)
    print("flash 20 reqs rpd:", per.get_current_rpd("gemini-3.6-flash"), "exhausted?", per.is_rpd_exhausted("gemini-3.6-flash"))
    print("lite 0 reqs rpd:", per.get_current_rpd("gemini-2.5-flash-lite"), "exhausted?", per.is_rpd_exhausted("gemini-2.5-flash-lite"))
    print("gemma delay for 16k tokens (should be 0):", per.get_required_delay("gemma-4-31b", 16000))
