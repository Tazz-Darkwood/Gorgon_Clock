"""
Adapter: System Clock
Implements ClockPort by reading from the host machine's real-time clock.
This is the only place datetime I/O lives; the domain stays pure.
"""

from datetime import datetime
from zoneinfo import ZoneInfo

from domain.gorgon_time import build_snapshot, ClockSnapshot
from ports.clock_port import ClockPort

EST = ZoneInfo("America/New_York")


class SystemClockAdapter(ClockPort):
    """Reads EST and builds a ClockSnapshot."""

    def get_snapshot(self) -> ClockSnapshot:
        now_est = datetime.now(tz=EST)

        return build_snapshot(
            est_time_str=now_est.strftime("%I:%M:%S %p") + " EST",
            est_hour_24=now_est.hour,
            real_minute=now_est.minute,
        )
