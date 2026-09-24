"use client";

import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { Dictionary, Locale } from "@/lib/i18n";

type Draft = { year: number; month: number; day: number; hour: number; minute: number };

const pad = (n: number) => String(n).padStart(2, "0");

// "YYYY-MM-DDTHH:mm" -- format yang sama persis kayak <input type="datetime-local"> biar
// caller (link-form-modal.tsx) gak perlu ganti cara nyimpen/konversi ke ISO-nya sama sekali.
function parseValue(value: string): Draft | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match;
  return { year: Number(y), month: Number(mo) - 1, day: Number(d), hour: Number(h), minute: Number(mi) };
}
function draftToValue(draft: Draft): string {
  return `${draft.year}-${pad(draft.month + 1)}-${pad(draft.day)}T${pad(draft.hour)}:${pad(draft.minute)}`;
}
function draftFromNow(): Draft {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate(), hour: now.getHours(), minute: now.getMinutes() };
}
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}
function clampDay(year: number, month: number, day: number): number {
  return Math.min(day, daysInMonth(year, month));
}
function shiftMonth(draft: Draft, delta: number): Draft {
  let month = draft.month + delta;
  let year = draft.year;
  if (month < 0) {
    month = 11;
    year -= 1;
  } else if (month > 11) {
    month = 0;
    year += 1;
  }
  return { ...draft, year, month, day: clampDay(year, month, draft.day) };
}

type CalendarCell = { day: number; offset: -1 | 0 | 1 };

function buildCalendarCells(year: number, month: number): CalendarCell[] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysThisMonth = daysInMonth(year, month);
  const daysPrevMonth = new Date(year, month, 0).getDate();
  const cells: CalendarCell[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({ day: daysPrevMonth - firstWeekday + 1 + i, offset: -1 });
  for (let d = 1; d <= daysThisMonth; d++) cells.push({ day: d, offset: 0 });
  let next = 1;
  while (cells.length % 7 !== 0) cells.push({ day: next++, offset: 1 });
  return cells;
}

function to12Hour(hour24: number): { hour12: number; period: "AM" | "PM" } {
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return { hour12, period };
}
function from12Hour(hour12: number, period: "AM" | "PM"): number {
  const base = hour12 % 12;
  return period === "PM" ? base + 12 : base;
}

// Jan 1 2023 = hari Minggu -- referensi tetap buat ngambil label Sun..Sat/Min..Sab
// terlokalisir (Intl, bukan array hardcode) tanpa gantung ke tanggal hari ini.
const WEEKDAY_REFERENCE = new Date(2023, 0, 1);

