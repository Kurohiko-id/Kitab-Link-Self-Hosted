import Link from "next/link";
import {
  Home,
  Link2 as Link2Icon,
  Palette,
  Globe,
  Smartphone,
  MapPin,
  Zap,
  Plug,
  Settings as SettingsIcon,
  LogOut,
  User,
  Menu,
  X,
  BarChart3,
  Layers,
  Download,
  type LucideIcon,
} from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/require-session";
import { getOrCreateDefaultPage, getPagesForUser } from "@/lib/db/pages";
import { getAllLinksForUser, getBoardData, getPublicBoardData } from "@/lib/db/board";
import {
  getCrossPageAnalytics,
  getPageAnalytics,
  getLinkClickCounts,
  type Period,
  type CrossPageAnalytics,
  type BreakdownRow,
} from "@/lib/db/analytics";
import { getApiTokensForUser, getWebhooksForUser } from "@/lib/db/integrations";
import { getScheduledRulesForPage } from "@/lib/db/automation";
import { getLiveBadgeForPage } from "@/lib/db/live-badges";
import { getThemeForPage, getThemeLibrary } from "@/lib/db/theme";
import { getDictionary, type Dictionary, type Locale } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import type { ThemeTokens } from "@/lib/theme";
import { parseProfileData } from "@/lib/profile";
import { SettingsEditor } from "./settings-editor";
import { DomainForm } from "./domain-form";
import { ProfileEditor } from "./profile-editor";
import { getSocialLinksForPage } from "./social-links-actions";
import { getAccessCodesForPage } from "@/lib/db/page-access-codes";
import { getActivityLogForPage } from "@/lib/db/activity-log";
import { getAvailableUpdate } from "@/lib/update-check";
import { CURRENT_VERSION } from "@/lib/version";
import { getDeadLinksForUser } from "@/lib/db/dead-links";
import { NotificationBell } from "./notification-bell";
import { getContentFeedsForPage } from "@/lib/db/content-feeds";
import { ContentFeedsSection } from "./content-feeds-section";
import { logout } from "../login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Board } from "./board";
import { PageSwitcher } from "./page-switcher";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { EditingPageBadge } from "@/components/editing-page-badge";
import { TokenCreator } from "./token-creator";
import { createWebhookAction, deleteWebhook, revokeApiToken, sendTestWebhookEvent } from "./integrations-actions";
import { createWeeklyScheduleRule, createYoutubeLiveRule, deleteScheduledRule } from "./automation-actions";
import { saveLiveBadgeAction, deleteLiveBadgeAction } from "./live-badge-actions";
import { ActionForm } from "@/components/action-form";
import { ThemeEditor } from "./theme-editor";
import { SectionCard } from "./section-card";
import { Badge } from "@/components/ui/badge";
import { SelectField } from "@/components/ui/select-field";
import { AnalyticsChart } from "@/components/analytics-chart";
import { OverviewLinksTable } from "./overview-links-table";
import { DashboardSearch } from "@/components/dashboard-search";
import { LocalTime } from "@/components/local-time";
import { cn } from "@/lib/utils";

const NAV_KEYS = [
  "overview",
  "analytics",
  "links",
  "profile",
  "theme",
  "domain",
  "automation",
  "integrations",
  "settings",
] as const;
type TabKey = (typeof NAV_KEYS)[number];

const NAV_ICONS: Record<TabKey, LucideIcon> = {
  overview: Home,
  analytics: BarChart3,
  links: Link2Icon,
  profile: User,
  theme: Palette,
  domain: Globe,
  automation: Zap,
  integrations: Plug,
  settings: SettingsIcon,
};

// Dua grup nav kayak referensi ("Main" polos + "TOOLS" berlabel kecil di bawahnya).
const NAV_GROUPS: { key: TabKey; group: "main" | "tools" }[] = [
  { key: "overview", group: "main" },
  { key: "links", group: "main" },
  { key: "profile", group: "main" },
  { key: "analytics", group: "main" },
  { key: "theme", group: "main" },
  { key: "domain", group: "tools" },
  { key: "automation", group: "tools" },
  { key: "integrations", group: "tools" },
  { key: "settings", group: "tools" },
];

