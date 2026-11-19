using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Barrierefri.Api.Data.Migrations
{
    /// <summary>
    /// Demo content so the map, the case queue and the Power BI report aren't empty on
    /// a fresh install. The places are real, the reports are made up. The user ids
    /// match the demo users in keycloak/barrierefri-realm.json.
    /// </summary>
    public partial class DemoData : Migration
    {
        private const string Maja = "6a1f3c2e-8b4d-4e7a-9c15-3d2e1f0a7b01";
        private const string Lars = "2c9e7b5a-4f3d-4a1b-8e6c-7d5f3a2b1c02";

        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Current reports: a mix of fresh, in progress, overdue and recently fixed.
            migrationBuilder.Sql($"""
                CREATE TEMP TABLE demo_place (
                    title text, category text, lat double precision, lng double precision, hint text,
                    responsible text, days_ago int, status text, reporter text, still_there int, fixed int
                ) ON COMMIT DROP;

                INSERT INTO demo_place VALUES
                ('Lift to platforms 1 and 2 is out of order', 'BrokenElevator', 55.68330, 12.57160, 'Nørreport Station, Frederiksborggade side', 'DSB', 1, 'Open', '{Maja}', 4, 0),
                ('Metro lift on the Magasin side not working', 'BrokenElevator', 55.67950, 12.58520, 'Kongens Nytorv Metro', 'Metroselskabet', 4, 'InProgress', '{Lars}', 6, 1),
                ('No audio signal at the crossing towards Tivoli', 'MissingAudioSignal', 55.67590, 12.56870, 'Rådhuspladsen / H.C. Andersens Boulevard', 'Københavns Kommune', 12, 'Open', '{Maja}', 3, 0),
                ('Café tables placed on the tactile paving', 'BlockedSidewalk', 55.67860, 12.57900, 'Amagertorv, Strøget', 'Københavns Kommune', 2, 'Open', '{Lars}', 2, 0),
                ('No lowered curb from Nyhavn to the square', 'SteepCurb', 55.67980, 12.59110, 'Nyhavn 1', 'Københavns Kommune', 40, 'InProgress', '{Maja}', 5, 0),
                ('Lift between street and metro broken again', 'BrokenElevator', 55.67220, 12.59130, 'Christianshavn Station', 'Metroselskabet', 6, 'Open', '{Lars}', 2, 4),
                ('E-scooters parked across the harbour path', 'BlockedSidewalk', 55.66380, 12.57760, 'Islands Brygge, near the harbour bath', 'Københavns Kommune', 1, 'Open', '{Maja}', 1, 0),
                ('Pharmacy entrance has three steps and no ramp', 'InaccessibleEntrance', 55.67270, 12.55600, 'Vesterbrogade 95', NULL, 20, 'Open', '{Lars}', 2, 0),
                ('Kerb at the bus stop is too high for a wheelchair', 'SteepCurb', 55.67470, 12.54200, 'Frederiksberg Allé, bus stop', 'Frederiksberg Kommune', 15, 'Open', '{Maja}', 1, 0),
                ('Audio signal only works on one side', 'MissingAudioSignal', 55.68960, 12.55830, 'Nørrebrogade / Elmegade', 'Københavns Kommune', 9, 'InProgress', '{Lars}', 3, 0),
                ('Park gate only reachable over gravel and steps', 'MissingRamp', 55.69950, 12.57130, 'Fælledparken, Øster Allé entrance', 'Københavns Kommune', 75, 'Open', '{Maja}', 7, 0),
                ('Lift to the coastline platforms out of order', 'BrokenElevator', 55.69270, 12.58700, 'Østerport Station', 'DSB', 0, 'Open', '{Lars}', 0, 0),
                ('No step-free way to platform 3', 'MissingRamp', 55.66300, 12.51600, 'Valby Station', 'DSB', 120, 'Open', '{Maja}', 9, 0),
                ('Beach ramp covered in sand', 'Other', 55.65750, 12.63700, 'Amager Strandpark, station 2', 'Københavns Kommune', 3, 'Resolved', '{Lars}', 0, 3),
                ('Metro lift stuck between floors', 'BrokenElevator', 55.65600, 12.58900, 'DR Byen Metro', 'Metroselskabet', 8, 'Resolved', '{Maja}', 0, 2),
                ('Roadworks fence blocks the bus stop', 'BlockedSidewalk', 55.71300, 12.54400, 'Tagensvej, Bispebjerg Hospital stop', 'Københavns Kommune', 5, 'Open', '{Lars}', 2, 0),
                ('Library side door is locked, main door has steps', 'InaccessibleEntrance', 55.68300, 12.57400, 'Kultorvet', 'Københavns Kommune', 30, 'Rejected', '{Maja}', 0, 0),
                ('Lift to platforms 1-4 out of service', 'BrokenElevator', 56.15000, 10.20400, 'Aarhus H, main hall', 'DSB', 3, 'Open', '{Lars}', 3, 0),
                ('No audio signal at Park Allé crossing', 'MissingAudioSignal', 56.15300, 10.20300, 'Aarhus Rådhus', 'Aarhus Kommune', 18, 'Open', '{Maja}', 2, 0),
                ('Bikes parked on the tactile route to the entrance', 'BlockedSidewalk', 56.15300, 10.21400, 'Dokk1, Hack Kampmanns Plads', 'Aarhus Kommune', 2, 'InProgress', '{Lars}', 1, 0),
                ('High curbs and cobblestones, no level route', 'SteepCurb', 56.15900, 10.21000, 'Latinerkvarteret, Mejlgade', 'Aarhus Kommune', 60, 'Open', '{Maja}', 4, 0),
                ('Shop entrance has a single high step', 'InaccessibleEntrance', 56.14900, 10.20100, 'Frederiks Allé', NULL, 11, 'Open', '{Lars}', 1, 0),
                ('Platform lift out of order', 'BrokenElevator', 55.40200, 10.38700, 'Odense Station', 'DSB', 5, 'Open', '{Maja}', 2, 0),
                ('Town hall square has no ramp to the main door', 'MissingRamp', 55.39600, 10.38800, 'Flakhaven, Odense', 'Odense Kommune', 95, 'InProgress', '{Lars}', 3, 0),
                ('Path flooded and impassable', 'BlockedSidewalk', 55.40000, 10.38300, 'Kongens Have, Odense', 'Odense Kommune', 1, 'Open', '{Maja}', 1, 0),
                ('Lift to platform 2 not working', 'BrokenElevator', 57.04300, 9.91700, 'Aalborg Station', 'DSB', 2, 'Open', '{Lars}', 1, 0),
                ('No lowered curb at the end of the street', 'SteepCurb', 57.05000, 9.92000, 'Jomfru Ane Gade, Aalborg', 'Aalborg Kommune', 25, 'Open', '{Maja}', 0, 0);

                INSERT INTO reports (category, title, latitude, longitude, location_hint, responsible, status,
                                     reported_by, reported_at, due_at, resolved_at, still_there_count, fixed_count)
                SELECT p.category, p.title, p.lat, p.lng, p.hint, p.responsible, p.status, p.reporter,
                       now() - make_interval(days => p.days_ago, hours => 3),
                       now() - make_interval(days => p.days_ago, hours => 3) + sla.target,
                       CASE WHEN p.status = 'Resolved' THEN now() - interval '6 hours' END,
                       CASE WHEN p.status IN ('Open', 'InProgress') THEN p.still_there ELSE 0 END,
                       CASE WHEN p.status IN ('Open', 'InProgress') THEN p.fixed ELSE 0 END
                FROM demo_place p
                JOIN (VALUES ('BrokenElevator', interval '2 days'), ('BlockedSidewalk', interval '3 days'),
                             ('MissingAudioSignal', interval '7 days'), ('Other', interval '30 days'),
                             ('InaccessibleEntrance', interval '60 days'), ('SteepCurb', interval '90 days'),
                             ('MissingRamp', interval '90 days')) AS sla (category, target)
                  ON sla.category = p.category;

                -- Votes behind the counters above, from anonymous demo voters.
                INSERT INTO votes (report_id, user_id, kind, cast_at)
                SELECT r.id, 'demo-voter-' || n, 'StillThere', r.reported_at + make_interval(hours => n * 5)
                FROM reports r, generate_series(1, r.still_there_count) AS n;

                INSERT INTO votes (report_id, user_id, kind, cast_at)
                SELECT r.id, 'demo-fixer-' || n, 'Fixed', r.reported_at + make_interval(hours => n * 7)
                FROM reports r, generate_series(1, r.fixed_count) AS n;

                INSERT INTO status_changes (report_id, "from", "to", note, changed_by, changed_at)
                SELECT id, 'Open', 'InProgress', 'Passed on to ' || coalesce(responsible, 'the owner') || '.',
                       'sara', reported_at + interval '1 day'
                FROM reports WHERE status = 'InProgress';

                INSERT INTO status_changes (report_id, "from", "to", note, changed_by, changed_at)
                SELECT id, 'Open', 'Resolved', 'Repaired and checked on site.', 'sara', resolved_at
                FROM reports WHERE status = 'Resolved';

                INSERT INTO status_changes (report_id, "from", "to", note, changed_by, changed_at)
                SELECT id, 'Open', 'Rejected',
                       'The side door is open during staffed hours; a ramp at the main door is planned for next year.',
                       'sara', reported_at + interval '2 days'
                FROM reports WHERE status = 'Rejected';
                """);

            // A year of closed cases near the same places, so trends and SLA numbers in
            // the report mean something. Resolution times vary by category, and some
            // categories miss their target far more often than others, as in real life.
            migrationBuilder.Sql($"""
                WITH seeds AS (
                    SELECT r.id AS seed_id, r.category, r.latitude, r.longitude, r.location_hint, r.responsible,
                           n,
                           (hashtext(r.id::text || '-' || n)::bigint & 1023) / 1023.0 AS u1,
                           (hashtext(n::text || '-' || r.id)::bigint & 1023) / 1023.0 AS u2
                    FROM reports r, generate_series(1, 6) AS n
                    WHERE r.status <> 'Rejected'
                ),
                shaped AS (
                    SELECT s.*,
                           now() - make_interval(days => 20 + (u1 * 340)::int) AS reported_at,
                           CASE s.category
                               WHEN 'BrokenElevator' THEN 0.5 + u2 * 5
                               WHEN 'BlockedSidewalk' THEN 0.5 + u2 * 6
                               WHEN 'MissingAudioSignal' THEN 2 + u2 * 14
                               WHEN 'Other' THEN 3 + u2 * 40
                               ELSE 20 + u2 * 160
                           END AS days_to_fix
                    FROM seeds s
                ),
                inserted AS (
                INSERT INTO reports (category, title, latitude, longitude, location_hint, responsible, status,
                                     reported_by, reported_at, due_at, resolved_at, still_there_count, fixed_count)
                SELECT category,
                       CASE category
                           WHEN 'BrokenElevator' THEN 'Lift out of order'
                           WHEN 'BlockedSidewalk' THEN 'Pavement blocked'
                           WHEN 'MissingAudioSignal' THEN 'Crossing without audio signal'
                           WHEN 'InaccessibleEntrance' THEN 'Entrance only reachable by steps'
                           WHEN 'SteepCurb' THEN 'Curb too high to cross'
                           WHEN 'MissingRamp' THEN 'No ramp'
                           ELSE 'Access blocked' END,
                       latitude + (u2 - 0.5) * 0.004,
                       longitude + (u1 - 0.5) * 0.006,
                       location_hint,
                       responsible,
                       'Resolved',
                       CASE WHEN n % 2 = 0 THEN '{Maja}' ELSE '{Lars}' END,
                       reported_at,
                       reported_at + CASE category
                           WHEN 'BrokenElevator' THEN interval '2 days'
                           WHEN 'BlockedSidewalk' THEN interval '3 days'
                           WHEN 'MissingAudioSignal' THEN interval '7 days'
                           WHEN 'Other' THEN interval '30 days'
                           WHEN 'InaccessibleEntrance' THEN interval '60 days'
                           ELSE interval '90 days' END,
                       least(now() - interval '1 day', reported_at + make_interval(secs => days_to_fix * 86400)),
                       0,
                       0
                FROM shaped
                RETURNING id, resolved_at
                )
                INSERT INTO status_changes (report_id, "from", "to", note, changed_by, changed_at)
                SELECT id, 'Open', 'Resolved', NULL, 'sara', resolved_at
                FROM inserted;
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DELETE FROM reports
                WHERE reported_by IN ('6a1f3c2e-8b4d-4e7a-9c15-3d2e1f0a7b01', '2c9e7b5a-4f3d-4a1b-8e6c-7d5f3a2b1c02');
                """);
        }
    }
}
