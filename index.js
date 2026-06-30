// ===================== MINI BOT: ID • TAG • SESGİR =====================
// discord.js v14 | PREFIX (.)
// Sadece 3 komut: .id <oyuncuID>  |  .tag <isim>  |  .sesgir
// Senin özel emoji setin korunmuştur.
// ==========================================================================
process.on("unhandledRejection", (r) => console.error("UNHANDLED_REJECTION:", r));
process.on("uncaughtException", (e) => console.error("UNCAUGHT_EXCEPTION:", e));

const express = require("express");

const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder
} = require("discord.js");

const { joinVoiceChannel } = require("@discordjs/voice");

// ===================== FETCH (Node 18+ global) fallback =====================
let _fetch = global.fetch;
if (!_fetch) {
  try {
    _fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));
  } catch (e) {
    console.error("❌ fetch yok! Node 18+ kullan veya node-fetch kur.");
    process.exit(1);
  }
}

// ===================== ENV / TOKEN =====================
const TOKEN = (
  process.env.DISCORD_BOT_TOKEN ||
  process.env.DISCORD_TOKEN ||
  process.env.TOKEN ||
  ""
).trim();

if (!TOKEN) {
  console.error("❌ DISCORD_BOT_TOKEN eksik! (Render ENV'e ekle)");
  process.exit(1);
}

// ===================== Render Keep-Alive =====================
const app = express();
app.get("/", (req, res) => res.status(200).send("OK"));
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => console.log("🌐 Web aktif:", PORT));

// ===================== AYARLAR =====================
const PREFIX = ".";

// Görsel TEK NOKTA (istersen Render ENV üzerinden değiştir)
const BOT_IMAGE_URL =
  (process.env.BOT_IMAGE_URL || process.env.BOT_IMAGE || "").trim() ||
  "https://media.discordapp.net/attachments/1520142839244128413/1520151994071908463/content.png?ex=6a40275e&is=6a3ed5de&hm=3feb81b5ab6feb1502c085c1ba7ff0542468b998ecec65bcbbdf398ad7554f2b&=&format=webp&quality=lossless&width=960&height=960";

const THUMB_URL = (process.env.THUMB_URL || BOT_IMAGE_URL).trim();

// Başlık/Author yazısı
const PANEL_AUTHOR = (process.env.PANEL_AUTHOR || "vazgucxn Assistant").trim();
const FOOTER_TEXT = (process.env.FOOTER_TEXT || "Quantès • Assistant").trim();

// FiveM CFX kodu (Render ENV: CFX_CODE)
const CFX_CODE = (process.env.CFX_CODE || "xjx5kr").trim();

// Tema renk
const NAVY = 0x0b1a3a;

// ===================== EMOJİLER (SENİN ÖZEL SET) =====================
const EMOJI = {
  settings: "<a:settings:1520165591267414016>",
  success: "<a:success:1520165977227137075>",
  info: "<:info:1520167364379938896>",
  lock: "<a:lock_key:1520167477030686820>",
  right: "<a:sagok:1520167724355948744>",
  star: "<:yildiz:1520167832678301890>",
  warn: "<a:uyari1:1520167965343879328>",

  ban: "<:ban:1520168371096649728>",
  kick: "<:ban:1520168371096649728>",
  trash: "<:trash:1520169243314753547>",
  shield: "<:shield:1520169561683394761>",

  weed: "<:weed:1520169653358428351>",
  box: "<:box:1520169843452543169>",
  crown: "<a:crown:1520169978609799258>",
  refresh: "<:refresh:1520170092975882260>",

  headphones: "<:headphones:1520170199368601710>",
  muted: "<:muted:1520170268524281866>",
  unmute: "<:unmute:1520170332659646564>",
  move: "<a:sagok:1520167724355948744>",

  search: "<:search:1520171230009753770>",
  fivem: "<:fivem:1520171196518240546>"
};

// ===================== HELPERS =====================
const line = (emoji, text) => `${emoji} ・ ${text}`;

function baseEmbed(guild) {
  const authorIcon = guild?.iconURL?.({ size: 128 }) || undefined;
  return new EmbedBuilder()
    .setColor(NAVY)
    .setThumbnail(THUMB_URL)
    .setAuthor({ name: PANEL_AUTHOR, iconURL: authorIcon })
    .setFooter({ text: FOOTER_TEXT })
    .setTimestamp();
}
function createEmbed(guild, { title, description, fields, image }) {
  const e = baseEmbed(guild);
  if (title) e.setTitle(title);
  if (description) e.setDescription(description);
  if (fields?.length) e.addFields(fields);
  if (image) e.setImage(image);
  return e;
}
async function replyE(message, embed) {
  return message.reply({ embeds: [embed] }).catch(() => {});
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await _fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

// ===================== FIVEM API =====================
let lastPlayersFetchAt = 0;
let cachedPlayersJson = null;

function cleanFiveMName(name = "") {
  return String(name).replace(/\^\d/g, "").toLowerCase();
}

async function getServerPlayersCached() {
  const now = Date.now();

  if (cachedPlayersJson && now - lastPlayersFetchAt < 30000) {
    return cachedPlayersJson;
  }

  const url = `https://servers-frontend.fivem.net/api/servers/single/${CFX_CODE}`;

  const res = await fetchWithTimeout(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
      "Referer": "https://servers.fivem.net/",
      "Origin": "https://servers.fivem.net"
    }
  }, 5000);

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const json = await res.json();

  cachedPlayersJson = json;
  lastPlayersFetchAt = now;

  return json;
}

