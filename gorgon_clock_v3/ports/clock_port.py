"""
Ports — abstract interfaces that separate the domain from its adapters.

The domain depends only on these protocols; adapters implement them.
"""

from abc import ABC, abstractmethod
from domain.gorgon_time import ClockSnapshot


class ClockPort(ABC):
    """Driving port: something that can produce a current ClockSnapshot."""

    @abstractmethod
    def get_snapshot(self) -> ClockSnapshot:
        ...


class SnapshotPresenterPort(ABC):
    """Driven port: something that can render a ClockSnapshot."""

    @abstractmethod
    def present(self, snapshot: ClockSnapshot) -> dict:
        """Return a serialisable dict suitable for JSON or template context."""
        ...
