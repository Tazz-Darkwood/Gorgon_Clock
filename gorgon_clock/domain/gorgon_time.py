"""
Domain: Gorgon Time
Pure business logic — no framework, no I/O.
Converts real-world time into Gorgon (PG) time.
Event resolution has been moved to the browser (schedule table + countdown).
"""

from dataclasses import dataclass
import math


@dataclass(frozen=True)
class GorgonTime:
    hour: str       # e.g. "12", "1" … "11"
    minute: str     # e.g. "00", "30"
    period: str     # "AM" or "PM"

    def __str__(self) -> str:
        return f"{self.hour}:{self.minute} {self.period}"


@dataclass(frozen=True)
class ClockSnapshot:
    est_time: str           # Eastern time (game server basis), e.g. "07:42:10 PM EST"
    gorgon_time: GorgonTime


# ---------------------------------------------------------------------------
# Pure conversion helpers
# ---------------------------------------------------------------------------

def _gorgon_period(real_hour_24: int) -> str:
    """Even hours → AM, odd hours → PM (Gorgon day/night convention)."""
    return "PM" if real_hour_24 % 2 != 0 else "AM"


def _real_minutes_to_gorgon(real_minute: int, real_hour_24: int) -> GorgonTime:
    """
    1 real minute = 5 Gorgon minutes → full Gorgon clock cycles every 12 real minutes.
    """
    pg_raw       = real_minute / 5
    pg_hour_int  = math.trunc(pg_raw)
    pg_minute    = int((pg_raw - pg_hour_int) * 60)

    hour_str   = "12" if pg_hour_int == 0 else str(pg_hour_int)
    minute_str = "00" if pg_minute   == 0 else str(pg_minute)
    period     = _gorgon_period(real_hour_24)

    return GorgonTime(hour=hour_str, minute=minute_str, period=period)


# ---------------------------------------------------------------------------
# Aggregate: build a snapshot from raw EST time parts
# ---------------------------------------------------------------------------

def build_snapshot(
    est_time_str: str,
    est_hour_24:  int,
    real_minute:  int,
) -> ClockSnapshot:
    gorgon = _real_minutes_to_gorgon(real_minute, est_hour_24)
    return ClockSnapshot(
        est_time=est_time_str,
        gorgon_time=gorgon,
    )
