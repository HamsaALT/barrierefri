using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Barrierefri.Api.Data.Migrations
{
    /// <summary>
    /// Views for Power BI and a read-only login that can only see them. Times are
    /// converted to Danish local time here, so the report never has to deal with UTC.
    /// Reporter ids are left out: the report is about barriers, not about people.
    /// </summary>
    public partial class ReportViews : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                CREATE VIEW report_cases AS
                SELECT r.id                                                     AS report_id,
                       r.category,
                       r.status,
                       coalesce(r.responsible, 'Unassigned')                    AS responsible,
                       CASE
                           WHEN r.latitude > 56.9 THEN 'Aalborg'
                           WHEN r.latitude > 56.0 THEN 'Aarhus'
                           WHEN r.longitude < 11 THEN 'Odense'
                           ELSE 'Copenhagen'
                       END                                                      AS city,
                       (r.reported_at AT TIME ZONE 'Europe/Copenhagen')::date   AS reported_date,
                       (r.resolved_at AT TIME ZONE 'Europe/Copenhagen')::date   AS resolved_date,
                       round(extract(epoch FROM r.resolved_at - r.reported_at)::numeric / 86400, 2) AS days_to_resolve,
                       round(extract(epoch FROM r.due_at - r.reported_at)::numeric / 86400, 0)      AS sla_days,
                       CASE
                           WHEN r.status = 'Resolved' THEN r.resolved_at <= r.due_at
                           WHEN r.status IN ('Open', 'InProgress') AND now() > r.due_at THEN false
                       END                                                      AS met_sla,
                       r.status IN ('Open', 'InProgress') AND now() > r.due_at  AS is_overdue,
                       r.still_there_count,
                       r.fixed_count
                FROM reports r;

                -- Roughly 250 m grid cells, for a "where do problems cluster" map.
                CREATE VIEW report_hotspots AS
                SELECT round(latitude::numeric * 400) / 400   AS cell_latitude,
                       round(longitude::numeric * 250) / 250  AS cell_longitude,
                       count(*)                               AS reports,
                       count(*) FILTER (WHERE status IN ('Open', 'InProgress')) AS active_reports,
                       mode() WITHIN GROUP (ORDER BY category) AS most_common_category
                FROM reports
                GROUP BY 1, 2;

                CREATE VIEW report_status_history AS
                SELECT s.report_id,
                       s."from"                                                AS from_status,
                       s."to"                                                  AS to_status,
                       (s.changed_at AT TIME ZONE 'Europe/Copenhagen')         AS changed_at_local,
                       r.category
                FROM status_changes s
                JOIN reports r ON r.id = s.report_id;

                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'powerbi_reader') THEN
                        CREATE ROLE powerbi_reader LOGIN PASSWORD 'powerbi';
                    END IF;
                END
                $$;

                GRANT USAGE ON SCHEMA public TO powerbi_reader;
                GRANT SELECT ON report_cases, report_hotspots, report_status_history TO powerbi_reader;
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DROP VIEW IF EXISTS report_status_history;
                DROP VIEW IF EXISTS report_hotspots;
                DROP VIEW IF EXISTS report_cases;
                """);
        }
    }
}
