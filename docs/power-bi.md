# Power BI report

The database has three views made for reporting. Power BI connects with a read-only
login, `powerbi_reader`, which can read these views and nothing else. In particular it
can't see who reported what. The views are created by the EF Core migration
[`ReportViews`](../backend/src/Barrierefri.Api/Data/Migrations/20261118135219_ReportViews.cs).

| View | One row per | Used for |
|---|---|---|
| `report_cases` | Report | Volumes, SLA performance, time to fix, by category, city and responsible party |
| `report_hotspots` | ~250 m grid cell | Where barriers cluster |
| `report_status_history` | Status change | Workflow analysis, for example how often fixed cases get reopened |

Dates are converted to Danish local time in the views.

## 1. Connect

1. Start the stack: `docker compose up -d`.
2. Power BI Desktop: **Get data → PostgreSQL database**.
3. Server `localhost:5434`, database `barrierefri`, mode **Import**.
4. Credentials: **Database**, user `powerbi_reader`, password `powerbi`.
5. If asked about encryption, connect without it (the local container has no TLS).
6. Select the three `report_*` views and **Load**.

> The password is fixed for the local demo. In a real deployment, create the role
> with a secret from your key vault instead of in the migration.

## 2. Measures

In `report_cases`:

```dax
Reports = COUNTROWS ( report_cases )

Active Reports =
CALCULATE ( [Reports], report_cases[status] IN { "Open", "InProgress" } )

Overdue Reports =
CALCULATE ( [Reports], report_cases[is_overdue] = TRUE () )

Resolved Reports =
CALCULATE ( [Reports], report_cases[status] = "Resolved" )

SLA Met % =
DIVIDE (
    CALCULATE ( [Reports], report_cases[met_sla] = TRUE () ),
    CALCULATE ( [Reports], NOT ISBLANK ( report_cases[met_sla] ) )
)

Median Days To Fix =
MEDIANX (
    FILTER ( report_cases, report_cases[status] = "Resolved" ),
    report_cases[days_to_resolve]
)

Avg Confirmations =
AVERAGEX ( report_cases, report_cases[still_there_count] + report_cases[fixed_count] )
```

In `report_status_history`:

```dax
Reopened Cases =
CALCULATE (
    DISTINCTCOUNT ( report_status_history[report_id] ),
    report_status_history[from_status] = "Resolved",
    report_status_history[to_status] = "Open"
)
```

## 3. Report pages

**Page 1 – Overview**
- Cards: Active Reports, Overdue Reports, SLA Met %, Median Days To Fix.
- Clustered bar: SLA Met % by `category`. Broken lifts have a 2-day target and miss
  it far more often than the slow categories do. That's the main story in the data.
- Line chart: Reports by `reported_date` (month), legend `status`.
- Slicers: `city`, `responsible`.

**Page 2 – Who fixes what, how fast**
- Matrix: rows `responsible`, columns `category`, values Median Days To Fix, with
  conditional formatting (white to dark red).
- Table: `responsible`, Active Reports, Overdue Reports, SLA Met %, sorted by Overdue.

**Page 3 – Where**
- Map visual (or Azure Maps): latitude `cell_latitude`, longitude `cell_longitude`,
  bubble size `reports`, tooltip `most_common_category` and `active_reports`.

## 4. Make the report itself accessible

The app is built for people with disabilities, so the report should be readable by
them too:

- Turn on **View → Accessibility → Show alt text** and write alt text for each visual.
- Set the tab order (**View → Selection → Tab order**) to match the reading order.
- Use the built-in *Accessible default* theme or check contrast with the
  **Accessibility checker** (View tab).
- Don't use colour alone: add data labels to the SLA chart.

## About the demo data

Migration `DemoData` adds ~27 current reports at real places in Copenhagen, Aarhus,
Odense and Aalborg, plus about 150 resolved cases spread over the past year with
realistic fix times per category. The reports are invented.
