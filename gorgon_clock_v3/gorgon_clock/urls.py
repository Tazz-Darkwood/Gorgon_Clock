"""URL routing for the Gorgon Clock app."""

from django.urls import path
from adapters.web.views import clock_page, clock_api

urlpatterns = [
    path("", clock_page, name="clock"),
    path("api/time/", clock_api, name="clock-api"),
]
