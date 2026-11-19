using Barrierefri.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Barrierefri.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Report> Reports => Set<Report>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<Report>(report =>
        {
            report.ToTable("reports");
            report.Property(r => r.Category).HasConversion<string>().HasMaxLength(30);
            report.Property(r => r.Status).HasConversion<string>().HasMaxLength(20);
            report.Property(r => r.Title).HasMaxLength(100);
            report.Property(r => r.Description).HasMaxLength(1000);
            report.Property(r => r.LocationHint).HasMaxLength(200);
            report.Property(r => r.ReportedBy).HasMaxLength(64);
            report.Property(r => r.Responsible).HasMaxLength(100);
            report.Property(r => r.PhotoBlobName).HasMaxLength(200);

            // Map queries start with a lat/lng box, so index both columns together.
            report.HasIndex(r => new { r.Latitude, r.Longitude });
            report.HasIndex(r => new { r.Status, r.DueAt });
            report.HasIndex(r => r.ReportedBy);

            report.HasMany(r => r.History).WithOne().HasForeignKey(h => h.ReportId).OnDelete(DeleteBehavior.Cascade);
            report.HasMany(r => r.Votes).WithOne().HasForeignKey(v => v.ReportId).OnDelete(DeleteBehavior.Cascade);
            report.Navigation(r => r.History).UsePropertyAccessMode(PropertyAccessMode.Field);
            report.Navigation(r => r.Votes).UsePropertyAccessMode(PropertyAccessMode.Field);

            report.Ignore(r => r.IsActive);
            report.Ignore(r => r.Confidence);
            report.Ignore(r => r.LikelyFixed);

            report.ToTable(t =>
            {
                t.HasCheckConstraint("ck_reports_latitude", "latitude BETWEEN -90 AND 90");
                t.HasCheckConstraint("ck_reports_longitude", "longitude BETWEEN -180 AND 180");
            });
        });

        model.Entity<StatusChange>(change =>
        {
            change.ToTable("status_changes");
            change.Property(c => c.From).HasConversion<string>().HasMaxLength(20);
            change.Property(c => c.To).HasConversion<string>().HasMaxLength(20);
            change.Property(c => c.Note).HasMaxLength(500);
            change.Property(c => c.ChangedBy).HasMaxLength(64);
        });

        model.Entity<Vote>(vote =>
        {
            vote.ToTable("votes");
            vote.Property(v => v.Kind).HasConversion<string>().HasMaxLength(20);
            vote.Property(v => v.UserId).HasMaxLength(64);
            vote.HasIndex(v => new { v.ReportId, v.UserId }).IsUnique();
        });
    }
}
