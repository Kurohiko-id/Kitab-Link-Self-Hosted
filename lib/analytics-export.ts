import type { CrossPageAnalytics } from "@/lib/db/analytics";

// RFC 4180-ish: quote field kalau ada koma/quote/newline, quote internal di-double.
function csvField(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvRow(fields: (string | number)[]): string {
  return fields.map(csvField).join(",") + "\n";
}

// Beberapa "tabel" digabung jadi 1 file (dipisah baris kosong + judul section) --
// simpel dibuka di Excel/Sheets tanpa perlu bikin banyak file/zip buat kasus kecil ini.
export function buildAnalyticsCsv(analytics: CrossPageAnalytics, scopeLabel: string): string {
  let csv = `Kitab Link - Analytics Export (${scopeLabel})\n\n`;

  csv += "Summary\n";
  csv += csvRow(["Metric", "Value"]);
  csv += csvRow(["Total Views", analytics.totalViews]);
  csv += csvRow(["Total Clicks", analytics.totalClicks]);
  csv += "\n";

  csv += "Time Series\n";
  csv += csvRow(["Period", "Views", "Clicks"]);
  for (const point of analytics.chartSeries) csv += csvRow([point.label, point.views, point.clicks]);
  csv += "\n";

  csv += "Top Links\n";
  csv += csvRow(["Title", "Page", "Clicks"]);
  for (const link of analytics.topLinks) csv += csvRow([link.title, `/${link.pageSlug}`, link.clicks]);
  csv += "\n";

  if (analytics.topPages.length > 0) {
    csv += "Top Pages\n";
    csv += csvRow(["Page", "Views", "Clicks"]);
    for (const page of analytics.topPages) csv += csvRow([`/${page.pageSlug}`, page.views, page.clicks]);
    csv += "\n";
  }

  csv += "Referrers\n";
  csv += csvRow(["Referrer", "Views"]);
  for (const row of analytics.referrers) csv += csvRow([row.label, row.count]);
  csv += "\n";

  csv += "Devices\n";
  csv += csvRow(["Device", "Views"]);
  for (const row of analytics.devices) csv += csvRow([row.label, row.count]);
  csv += "\n";

  csv += "Countries\n";
  csv += csvRow(["Country", "Views"]);
  for (const row of analytics.countries) csv += csvRow([row.label, row.count]);

  return csv;
}
