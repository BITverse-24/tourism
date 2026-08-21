"""
Rate Limiter module implementing 3-dimensional tracking and proactive throttling:
- Requests Per Minute (RPM): max 5
- Requests Per Day (RPD): max 20
- Tokens Per Minute (TPM): max 250,000 (250k)
"""

import time
from collections import deque
from typing import Dict, Any


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

        # 86400s window for RPD
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
        Calculate seconds to sleep before making a request to avoid exceeding limits.
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

        # RPD check (max 20 per 24h)
        if len(self.rpd_window) >= self.max_rpd:
            oldest_rpd_ts = self.rpd_window[0][0]
            delays.append(max(0.0, (oldest_rpd_ts + 86400.0) - now + 1.0))

        return max(delays) if delays else 0.0

    def wait_if_needed(self, estimated_tokens: int = 5000, verbose: bool = True) -> float:
        """
        Proactively sleep if sending request would breach limits.
        """
        delay = self.get_required_delay(estimated_tokens)
        if delay > 0:
            if verbose:
                print(f"[RateLimiter] Throttling for {delay:.2f}s to respect RPM={self.max_rpm}, TPM={self.max_tpm}, RPD={self.max_rpd}")
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


if __name__ == "__main__":
    limiter = RateLimiter(max_rpm=5, max_rpd=20, max_tpm=250000)
    print("Initial metrics:", limiter.get_metrics())
    for i in range(3):
        limiter.record_request(tokens_used=1500)
    print("After 3 requests:", limiter.get_metrics())