async function getPlayerFromCFX(playerId) {
  const json = await getServerPlayersCached();
  const players = json?.Data?.players || [];
  const p = players.find((x) => String(x.id) === String(playerId));
  if (!p) return { found: false };

  const ids = Array.isArray(p.identifiers) ? p.identifiers : [];
  return {
    found: true,
    id: p.id,
    name: p.name,
    ping: p.ping,
    steam: ids.find((i) => i.startsWith("steam:")) || "Yok",
    discord: ids.find((i) => i.startsWith("discord:"))?.replace("discord:", "") || "Yok"
  };
}

// ===================== DISCORD CLIENT =====================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Channel]
});

client.once("clientReady", () => {
  console.log(`🟢 Bot aktif: ${client.user.tag}`);
});

// ===================== PREFIX COMMANDS =====================
client.on("messageCreate", async (message) => {
  try {
    if (!message.guild) return;
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const guild = message.guild;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    // ===================== ID (FiveM) =====================
    if (cmd === "id") {
      const playerId = args[0];

      if (!playerId || isNaN(playerId)) {
        return replyE(
          message,
          createEmbed(guild, {
            title: line(EMOJI.info, "ᴋᴜʟʟᴀɴɪᴍ"),
            description: line(EMOJI.right, `${PREFIX}id 12`)
          })
        );
      }

      try {
        const data = await getPlayerFromCFX(playerId);

        if (!data.found) {
          return replyE(
            message,
            createEmbed(guild, {
              title: line(EMOJI.warn, "ʙᴜʟᴜɴᴀᴍᴀᴅɪ"),
              description: line(EMOJI.warn, "Oyuncu bulunamadı.")
            })
          );
        }

        return replyE(
          message,
          createEmbed(guild, {
            title: line(EMOJI.fivem, "ꜰɪᴠᴇᴍ ᴏʏᴜɴᴄᴜ"),
            fields: [
              {
                name: line(EMOJI.info, "İsim"),
                value: `\`${data.name}\``
              },
              {
                name: line(EMOJI.settings, "ID"),
                value: `\`${data.id}\``,
                inline: true
              },
              {
                name: line(EMOJI.right, "Ping"),
                value: `\`${data.ping}\``,
                inline: true
              },
              {
                name: line(EMOJI.search, "Steam"),
                value: `\`${data.steam}\``
              },
              {
                name: line(EMOJI.search, "Discord"),
                value: `\`${data.discord}\``
              }
            ]
          })
        );
      } catch (err) {
        console.error("ID CMD ERROR:", err);

        return replyE(
          message,
          createEmbed(guild, {
            title: line(EMOJI.warn, "ᴀᴘɪ ʜᴀᴛᴀ"),
            description: line(
              EMOJI.warn,
              err?.message || "FiveM API bağlantı hatası"
            )
          })
        );
      }
    }

    // ===================== TAG (FiveM) =====================
    if (cmd === "tag") {
      const search = args.join(" ").trim();

      if (!search) {
        return replyE(
          message,
          createEmbed(guild, {
            title: line(EMOJI.info, "ᴋᴜʟʟᴀɴɪᴍ"),
            description: line(EMOJI.right, `${PREFIX}tag kaisen`)
          })
        );
      }

      try {
        const json = await getServerPlayersCached();
        const players = json?.Data?.players || [];

        const matched = players.filter((p) =>
          cleanFiveMName(p.name).includes(search.toLowerCase())
        );

        if (!matched.length) {
          return replyE(
            message,
            createEmbed(guild, {
              title: line(EMOJI.warn, "ʙᴜʟᴜɴᴀᴍᴀᴅɪ"),
              description: line(EMOJI.warn, "Oyuncu bulunamadı.")
            })
          );
        }

        const list = matched
          .slice(0, 25)
          .map(
            (p) =>
              `${EMOJI.right} ・ **${p.name}** (ID: \`${p.id}\` | Ping: \`${p.ping}\`)`
          )
          .join("\n");

        return replyE(
          message,
          createEmbed(guild, {
            title: `${EMOJI.search} ・ ᴛᴀɢ ᴀʀᴀᴍᴀ`,
            description:
              `${EMOJI.success} ・ Toplam: **${matched.length} kişi**\n\n` + list
          })
        );
      } catch (err) {
        console.error("TAG ERROR:", err);

        return replyE(
          message,
          createEmbed(guild, {
            title: line(EMOJI.warn, "ᴀᴘɪ ʜᴀᴛᴀ"),
            description: line(
              EMOJI.warn,
              err?.message || "FiveM API bağlantı hatası"
            )
          })
        );
      }
    }

    // ===================== SES GİR =====================
    if (cmd === "sesgir") {
      const vc = message.member.voice.channel;
      if (!vc) {
        return replyE(message, createEmbed(guild, {
          title: line(EMOJI.warn, "ʜᴀᴛᴀ"),
          description: "Ses kanalında değilsin."
        }));
      }

      joinVoiceChannel({
        channelId: vc.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator
      });

      return replyE(message, createEmbed(guild, {
        title: line(EMOJI.success, "ꜱᴇꜱ"),
        description: "Ses kanalına girildi."
      }));
    }

  } catch (err) {
    console.error("CMD ERROR:", err);
  }
});

// ===================== LOGIN =====================
client.login(TOKEN)
  .then(() => console.log("✅ Discord Login OK"))
  .catch((err) => console.error("❌ Discord Login FAIL:", err));
