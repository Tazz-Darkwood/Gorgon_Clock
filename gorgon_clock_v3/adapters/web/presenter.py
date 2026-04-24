"""
Adapter: Web Presenter
Converts a ClockSnapshot into a JSON-serialisable dict for Django views.
Daily/special event fields removed — the schedule table and countdown logic
now live entirely in the browser, so the server only needs to serve time.
"""

from domain.gorgon_time import ClockSnapshot
from ports.clock_port import SnapshotPresenterPort


class WebPresenterAdapter(SnapshotPresenterPort):
    """Formats a ClockSnapshot for HTTP / template consumption."""

    def present(self, snapshot: ClockSnapshot) -> dict:
        return {
            "est_time":    snapshot.est_time,
            "gorgon_time": str(snapshot.gorgon_time),
        }
