"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { Badge } from "@/components/ui/badge";
import type { Dictionary, Locale } from "@/lib/i18n";
import { createContentFeedAction, deleteContentFeedAction, toggleContentFeedAction } from "./content-feed-actions";
import type { getContentFeedsForPage } from "@/lib/db/content-feeds";
import { LocalTime } from "@/components/local-time";

type ContentFeed = Awaited<ReturnType<typeof getContentFeedsForPage>>[number];

function ContentFeedCreator({
  pageId,
  groupOptions,
  t,
}: {
  pageId: number;
  groupOptions: { id: number; name: string }[];
  t: Dictionary;
}) {
  const router = useRouter();
  const [feedUrl, setFeedUrl] = useState("");
  const [richPreview, setRichPreview] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleCreate(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await createContentFeedAction(pageId, undefined, formData);
    setPending(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setFeedUrl("");
    router.refresh();
  }

  if (groupOptions.length === 0) {
    return <p className="text-sm text-muted-foreground">{t.automation.feedsNeedGroup}</p>;
  }

  return (
    <form action={handleCreate} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="feedUrl">{t.automation.feedUrlLabel}</Label>
        <Input
          id="feedUrl"
          name="feedUrl"
          placeholder="https://www.youtube.com/feeds/videos.xml?channel_id=..."
          value={feedUrl}
          onChange={(e) => setFeedUrl(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="groupId">{t.automation.feedTargetGroup}</Label>
          <SelectField id="groupId" name="groupId">
            {groupOptions.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </SelectField>
        </div>
        <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm">
          <input
            type="checkbox"
            name="richPreview"
            value="1"
            checked={richPreview}
            onChange={(e) => setRichPreview(e.target.checked)}
            className="size-4 rounded accent-primary"
          />
          {t.automation.feedRichPreview}
        </label>
        <Button type="submit" disabled={pending || !feedUrl.trim()}>
          {pending ? t.common.saving : t.automation.addRule}
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}

function ContentFeedList({ pageId, feeds, t, locale }: { pageId: number; feeds: ContentFeed[]; t: Dictionary; locale: Locale }) {
  const router = useRouter();
  const dateLocale = locale === "en" ? "en-US" : "id-ID";

  async function handleToggle(feedId: number, isActive: boolean) {
    await toggleContentFeedAction(pageId, feedId, isActive);
    router.refresh();
  }

  async function handleDelete(feedId: number) {
    await deleteContentFeedAction(pageId, feedId);
    router.refresh();
  }

  if (feeds.length === 0) {
    return <p className="text-sm text-muted-foreground">{t.automation.feedsEmpty}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {feeds.map((feed) => (
        <li key={feed.id} className="flex items-center justify-between gap-3 rounded-lg border bg-muted/50 px-3 py-2.5 text-sm">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="truncate">{feed.label || feed.feedUrl}</span>
              {feed.isActive ? (
                <Badge variant="sage">{t.automation.feedActive}</Badge>
              ) : (
                <Badge variant="neutral">{t.automation.feedPaused}</Badge>
              )}
              <Badge variant="sky">{feed.richPreview ? t.automation.feedRichPreview : t.automation.feedPlain}</Badge>
            </div>
            <div className="mt-0.5 truncate text-xs text-muted-foreground">
              {t.automation.feedTargetGroup}: {feed.groupName}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {feed.lastCheckedAt ? (
                <>
                  {t.automation.lastChecked} <LocalTime date={feed.lastCheckedAt} locale={dateLocale} />
                </>
              ) : (
                t.automation.notCheckedYet
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => handleToggle(feed.id, !feed.isActive)}>
              {feed.isActive ? t.automation.feedPause : t.automation.feedResume}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => handleDelete(feed.id)}>
              {t.common.delete}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ContentFeedsSection({
  pageId,
  feeds,
  groupOptions,
  t,
  locale,
}: {
  pageId: number;
  feeds: ContentFeed[];
  groupOptions: { id: number; name: string }[];
  t: Dictionary;
  locale: Locale;
}) {
  return (
    <div className="flex flex-col gap-4">
      <ContentFeedCreator pageId={pageId} groupOptions={groupOptions} t={t} />
      <ContentFeedList pageId={pageId} feeds={feeds} t={t} locale={locale} />
    </div>
  );
}
