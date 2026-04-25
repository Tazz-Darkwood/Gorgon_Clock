"""
Django Views — the HTTP driving adapter.
Views are thin: they call ports and return responses. Zero business logic here.
"""

import json
from django.shortcuts import render
from django.http import JsonResponse

from adapters.clock.system_clock import SystemClockAdapter
from adapters.web.presenter import WebPresenterAdapter

_clock = SystemClockAdapter()
_presenter = WebPresenterAdapter()


def clock_page(request):
    """Render the main Gorgon Clock page."""
    snapshot = _clock.get_snapshot()
    context = _presenter.present(snapshot)
    return render(request, "clock/index.html", context)


def clock_api(request):
    """JSON endpoint polled by the frontend every second."""
    snapshot = _clock.get_snapshot()
    data = _presenter.present(snapshot)
    return JsonResponse(data)
