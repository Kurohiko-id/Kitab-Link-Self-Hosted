// Evaluasi murni (gak nyentuh DB/waktu sistem langsung, `now` di-inject) -- dipisah dari
// lib/scheduled-rules.ts biar gampang dites tanpa cron/DB.
export type ScheduleMode = "show_during" | "hide_during";

// days pakai angka sama persis kayak Date.getDay() (0=Minggu ... 6=Sabtu).
export type WeeklyScheduleConfig = { days: number[]; mode: ScheduleMode; untilDate: string | null };

// untilDate lewat -> jadwal berakhir, balik ke kondisi normal (tampil), gak dievaluasi
// day-of-week lagi. Sebelum itu: mode nentuin apakah hari yang dipilih berarti "tampilkan"
// atau "sembunyikan" (hari yang gak dipilih otomatis kebalikannya).
export function evaluateWeeklySchedule(config: WeeklyScheduleConfig, now: Date = new Date()): boolean {
  if (config.untilDate && now > new Date(config.untilDate)) return true;
  const isSelectedDay = config.days.includes(now.getDay());
  return config.mode === "show_during" ? isSelectedDay : !isSelectedDay;
}
