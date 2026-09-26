// Iframe resmi Discord apa adanya -- dipakai buat style "iframe" ("Classic Discord"),
// BEDA dari style "classic" ("Ala Classic") yang tiruan manual. Ini gak butuh widget.json
// sama sekali (Discord yang urus semuanya sendiri di dalem iframe-nya), jadi toggle
// show*/title di config SENGAJA diabaikan buat style ini -- gak ada cara ngontrol itu dari
// luar iframe cross-origin. theme=dark di-hardcode (paling cocok buat kebanyakan halaman
// link-in-bio yang gelap), bukan dibikin opsi baru lagi. "allowtransparency" (atribut lama
// Discord sendiri di contoh embed-nya) sengaja gak dipake -- browser modern udah transparan
// otomatis kalau background di dalem iframe-nya transparan, gak butuh atribut IE-lama itu.
export function DiscordIframe({
  guildId,
  width,
  height,
}: {
  guildId: string;
  width?: number | null;
  height?: number | null;
}) {
  return (
    <iframe
      src={`https://discord.com/widget?id=${guildId}&theme=dark`}
      width={width || "100%"}
      height={height || 500}
      style={{ maxWidth: "100%" }}
      sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
      className="rounded-2xl border-0"
      title="Discord"
    />
  );
}
