"""
Model Manager module handling 4-tier Gemini model hierarchy fallback and timer-based recovery:
Hierarchy:
  1. gemini-3.7-flash (Primary)
  2. gemini-3.6
  3. gemini-3.5
  4. gemini-3.5-flash-lite
"""

import time
from typing import List, Dict, Any, Optional


class ModelManager:
    def __init__(
        self,
        model_hierarchy: Optional[List[str]] = None,
        rpm_tpm_cooldown: int = 60,
        rpd_cooldown: int = 86400
    ):
        if model_hierarchy is None:
            model_hierarchy = [
                "gemini-3.7-flash",
                "gemini-3.6",
                "gemini-3.5",
                "gemini-3.5-flash-lite"
            ]

        self.hierarchy = model_hierarchy
        self.rpm_tpm_cooldown = rpm_tpm_cooldown
        self.rpd_cooldown = rpd_cooldown

        # Lockout timestamps: model_name -> float (epoch time until locked)
        self.lockouts: Dict[str, float] = {m: 0.0 for m in self.hierarchy}

        # Usage counts: model_name -> count
        self.usage_counts: Dict[str, int] = {m: 0 for m in self.hierarchy}

        self.current_model: str = self.hierarchy[0]

    def _update_locks(self) -> float:
        """Check all lockouts and unlock models whose timers have expired."""
        now = time.time()
        for model in self.hierarchy:
            if self.lockouts[model] > 0 and self.lockouts[model] <= now:
                print(f"[ModelManager] Cooldown period expired for {model}. Unlocking model for use.")
                self.lockouts[model] = 0.0
        return now

    def get_active_model(self) -> str:
        """
        Return the highest available model in the hierarchy whose lock timer has expired.
        Auto-upgrades back to higher model tiers as soon as cooldown timers expire.
        """
        now = self._update_locks()

        for model in self.hierarchy:
            if self.lockouts[model] <= now:
                if model != self.current_model:
                    print(f"[ModelManager] Switching model: {self.current_model} -> {model} (Highest un-locked tier)")
                    self.current_model = model
                return model

        # If all models are locked, return lowest tier and wait
        print("[ModelManager] WARNING: All models in hierarchy are locked! Defaulting to lowest model tier.")
        return self.hierarchy[-1]

    def handle_rate_limit(
        self,
        model_name: str,
        is_daily_quota: bool = False,
        cooldown_override: Optional[int] = None
    ) -> str:
        """
        Record rate limit/server error lockout for model_name, trigger step-down fallback,
        and return the new active model.
        Supports cooldown_override (e.g. 10s for 503 UNAVAILABLE temporary batch fallback).
        """
        now = time.time()
        if cooldown_override is not None:
            cooldown = cooldown_override
        else:
            cooldown = self.rpd_cooldown if is_daily_quota else self.rpm_tpm_cooldown

        locked_until = now + cooldown
        self.lockouts[model_name] = locked_until
        print(f"[ModelManager] Lockout set on {model_name} for {cooldown}s (until {time.strftime('%H:%M:%S', time.localtime(locked_until))})")

        new_model = self.get_active_model()
        return new_model

    def record_success(self, model_name: str):
        """Record successful invocation for model_name."""
        if model_name in self.usage_counts:
            self.usage_counts[model_name] += 1

    def get_status_report(self) -> Dict[str, Any]:
        """Return snapshot of model hierarchy states."""
        now = self._update_locks()
        return {
            "active_model": self.get_active_model(),
            "lockouts": {
                m: max(0.0, round(self.lockouts[m] - now, 1))
                for m in self.hierarchy
            },
            "usage_counts": self.usage_counts
        }


if __name__ == "__main__":
    mm = ModelManager()
    print("Initial active model:", mm.get_active_model())

    # Simulate 503 temporary 10s lockout
    next_m = mm.handle_rate_limit("gemini-3.7-flash", cooldown_override=10)
    print("After 503 fallback:", next_m)
