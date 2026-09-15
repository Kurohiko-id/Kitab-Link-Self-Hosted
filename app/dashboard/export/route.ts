import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { requireOwnedPage } from "@/lib/db/pages";
import { getCrossPageAnalytics, getPageAnalytics, type Period } from "@/lib/db/analytics";
import { buildAnalyticsCsv } from "@/lib/analytics-export";

const VALID_PERIODS: Period[] = ["today", "week", "month", "year"];

function parsePeriod(value: string | null, fallback: Period): Period {
  return VALID_PERIODS.includes(value as Period) ? (value as Period) : fallback;
}

// Dipanggil langsung sebagai href <a> biasa dari dashboard (bukan fetch+blob) --
// Content-Disposition: attachment udah cukup bikin browser download tanpa client JS.
export async function GET(req: NextRequest) {
  const session = await requireSession();
  const { searchParams } = req.nextUrl;
  const scope = searchParams.get("scope") === "page" ? "page" : "overview";
  const chartPeriod = parsePeriod(searchParams.get("chartPeriod"), "week");
  const linksPeriod = parsePeriod(searchParams.get("linksPeriod"), "today");

  let analytics;
  let scopeLabel: string;
  if (scope === "page") {
    const pageId = Number(searchParams.get("pageId"));
    if (!Number.isFinite(pageId)) return new NextResponse("Bad request", { status: 400 });
    const page = await requireOwnedPage(pageId);
    analytics = await getPageAnalytics(page.id, page.slug, chartPeriod, linksPeriod);
    scopeLabel = `/${page.slug}`;
  } else {
    analytics = await getCrossPageAnalytics(session.userId, chartPeriod, linksPeriod);
    scopeLabel = "all pages";
  }

  const csv = buildAnalyticsCsv(analytics, scopeLabel);
  const filename = `kitab-link-analytics-${scope}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
