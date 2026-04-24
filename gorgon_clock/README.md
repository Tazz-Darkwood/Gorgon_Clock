# Gorgon Clock — Django Edition

A live-updating web clock that translates real time into **Gorgon (PG) time**
and surfaces in-game events. Refactored from tkinter into Django using the
**Ports & Adapters (Hexagonal Architecture)** pattern.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                        DOMAIN                            │
│  gorgon_time.py  — pure logic, no I/O, no framework     │
│  • _gorgon_period()       AM/PM conversion               │
│  • _real_minutes_to_gorgon()  time math                  │
│  • resolve_daily_event()  event rules                    │
│  • resolve_special_event() weekly event rules            │
│  • build_snapshot()       assembles ClockSnapshot        │
└─────────────────────┬────────────────────────────────────┘
                      │  depends only on ↓
┌─────────────────────▼────────────────────────────────────┐
│                        PORTS                             │
│  ClockPort          — interface: produce a snapshot      │
│  SnapshotPresenterPort — interface: render a snapshot    │
└────────┬────────────────────────────┬────────────────────┘
         │ implements                 │ implements
┌────────▼──────────┐       ┌─────────▼──────────────────┐
│  ADAPTER: Clock   │       │  ADAPTER: Web              │
│  SystemClockAdapter│      │  WebPresenterAdapter       │
│  (reads datetime) │       │  (formats dict for HTTP)   │
│                   │       │                            │
│                   │       │  views.py  (Django views)  │
│                   │       │  urls.py   (routing)       │
│                   │       │  index.html (template)     │
└───────────────────┘       └────────────────────────────┘
```

**Key principle:** the domain has zero imports from Django, datetime, or any
external library. All I/O crosses the boundary only through ports.

---

## Directory Structure

```
gorgon_clock/
├── manage.py
├── requirements.txt
├── domain/
│   └── gorgon_time.py          ← all business logic
├── ports/
│   └── clock_port.py           ← abstract interfaces
├── adapters/
│   ├── clock/
│   │   └── system_clock.py     ← reads system datetime
│   └── web/
│       ├── presenter.py        ← formats data for HTTP
│       └── views.py            ← Django views (thin)
├── gorgon_clock/
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
└── templates/
    └── clock/
        └── index.html          ← live-updating UI
```

---

## Running Locally

```bash
pip install -r requirements.txt
python manage.py runserver
```

Then open http://127.0.0.1:8000/ — the clock updates every second via a
lightweight JSON poll to `/api/time/`.

---

## Extending

| Want to…                        | Touch only…                          |
|---------------------------------|--------------------------------------|
| Add a new event rule            | `domain/gorgon_time.py`              |
| Support a different time source | New class implementing `ClockPort`   |
| Add a REST/GraphQL API          | New adapter in `adapters/web/`       |
| Write unit tests for logic      | `domain/` — no mocking needed        |
