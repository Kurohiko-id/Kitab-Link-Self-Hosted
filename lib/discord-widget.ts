// Endpoint publik Discord (gak butuh bot token/OAuth) -- server pemilik cuma perlu
// nyalain "Enable Server Widget" di Server Settings > Widget miliknya sendiri. Kalau
// widget-nya dimatiin atau ID salah, endpoint ini balikin 404 -- ditangkep, gak nge-crash
// halaman publik (widget-nya diem aja, gak dirender, lihat components/discord-widget.tsx).
const WIDGET_ENDPOINT = (guildId: string) => `https://discord.com/api/guilds/${guildId}/widget.json`;

export type DiscordWidgetMember = { id: string; username: string; avatarUrl: string | null; status: string };
export type DiscordWidgetChannel = { id: string; name: string };
export type DiscordWidgetData = {
  name: string;
  instantInvite: string | null;
  presenceCount: number;
  members: DiscordWidgetMember[];
  channels: DiscordWidgetChannel[];
};

type RawWidgetMember = { id: string; username: string; avatar_url?: string | null; status?: string };
type RawWidgetChannel = { id: string; name: string };
type RawWidgetResponse = {
  name: string;
  instant_invite?: string | null;
  presence_count?: number;
  members?: RawWidgetMember[];
  channels?: RawWidgetChannel[];
};

// 1x retry -- widget yang barusan kesetting bener ("Lewat link") kadang keliatan "gak
// muncul" padahal bukan bug UI, cuma request KE Discord.com yang sesekali gagal/timeout
// dari server kita (bukan dari device pengunjung -- fetch-nya selalu di server, jadi HP vs
// PC gak ngaruh). Gak ada retry sebelumnya -> 1 hiccup = widget diem selamanya buat page view itu.
async function fetchWidgetJson(guildId: string): Promise<RawWidgetResponse | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(WIDGET_ENDPOINT(guildId), { next: { revalidate: 60 } });
      if (res.ok) return await res.json();
      if (res.status === 404) return null; // widget beneran gak aktif/ID salah -- gak usah diulang
    } catch {
      // lanjut ke percobaan berikutnya (atau berhenti kalau ini percobaan terakhir)
    }
    if (attempt === 0) await new Promise((r) => setTimeout(r, 400));
  }
  return null;
}

// revalidate 60s -- data member/online count berubah tiap detik di Discord, tapi widget
// ini bukan chat realtime, cukup "hampir live" tanpa bikin tiap page view mukul API Discord.
export async function fetchDiscordWidgetData(guildId: string): Promise<DiscordWidgetData | null> {
  const json = await fetchWidgetJson(guildId);
  if (!json) return null;
  return {
    name: json.name,
    instantInvite: json.instant_invite ?? null,
    presenceCount: json.presence_count ?? json.members?.length ?? 0,
    members: (json.members ?? []).map((m) => ({
      id: m.id,
      username: m.username,
      avatarUrl: m.avatar_url ?? null,
      status: m.status ?? "online",
    })),
    channels: (json.channels ?? []).map((c) => ({ id: c.id, name: c.name })),
  };
}