// Sama persis dengan class Input/Select shadcn (h-8, rounded-lg, border-input, focus ring) —
// dipakai buat elemen native <select>/<input type="date"/"time"> yang gak worth diganti
// jadi komponen Radix (butuh wiring client state ekstra buat form submission via name=).
const NATIVE_FIELD_CLASS =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const CHART_PERIODS: Period[] = ["today", "week", "month", "year"];
const LINKS_PERIODS: Period[] = ["today", "week", "month"];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    tab?: string;
    chartPeriod?: string;
    linksPeriod?: string;
    openLink?: string;
  }>;
}) {
  const {
    page: pageParam,
    tab: tabParam,
    chartPeriod: chartPeriodParam,
    linksPeriod: linksPeriodParam,
    openLink: openLinkParam,
  } = await searchParams;
  const session = await requireSession();
  const locale = await getLocale();
  const t = getDictionary(locale);

  const [user, pagesList, allLinksForSearch] = await Promise.all([
    db.select().from(users).where(eq(users.id, session.userId)).limit(1).then((rows) => rows[0]),
    getPagesForUser(session.userId),
    getAllLinksForUser(session.userId),
  ]);

  const activePage =
    pagesList.find((p) => p.id === Number(pageParam)) ??
    pagesList[0] ??
    (await getOrCreateDefaultPage(session.userId));

  const rawUpdate = getAvailableUpdate();
  const availableUpdate = rawUpdate && rawUpdate.version !== user?.lastSeenAppVersion ? rawUpdate : null;
  const deadLinks = await getDeadLinksForUser(session.userId);

  const activeTab: TabKey = NAV_KEYS.includes(tabParam as TabKey) ? (tabParam as TabKey) : "overview";
  const chartPeriod: Period = CHART_PERIODS.includes(chartPeriodParam as Period) ? (chartPeriodParam as Period) : "week";
  const linksPeriod: Period = LINKS_PERIODS.includes(linksPeriodParam as Period) ? (linksPeriodParam as Period) : "today";

  const boardData =
    activeTab === "links" || activeTab === "automation" ? await getBoardData(activePage.id) : null;

  const linkClickCounts = activeTab === "links" ? await getLinkClickCounts(activePage.id) : null;
  // getBoardData SENGAJA nge-skip link displayStyle "icon" (baris sosmed, dikelola di tab
  // Profile) -- tapi preview HP di tab Links & Groups butuh nampilin baris sosmed itu juga
  // biar preview-nya beneran representatif, jadi ambil sekali lagi lewat getPublicBoardData
  // (yang nyertain SEMUA link) khusus buat di-suplai ke Board sebagai sumber baris icon.
  const linksSocialBoard = activeTab === "links" ? await getPublicBoardData(activePage.id) : null;

  const crossPageAnalytics =
    activeTab === "overview" ? await getCrossPageAnalytics(session.userId, chartPeriod, linksPeriod) : null;

  const pageAnalytics =
    activeTab === "analytics"
      ? await getPageAnalytics(activePage.id, activePage.slug, chartPeriod, linksPeriod)
      : null;

  const [apiTokens, webhookList] =
    activeTab === "integrations"
      ? await Promise.all([getApiTokensForUser(session.userId), getWebhooksForUser(session.userId)])
      : [null, null];

  const scheduledRules =
    activeTab === "automation" ? await getScheduledRulesForPage(activePage.id) : null;
  const contentFeeds =
    activeTab === "automation" ? await getContentFeedsForPage(activePage.id) : null;
  const liveBadge = activeTab === "automation" ? await getLiveBadgeForPage(activePage.id) : null;

  const themeTokens =
    activeTab === "theme" || activeTab === "links" || activeTab === "profile"
      ? await getThemeForPage(activePage.id)
      : null;
  const [themeLibrary, themePreviewBoard] =
    activeTab === "theme"
      ? await Promise.all([getThemeLibrary(session.userId), getPublicBoardData(activePage.id)])
      : [null, null];
  const profilePreviewBoard = activeTab === "profile" ? await getPublicBoardData(activePage.id) : null;
  const profileSocialLinks = activeTab === "profile" ? await getSocialLinksForPage(activePage.id) : null;
  const pageAccessCodes = activeTab === "settings" ? await getAccessCodesForPage(activePage.id) : null;
  const activityLog = activeTab === "settings" ? await getActivityLogForPage(activePage.id) : null;

  const mainNav = NAV_GROUPS.filter((n) => n.group === "main");
  const toolsNav = NAV_GROUPS.filter((n) => n.group === "tools");
  const navButtonClass = (key: TabKey) =>
    cn(
      "w-full flex items-center px-4 py-2.5 rounded-lg transition-colors",
      activeTab === key
        ? "bg-sidebar-primary text-sidebar-primary-foreground"
        : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar mobile: toggle murni CSS (checkbox + peer-checked), gak butuh client JS
          sama sekali -- konsisten sama prinsip "minim client JS" di project ini. */}
      <input type="checkbox" id="mobile-nav" className="peer sr-only" />
      <label
        htmlFor="mobile-nav"
        className="fixed inset-0 z-30 hidden bg-black/50 peer-checked:block md:hidden"
      />
      <aside className="fixed inset-y-0 left-0 z-40 flex w-64 -translate-x-full flex-col justify-between border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 peer-checked:translate-x-0 md:static md:translate-x-0 md:shrink-0 md:transition-none">
        <div>
          <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-6">
            <div className="flex items-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- logo statis kecil, bukan kandidat next/image */}
              <img src="/logo.png" alt="" className="mr-2 size-7 rounded-md" />
              <span className="text-xl font-bold tracking-tight text-sidebar-primary-foreground">Kitab Link</span>
            </div>
            <label
              htmlFor="mobile-nav"
              className="text-sidebar-foreground hover:text-sidebar-primary-foreground md:hidden"
            >
              <X className="size-5" />
            </label>
          </div>

          <nav className="mt-4 space-y-1 px-4">
            {mainNav
              .filter((n) => n.key === "overview")
              .map(({ key }) => (
                <Link key={key} href={`/dashboard?page=${activePage.id}&tab=${key}`} className={navButtonClass(key)}>
                  <Home className="mr-3 size-5" />
                  <span className="font-medium">{t.nav[key]}</span>
                </Link>
              ))}

            <PageSwitcher
              pages={pagesList.map((p) => ({ id: p.id, slug: p.slug }))}
              activePageId={activePage.id}
              activeTab={activeTab}
              t={t}
            />

            {mainNav
              .filter((n) => n.key !== "overview")
              .map(({ key }) => {
                const Icon = NAV_ICONS[key];
                return (
                  <Link key={key} href={`/dashboard?page=${activePage.id}&tab=${key}`} className={navButtonClass(key)}>
                    <Icon className="mr-3 size-5" />
                    <span className="font-medium">{t.nav[key]}</span>
                  </Link>
                );
              })}
          </nav>

          <div className="mt-4 px-4">
            <h3 className="mb-2 px-4 text-xs font-semibold tracking-wider text-sidebar-foreground/60 uppercase">
              {t.nav.toolsGroup}
            </h3>
            <nav className="space-y-1">
              {toolsNav.map(({ key }) => {
                const Icon = NAV_ICONS[key];
                return (
                  <Link key={key} href={`/dashboard?page=${activePage.id}&tab=${key}`} className={navButtonClass(key)}>
                    <Icon className="mr-3 size-5" />
                    <span className="font-medium">{t.nav[key]}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="space-y-3 border-t border-sidebar-border p-4">
          <div className="flex items-center justify-between rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-2 px-2">
            <LanguageSwitcher locale={locale} variant="sidebar" />
            <ThemeToggle variant="sidebar" />
          </div>

          <div className="flex items-center rounded-lg px-2 py-1 hover:bg-sidebar-accent">
            <div className="mr-3 flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
              {(user?.email?.[0] ?? "?").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-primary-foreground">
                {user?.email?.split("@")[0]}
              </p>
              <p className="truncate text-xs text-sidebar-foreground">{user?.email}</p>
            </div>
            <div className="flex items-center gap-2.5">
              <form action={logout}>
                <button
                  type="submit"
                  title={t.common.logout}
                  className="text-sidebar-foreground hover:text-sidebar-primary-foreground"
                >
                  <LogOut className="size-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex h-screen flex-1 flex-col overflow-hidden bg-background">
        <header className="z-10 flex h-16 flex-shrink-0 items-center justify-between gap-3 border-b bg-card px-4 md:px-8">
          <label htmlFor="mobile-nav" className="text-muted-foreground hover:text-foreground md:hidden">
            <Menu className="size-5" />
          </label>
          <DashboardSearch links={allLinksForSearch} placeholder={t.overview.searchLinks} />
          <div className="flex items-center gap-6">
            <NotificationBell release={availableUpdate} deadLinks={deadLinks} t={t} />
          </div>
        </header>

        <div className="relative flex-1 overflow-auto p-4 md:p-8">
          <div>
            {activeTab !== "overview" ? <EditingPageBadge slug={activePage.slug} label={t.board.editingPage} /> : null}

          <div key={activePage.id} className="mt-6 animate-in fade-in-0 duration-300">
            {activeTab === "overview" && crossPageAnalytics ? (
              <OverviewSection
                pageId={activePage.id}
                tabKey="overview"
                scopeNote={t.overview.allPagesNote}
                analytics={crossPageAnalytics}
                chartPeriod={chartPeriod}
                linksPeriod={linksPeriod}
                t={t}
              />
            ) : null}
            {activeTab === "analytics" && pageAnalytics ? (
              <OverviewSection
                pageId={activePage.id}
                tabKey="analytics"
                scopeNote={t.overview.pageOnlyNote}
                analytics={pageAnalytics}
                chartPeriod={chartPeriod}
                linksPeriod={linksPeriod}
                t={t}
              />
            ) : null}
            {activeTab === "links" && boardData && themeTokens && linksSocialBoard ? (
              <Board
                pageId={activePage.id}
                initialData={boardData}
                locale={locale}
                tokens={themeTokens}
                profile={parseProfileData(activePage.profileJson)}
                fallbackName={activePage.slug}
                clickCounts={linkClickCounts ?? {}}
                openLinkId={openLinkParam ? Number(openLinkParam) : null}
                socialPreviewBoard={linksSocialBoard}
              />
            ) : null}
            {activeTab === "profile" && themeTokens && profilePreviewBoard && profileSocialLinks ? (
              <ProfileEditor
                page={activePage}
                tokens={themeTokens}
                previewBoard={profilePreviewBoard}
                socialLinks={profileSocialLinks}
                t={t}
              />
            ) : null}
            {activeTab === "theme" && themeTokens && themeLibrary && themePreviewBoard ? (
              <ThemeSection
                page={activePage}
                tokens={themeTokens}
                library={themeLibrary}
                previewBoard={themePreviewBoard}
                t={t}
                locale={locale}
              />
            ) : null}
            {activeTab === "domain" ? <DomainAccessSection page={activePage} t={t} locale={locale} /> : null}
            {activeTab === "settings" && pageAccessCodes && activityLog ? (
              <SettingsEditor
                page={activePage}
                isPrimaryPage={user?.primaryPageId === activePage.id}
                accessCodes={pageAccessCodes}
                activityLog={activityLog}
                totpEnabled={user?.totpEnabled ?? false}
                totpBackupCodesRemaining={
                  user?.totpBackupCodesJson ? (JSON.parse(user.totpBackupCodesJson) as string[]).length : 0
                }
                version={CURRENT_VERSION}
                availableUpdate={availableUpdate}
                t={t}
                locale={locale}
              />
            ) : null}
            {activeTab === "integrations" && apiTokens && webhookList ? (
              <IntegrationsSection pageId={activePage.id} tokens={apiTokens} webhooks={webhookList} t={t} locale={locale} />
            ) : null}
            {activeTab === "automation" && boardData && scheduledRules && contentFeeds ? (
              <AutomationSection
                pageId={activePage.id}
                boardData={boardData}
                rules={scheduledRules}
                feeds={contentFeeds}
                liveBadge={liveBadge}
                t={t}
                locale={locale}
              />
            ) : null}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const PERIOD_LABEL_KEY: Record<Period, "periodToday" | "periodWeek" | "periodMonth" | "periodYear"> = {
  today: "periodToday",
  week: "periodWeek",
  month: "periodMonth",
  year: "periodYear",
};

function PeriodTabs({ current, options, hrefFor, t }: {
  current: Period;
  options: Period[];
  hrefFor: (period: Period) => string;
  t: Dictionary;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
      {options.map((period) => (
        <Link
          key={period}
          href={hrefFor(period)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            current === period
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t.overview[PERIOD_LABEL_KEY[period]]}
        </Link>
      ))}
    </div>
  );
}

function BreakdownCard({
  title,
  icon: Icon,
  rows,
  t,
}: {
  title: string;
  icon: LucideIcon;
  rows: BreakdownRow[];
  t: Dictionary;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold">
        <Icon className="size-4 text-primary" /> {title}
      </h3>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t.overview.noData}</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((row) => (
            <div key={row.label}>
              <div className="flex items-center justify-between text-xs">
                <span className="truncate text-muted-foreground">{row.label}</span>
                <span className="ml-2 shrink-0 font-medium">{row.count}</span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(row.count / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OverviewSection({
  pageId,
  tabKey,
  scopeNote,
  analytics,
  chartPeriod,
  linksPeriod,
  t,
}: {
  pageId: number;
  tabKey: "overview" | "analytics";
  scopeNote: string;
  analytics: CrossPageAnalytics;
  chartPeriod: Period;
  linksPeriod: Period;
  t: Dictionary;
}) {
  const overviewHref = (chart: Period, links: Period) =>
    `/dashboard?page=${pageId}&tab=${tabKey}&chartPeriod=${chart}&linksPeriod=${links}`;
  const exportHref = `/dashboard/export?scope=${tabKey === "analytics" ? "page" : "overview"}&pageId=${pageId}&chartPeriod=${chartPeriod}&linksPeriod=${linksPeriod}`;

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">{t.overview.analyticsTitle}</h1>
            <Badge variant={tabKey === "overview" ? "sky" : "neutral"}>{scopeNote}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PeriodTabs
              current={chartPeriod}
              options={CHART_PERIODS}
              hrefFor={(p) => overviewHref(p, linksPeriod)}
              t={t}
            />
            <a
              href={exportHref}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Download className="size-3.5" />
              {t.overview.exportCsv}
            </a>
          </div>
        </div>

        <div className="mt-5 flex items-baseline gap-8">
          <div>
            <div className="text-2xl font-bold">{analytics.totalViews}</div>
            <div className="text-xs text-muted-foreground">{t.overview.totalViews}</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{analytics.totalClicks}</div>
            <div className="text-xs text-muted-foreground">{t.overview.totalClicks}</div>
          </div>
        </div>

        <div className="mt-4">
          <AnalyticsChart data={analytics.chartSeries} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-card shadow-sm lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-6">
            <div>
              <h2 className="text-lg font-bold">{t.overview.yourLinks}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t.overview.yourLinksDesc}</p>
            </div>
            <PeriodTabs
              current={linksPeriod}
              options={LINKS_PERIODS}
              hrefFor={(p) => overviewHref(chartPeriod, p)}
              t={t}
            />
          </div>
          <OverviewLinksTable rows={analytics.topLinks} />
        </div>

        <div className="flex flex-col gap-6">
          {tabKey === "overview" ? (
            <BreakdownCard
              title={t.overview.topPages}
              icon={Layers}
              rows={analytics.topPages.map((p) => ({ label: `/${p.pageSlug}`, count: p.views }))}
              t={t}
            />
          ) : null}
          <BreakdownCard title={t.overview.referrers} icon={Globe} rows={analytics.referrers} t={t} />
          <BreakdownCard title={t.overview.devices} icon={Smartphone} rows={analytics.devices} t={t} />
          <BreakdownCard title={t.overview.countries} icon={MapPin} rows={analytics.countries} t={t} />
        </div>
      </div>
    </div>
  );
}

function ThemeSection({
  page,
  tokens,
  library,
  previewBoard,
  t,
  locale,
}: {
  page: { id: number; themeId: number | null; slug: string; profileJson: string };
  tokens: ThemeTokens;
  library: Awaited<ReturnType<typeof getThemeLibrary>>;
  previewBoard: Awaited<ReturnType<typeof getPublicBoardData>>;
  t: Dictionary;
  locale: Locale;
}) {
  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">{t.theme.subtitle}</p>
      <ThemeEditor
        pageId={page.id}
        activeThemeId={page.themeId}
        library={library.map((l) => ({ id: l.id, name: l.name, tokensJson: l.tokensJson, createdAt: l.createdAt }))}
        initialTokens={tokens}
        profile={parseProfileData(page.profileJson)}
        fallbackName={page.slug}
        previewBoard={previewBoard}
        t={t}
        locale={locale}
      />
    </div>
  );
}

function DomainAccessSection({
  page,
  t,
  locale,
}: {
  page: { id: number; domainType: string; domainValue: string | null; domainVerified: boolean };
  t: Dictionary;
  locale: Locale;
}) {
  return (
    <div className="flex flex-col gap-6">
      <SectionCard title={t.domain.customDomainTitle} description={t.domain.customDomainDesc}>
        <DomainForm page={page} t={t} locale={locale} />
        <h3 className="mt-5 mb-3 text-sm font-bold">{t.domain.tutorialTitle}</h3>
        <ol className="flex flex-col gap-3">
          {t.domain.tutorialSteps.map((step) => (
            <li key={step.title} className="flex gap-3 rounded-lg border bg-muted/50 p-3">
              <div>
                <p className="text-sm font-semibold">{step.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </SectionCard>
    </div>
  );
}

function IntegrationsSection({
  pageId,
  tokens,
  webhooks,
  t,
  locale,
}: {
  pageId: number;
  tokens: Awaited<ReturnType<typeof getApiTokensForUser>>;
  webhooks: Awaited<ReturnType<typeof getWebhooksForUser>>;
  t: Dictionary;
  locale: string;
}) {
  const EVENT_LABELS: Record<string, string> =
    locale === "en"
      ? {
          "subscriber.new": "New subscriber",
          "link.clicked": "Link clicked",
          "page.live_status_changed": "Live status changed",
          "test.ping": "Test (manual)",
        }
      : {
          "subscriber.new": "Subscriber baru",
          "link.clicked": "Link diklik",
          "page.live_status_changed": "Status live berubah",
          "test.ping": "Tes (manual)",
        };
  const dateLocale = locale === "en" ? "en-US" : "id-ID";

  return (
    <div className="flex flex-col gap-6">
      <SectionCard
        title={t.integrations.apiTokensTitle}
        description={
          <>
            {t.integrations.apiTokensDesc} <code>Authorization: Bearer &lt;token&gt;</code>:
          </>
        }
      >
        <div className="flex flex-col gap-2 rounded-2xl bg-foreground p-4 font-mono text-xs text-background">
          <div>
            <span className="text-background/60">GET</span> /api/v1/links?pageId={pageId}
            <div className="mt-0.5 text-background/60">{t.integrations.apiReadDesc} links:read)</div>
          </div>
          <div className="border-t border-background/10 pt-2">
            <span className="text-background/60">PATCH</span> /api/v1/links/&lt;id&gt;
            <div className="mt-0.5 text-background/60">
              {t.integrations.apiWriteDesc} {`{"active": true}`} {t.integrations.apiWriteDescSuffix} links:write){" "}
              {t.integrations.apiWriteDescStream}
            </div>
          </div>
        </div>
        <div className="mt-3">
          <TokenCreator t={t} />
        </div>
        <ul className="mt-3 flex flex-col gap-2">
          {tokens.map((token) => {
            const scopes = (JSON.parse(token.scopesJson) as string[]).filter(Boolean);
            return (
              <li key={token.id} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                <div>
                  <div className="font-medium">{token.name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {scopes.length > 0 ? (
                      scopes.map((scope) => (
                        <Badge key={scope} variant="sky">
                          {scope}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      <LocalTime date={token.createdAt} locale={dateLocale} variant="date" />
                    </span>
                  </div>
                </div>
                <form action={revokeApiToken.bind(null, token.id)}>
                  <Button type="submit" size="sm" variant="outline">
                    {t.integrations.revoke}
                  </Button>
                </form>
              </li>
            );
          })}
          {tokens.length === 0 && <li className="text-sm text-muted-foreground">{t.integrations.noTokens}</li>}
        </ul>
      </SectionCard>

      <SectionCard title={t.integrations.webhooksTitle} description={t.integrations.webhooksDesc}>
        <form
          action={createWebhookAction.bind(null, pageId, "test.ping")}
          className="flex items-end gap-2"
        >
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="targetUrl">{t.integrations.targetUrl}</Label>
            <Input id="targetUrl" name="targetUrl" placeholder="https://webhook.site/xxxx" />
          </div>
          <Button type="submit">{t.integrations.addTestWebhook}</Button>
        </form>
        <ul className="mt-3 flex flex-col gap-2">
          {webhooks.map((webhook) => (
            <li key={webhook.id} className="rounded-xl border px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{EVENT_LABELS[webhook.eventType] ?? webhook.eventType}</div>
                  <div className="truncate text-xs text-muted-foreground">{webhook.targetUrl}</div>
                </div>
                <div className="flex gap-2">
                  <form action={sendTestWebhookEvent.bind(null, webhook.id)}>
                    <Button type="submit" size="sm" variant="outline">
                      {t.integrations.sendTest}
                    </Button>
                  </form>
                  <form action={deleteWebhook.bind(null, webhook.id)}>
                    <Button type="submit" size="sm" variant="outline">
                      {t.common.delete}
                    </Button>
                  </form>
                </div>
              </div>
              {webhook.lastEventStatus ? (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <Badge variant={webhook.lastEventStatus === "sent" ? "sage" : "amber"}>
                    {webhook.lastEventStatus}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {t.integrations.lastEvent}
                    {webhook.lastEventAttempts > 0
                      ? ` — ${t.integrations.attempt} ${webhook.lastEventAttempts}`
                      : ""}
                  </span>
                </div>
              ) : null}
            </li>
          ))}
          {webhooks.length === 0 && <li className="text-sm text-muted-foreground">{t.integrations.noWebhooks}</li>}
        </ul>
      </SectionCard>
    </div>
  );
}

function TargetPicker({
  groupOptions,
  linkOptions,
  groupLabel,
  linkLabel,
}: {
  groupOptions: { value: string; label: string }[];
  linkOptions: { value: string; label: string }[];
  groupLabel: string;
  linkLabel: string;
}) {
  return (
    <SelectField name="target">
      {groupOptions.length > 0 && (
        <optgroup label={groupLabel}>
          {groupOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </optgroup>
      )}
      {linkOptions.length > 0 && (
        <optgroup label={linkLabel}>
          {linkOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </optgroup>
      )}
    </SelectField>
  );
}

function ModeSelect({ t }: { t: Dictionary }) {
  return (
    <SelectField name="mode">
      <option value="show_during">{t.automation.modeShowDuring}</option>
      <option value="hide_during">{t.automation.modeHideDuring}</option>
    </SelectField>
  );
}

const DAY_OPTIONS: { value: number; labelKey: "dayMon" | "dayTue" | "dayWed" | "dayThu" | "dayFri" | "daySat" | "daySun" }[] =
  [
    { value: 1, labelKey: "dayMon" },
    { value: 2, labelKey: "dayTue" },
    { value: 3, labelKey: "dayWed" },
    { value: 4, labelKey: "dayThu" },
    { value: 5, labelKey: "dayFri" },
    { value: 6, labelKey: "daySat" },
    { value: 0, labelKey: "daySun" },
  ];

function DaysPicker({ t }: { t: Dictionary }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {DAY_OPTIONS.map((day) => (
        <label key={day.value} className="cursor-pointer">
          <input type="checkbox" name="days" value={day.value} className="peer sr-only" />
          <span className="flex size-9 items-center justify-center rounded-lg border text-xs font-medium text-muted-foreground transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground">
            {t.automation[day.labelKey]}
          </span>
        </label>
      ))}
    </div>
  );
}

function AutomationSection({
  pageId,
  boardData,
  rules,
  feeds,
  liveBadge,
  t,
  locale,
}: {
  pageId: number;
  boardData: Awaited<ReturnType<typeof getBoardData>>;
  rules: Awaited<ReturnType<typeof getScheduledRulesForPage>>;
  feeds: Awaited<ReturnType<typeof getContentFeedsForPage>>;
  liveBadge: Awaited<ReturnType<typeof getLiveBadgeForPage>>;
  t: Dictionary;
  locale: Locale;
}) {
  const groupLabel = locale === "en" ? "Group" : "Grup";
  const linkLabel = "Link";
  const groupOptions = boardData.groups.map((g) => ({ value: `group:${g.id}`, label: `${groupLabel}: ${g.name}` }));
  const linkOptions = [...boardData.ungrouped, ...boardData.groups.flatMap((g) => g.links)].map((l) => ({
    value: `link:${l.id}`,
    label: `${linkLabel}: ${l.title}`,
  }));
  const dateLocale = locale === "en" ? "en-US" : "id-ID";
  const targetPickerProps = { groupOptions, linkOptions, groupLabel, linkLabel };

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title={t.automation.youtubeTitle}>
        <form action={createYoutubeLiveRule.bind(null, pageId)} className="flex flex-wrap items-end gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="channelUrl">{t.automation.channelUrl}</Label>
            <Input id="channelUrl" name="channelUrl" placeholder="https://youtube.com/@namachannel" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="target">{t.automation.target}</Label>
            <TargetPicker {...targetPickerProps} />
          </div>
          <Button type="submit">{t.automation.addRule}</Button>
        </form>
      </SectionCard>

      <SectionCard title={t.automation.liveBadgeTitle} description={t.automation.liveBadgeDesc}>
        <div className="flex flex-col gap-3">
          <ActionForm errorMessage={t.common.saveFailed} action={saveLiveBadgeAction.bind(null, pageId)} className="flex flex-wrap items-end gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="liveBadgeChannelUrl">{t.automation.channelUrl}</Label>
              <Input
                // key ngikut NILAI (bukan cuma id) -- remount tiap kali nilai tersimpan
                // beneran beda, biar defaultValue (uncontrolled) gak pernah "berubah di
                // node yang sama" (itu yang bikin React warning), termasuk abis save ke-2/dst.
                key={liveBadge ? `saved-${liveBadge.channelUrl}` : "new"}
                id="liveBadgeChannelUrl"
                name="channelUrl"
                placeholder="https://youtube.com/@namachannel"
                defaultValue={liveBadge?.channelUrl ?? ""}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="liveBadgeLabel">{t.automation.liveBadgeLabel}</Label>
              <Input
                key={liveBadge ? `saved-${liveBadge.label ?? ""}` : "new"}
                id="liveBadgeLabel"
                name="label"
                placeholder={t.automation.liveBadgeLabelPlaceholder}
                defaultValue={liveBadge?.label ?? ""}
              />
            </div>
            <Button type="submit">{liveBadge ? t.common.save : t.automation.addRule}</Button>
          </ActionForm>
          {liveBadge ? (
            <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
              <div className="flex flex-col gap-0.5">
                <span>
                  {t.automation.status}:{" "}
                  <span className="font-mono">
                    {liveBadge.lastCheckedAt ? (liveBadge.isLive ? "live" : "offline") : t.automation.notCheckedYet}
                  </span>
                  {liveBadge.lastCheckedAt ? (
                    <>
                      {" — "}
                      {t.automation.lastChecked} <LocalTime date={liveBadge.lastCheckedAt} locale={dateLocale} variant="time" />
                    </>
                  ) : null}
                </span>
                {liveBadge.lastLiveAt ? (
                  <span>
                    {t.automation.lastDetectedLive} <LocalTime date={liveBadge.lastLiveAt} locale={dateLocale} />
                  </span>
                ) : null}
              </div>
              <form action={deleteLiveBadgeAction.bind(null, pageId)}>
                <Button type="submit" size="sm" variant="outline">
                  {t.common.delete}
                </Button>
              </form>
            </div>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title={t.automation.weeklyTitle}>
        <form action={createWeeklyScheduleRule.bind(null, pageId)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>{t.automation.days}</Label>
            <DaysPicker t={t} />
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mode">{t.automation.mode}</Label>
              <ModeSelect t={t} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="target">{t.automation.target}</Label>
              <TargetPicker {...targetPickerProps} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="untilDate">{t.automation.untilDate}</Label>
              <input id="untilDate" name="untilDate" type="date" className={NATIVE_FIELD_CLASS} />
            </div>
            <Button type="submit">{t.automation.addRule}</Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title={t.automation.rulesTitle}>
        <ul className="flex flex-col gap-2">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className="flex items-center justify-between rounded-lg border bg-muted/50 px-3 py-2.5 text-sm"
            >
              <div>
                <div className="font-medium">
                  {rule.targetType === "group" ? groupLabel : linkLabel}: {rule.targetName}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  <RuleSummary rule={rule} t={t} />
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {t.automation.status}:{" "}
                  <span className="font-mono">{rule.lastState ?? t.automation.notCheckedYet}</span>
                  {rule.lastCheckedAt ? (
                    <>
                      {" — "}
                      {t.automation.lastChecked} <LocalTime date={rule.lastCheckedAt} locale={dateLocale} variant="time" />
                    </>
                  ) : null}
                </div>
                {rule.lastTriggeredAt ? (
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {t.automation.lastTriggered} <LocalTime date={rule.lastTriggeredAt} locale={dateLocale} />
                  </div>
                ) : null}
              </div>
              <form action={deleteScheduledRule.bind(null, pageId, rule.id)}>
                <Button type="submit" size="sm" variant="outline">
                  {t.common.delete}
                </Button>
              </form>
            </li>
          ))}
          {rules.length === 0 && <li className="text-sm text-muted-foreground">{t.automation.noRules}</li>}
        </ul>
      </SectionCard>

      <SectionCard title={t.automation.feedsTitle} description={t.automation.feedsDesc}>
        <ContentFeedsSection
          pageId={pageId}
          feeds={feeds}
          groupOptions={boardData.groups.map((g) => ({ id: g.id, name: g.name }))}
          t={t}
          locale={locale}
        />
      </SectionCard>
    </div>
  );
}

function RuleSummary({
  rule,
  t,
}: {
  rule: Awaited<ReturnType<typeof getScheduledRulesForPage>>[number];
  t: Dictionary;
}) {
  if (rule.triggerType === "youtube_live") {
    const config = JSON.parse(rule.configJson) as { channelUrl?: string };
    return <span className="truncate">{config.channelUrl}</span>;
  }
  if (rule.triggerType === "weekly_schedule") {
    const config = JSON.parse(rule.configJson) as { days: number[]; mode: string; untilDate: string | null };
    const modeLabel = config.mode === "hide_during" ? t.automation.modeHideDuring : t.automation.modeShowDuring;
    const dayLabels = DAY_OPTIONS.filter((d) => config.days.includes(d.value)).map((d) => t.automation[d.labelKey]);
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        {dayLabels.join(", ")}
        <Badge variant={config.mode === "hide_during" ? "amber" : "sage"}>{modeLabel}</Badge>
        {config.untilDate ? (
          <span>
            {t.automation.untilDate}: {config.untilDate.slice(0, 10)}
          </span>
        ) : null}
      </span>
    );
  }
  return null;
}
