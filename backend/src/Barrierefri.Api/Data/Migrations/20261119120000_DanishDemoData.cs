using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Barrierefri.Api.Data.Migrations
{
    /// <summary>
    /// The demo reports are written by Danish users, so their titles, places and the
    /// staff notes should be in Danish. They are user content, so they don't follow
    /// the language switch. Only rows that still have the original demo wording are
    /// touched; the schema is unchanged.
    /// </summary>
    [DbContext(typeof(AppDbContext))]
    [Migration("20261119120000_DanishDemoData")]
    public partial class DanishDemoData : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE reports r SET title = v.da
                FROM (VALUES
                    ('Lift to platforms 1 and 2 is out of order', 'Elevatoren til spor 1 og 2 virker ikke'),
                    ('Metro lift on the Magasin side not working', 'Metroelevatoren ved Magasin virker ikke'),
                    ('No audio signal at the crossing towards Tivoli', 'Intet lydsignal ved fodgængerfeltet mod Tivoli'),
                    ('Café tables placed on the tactile paving', 'Caféborde står på ledelinjerne'),
                    ('No lowered curb from Nyhavn to the square', 'Ingen nedsænket kantsten fra Nyhavn til pladsen'),
                    ('Lift between street and metro broken again', 'Elevatoren mellem gaden og metroen er i stykker igen'),
                    ('E-scooters parked across the harbour path', 'El-løbehjul parkeret på tværs af havnestien'),
                    ('Pharmacy entrance has three steps and no ramp', 'Tre trin op til apoteket og ingen rampe'),
                    ('Kerb at the bus stop is too high for a wheelchair', 'Kantstenen ved busstoppestedet er for høj til en kørestol'),
                    ('Audio signal only works on one side', 'Lydsignalet virker kun i den ene side'),
                    ('Park gate only reachable over gravel and steps', 'Indgangen til parken kan kun nås over grus og trin'),
                    ('Lift to the coastline platforms out of order', 'Elevatoren til Kystbanens perroner virker ikke'),
                    ('No step-free way to platform 3', 'Ingen trinfri adgang til spor 3'),
                    ('Beach ramp covered in sand', 'Rampen ned til stranden er dækket af sand'),
                    ('Metro lift stuck between floors', 'Metroelevatoren sidder fast mellem to etager'),
                    ('Roadworks fence blocks the bus stop', 'Hegn fra vejarbejde spærrer busstoppestedet'),
                    ('Library side door is locked, main door has steps', 'Bibliotekets sidedør er låst, og der er trin ved hoveddøren'),
                    ('Lift to platforms 1-4 out of service', 'Elevatoren til spor 1-4 er ude af drift'),
                    ('No audio signal at Park Allé crossing', 'Intet lydsignal ved fodgængerfeltet på Park Allé'),
                    ('Bikes parked on the tactile route to the entrance', 'Cykler holder på ledelinjen hen til indgangen'),
                    ('High curbs and cobblestones, no level route', 'Høje kantsten og brosten og ingen jævn vej igennem'),
                    ('Shop entrance has a single high step', 'Ét højt trin ved butikkens indgang'),
                    ('Platform lift out of order', 'Elevatoren til perronen virker ikke'),
                    ('Town hall square has no ramp to the main door', 'Ingen rampe fra pladsen op til rådhusets hoveddør'),
                    ('Path flooded and impassable', 'Stien er oversvømmet og ufremkommelig'),
                    ('Lift to platform 2 not working', 'Elevatoren til spor 2 virker ikke'),
                    ('No lowered curb at the end of the street', 'Ingen nedsænket kantsten for enden af gaden'),
                    ('Lift out of order', 'Elevator ude af drift'),
                    ('Pavement blocked', 'Fortovet er spærret'),
                    ('Crossing without audio signal', 'Fodgængerfelt uden lydsignal'),
                    ('Entrance only reachable by steps', 'Indgangen kan kun nås ad trin'),
                    ('Curb too high to cross', 'Kantstenen er for høj at komme over'),
                    ('No ramp', 'Ingen rampe'),
                    ('Access blocked', 'Adgangen er spærret')
                ) AS v (en, da)
                WHERE r.title = v.en;

                UPDATE reports r SET location_hint = v.da
                FROM (VALUES
                    ('Nørreport Station, Frederiksborggade side', 'Nørreport Station, ved Frederiksborggade'),
                    ('Islands Brygge, near the harbour bath', 'Islands Brygge, ved havnebadet'),
                    ('Frederiksberg Allé, bus stop', 'Frederiksberg Allé, ved busstoppestedet'),
                    ('Fælledparken, Øster Allé entrance', 'Fælledparken, indgangen fra Øster Allé'),
                    ('Tagensvej, Bispebjerg Hospital stop', 'Tagensvej, stoppestedet ved Bispebjerg Hospital'),
                    ('Aarhus H, main hall', 'Aarhus H, hovedhallen'),
                    ('Kongens Nytorv Metro', 'Kongens Nytorv Station'),
                    ('DR Byen Metro', 'DR Byen Station')
                ) AS v (en, da)
                WHERE r.location_hint = v.en;

                UPDATE status_changes
                SET note = replace(replace(note, 'Passed on to ', 'Sendt videre til '), 'the owner', 'ejeren')
                WHERE note LIKE 'Passed on to %';

                UPDATE status_changes SET note = 'Repareret og tjekket på stedet.'
                WHERE note = 'Repaired and checked on site.';

                UPDATE status_changes
                SET note = 'Sidedøren er åben, når der er personale. En rampe ved hoveddøren er planlagt til næste år.'
                WHERE note = 'The side door is open during staffed hours; a ramp at the main door is planned for next year.';
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Wording only. Going back keeps the Danish text, which is harmless.
        }
    }
}