// Ganti native <input type="datetime-local"> yang picker bawaan browsernya gak konsisten
// sama desain dashboard (lihat NATIVE_FIELD_CLASS di link-form-modal.tsx) -- kalender +
// jam custom di dalam Dialog yang sama dipakai form lain di app ini, ngikutin pola
// draft-lalu-Simpan (bukan langsung nulis ke value tiap klik) biar "Batal" beneran buang
// perubahan yang belum di-apply.
export function DateTimePicker({
  id,
  value,
  onChange,
  locale,
  t,
  required,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  locale: Locale;
  t: Dictionary;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => parseValue(value) ?? draftFromNow());
  const [is24h, setIs24h] = useState(false);

  function openPicker() {
    setDraft(parseValue(value) ?? draftFromNow());
    setOpen(true);
  }

  const intlLocale = locale === "id" ? "id-ID" : "en-US";
  const monthLabel = new Intl.DateTimeFormat(intlLocale, { month: "long" }).format(new Date(draft.year, draft.month, 1));
  const weekdayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(WEEKDAY_REFERENCE);
    d.setDate(d.getDate() + i);
    return new Intl.DateTimeFormat(intlLocale, { weekday: "short" }).format(d);
  });
  const cells = buildCalendarCells(draft.year, draft.month);
  const today = new Date();

  const displayLabel = (() => {
    const parsed = parseValue(value);
    if (!parsed) return null;
    return new Intl.DateTimeFormat(intlLocale, { dateStyle: "medium", timeStyle: "short" }).format(
      new Date(parsed.year, parsed.month, parsed.day, parsed.hour, parsed.minute),
    );
  })();

  function handleSave() {
    onChange(draftToValue(draft));
    setOpen(false);
  }

  const { hour12, period } = to12Hour(draft.hour);

  return (
    <>
      <button
        type="button"
        id={id}
        onClick={openPicker}
        className="flex h-8 w-full items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-sm outline-none transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
      >
        <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
        <span className={cn(!displayLabel && "text-muted-foreground")}>{displayLabel ?? t.linkModal.countdownPickPlaceholder}</span>
      </button>
      {/* Input asli tersembunyi (bukan display:none) cuma buat validasi HTML5 "required" --
          trigger di atas tombol biasa, bukan input, jadi gak otomatis ikut constraint validation. */}
      <input type="text" required={required} value={value} readOnly tabIndex={-1} aria-hidden className="sr-only" />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xs" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between font-normal">
              <span className="font-heading text-base font-medium capitalize">
                {monthLabel} {draft.year}
              </span>
              <span className="flex gap-1">
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => setDraft((d) => shiftMonth(d, -1))}>
                  <ChevronLeft />
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => setDraft((d) => shiftMonth(d, 1))}>
                  <ChevronRight />
                </Button>
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
            {weekdayLabels.map((label, i) => (
              <span key={i} className="py-1 font-medium text-muted-foreground">
                {label}
              </span>
            ))}
            {cells.map((cell, i) => {
              const isSelected = cell.offset === 0 && cell.day === draft.day;
              const isToday =
                cell.offset === 0 &&
                cell.day === today.getDate() &&
                draft.month === today.getMonth() &&
                draft.year === today.getFullYear();
              return (
                <button
                  type="button"
                  key={i}
                  onClick={() =>
                    setDraft((d) => {
                      const shifted = cell.offset === 0 ? d : shiftMonth(d, cell.offset);
                      return { ...shifted, day: cell.day };
                    })
                  }
                  className={cn(
                    "mx-auto flex size-8 items-center justify-center rounded-full transition-colors",
                    cell.offset !== 0 && "text-muted-foreground/50",
                    cell.offset === 0 && !isSelected && "hover:bg-muted",
                    isSelected && "bg-primary text-primary-foreground",
                    isToday && !isSelected && "ring-1 ring-ring",
                  )}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          <label className="flex cursor-pointer items-center justify-between border-t pt-3 text-sm">
            <span>{t.linkModal.countdown24hLabel}</span>
            <Switch checked={is24h} onCheckedChange={setIs24h} />
          </label>

          <div className="flex items-center gap-1.5">
            <SelectField
              className="flex-1"
              value={is24h ? draft.hour : hour12}
              onChange={(e) => {
                const n = Number(e.target.value);
                setDraft((d) => ({ ...d, hour: is24h ? n : from12Hour(n, period) }));
              }}
            >
              {Array.from({ length: is24h ? 24 : 12 }, (_, i) => (is24h ? i : i + 1)).map((h) => (
                <option key={h} value={h}>
                  {pad(h)}
                </option>
              ))}
            </SelectField>
            <span className="text-muted-foreground">:</span>
            <SelectField
              className="flex-1"
              value={draft.minute}
              onChange={(e) => setDraft((d) => ({ ...d, minute: Number(e.target.value) }))}
            >
              {Array.from({ length: 60 }, (_, m) => (
                <option key={m} value={m}>
                  {pad(m)}
                </option>
              ))}
            </SelectField>
            {!is24h ? (
              <SelectField
                className="flex-1"
                value={period}
                onChange={(e) => setDraft((d) => ({ ...d, hour: from12Hour(hour12, e.target.value as "AM" | "PM") }))}
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </SelectField>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button type="button" onClick={handleSave}>
              {t.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
