// ===================== MINI BOT: ID • TAG • SESGİR (SLASH KOMUT) =====================
// discord.js v14 | Slash Commands (/)
// Sadece 3 komut: /id <oyuncuid>  |  /tag <isim>  |  /sesgir
// Senin özel emoji setin korunmuştur.
// ==========================================================================
process.on("unhandledRejection", (r) => console.error("UNHANDLED_REJECTION:", r));
process.on("uncaughtException", (e) => console.error("UNCAUGHT_EXCEPTION:", e));

const express = require("express");

const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const { joinVoiceChannel } = require("@discordjs/voice");
const { getServerByEndpoint } = require("fivem-server-api");

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

// CLIENT_ID: slash komutları kaydetmek için Discord Application ID gerekiyor.
// Render ENV'e DISCORD_CLIENT_ID ekleyebilirsin, eklemezsen bot login olduktan
// sonra client.user.id'den otomatik çeker (ekstra ayara gerek kalmaz).
let CLIENT_ID = (process.env.DISCORD_CLIENT_ID || process.env.CLIENT_ID || "").trim();

// GUILD_ID verirsen komutlar SADECE o sunucuda anında görünür (test için ideal).
// Boş bırakırsan komutlar GLOBAL olur, Discord'da yayılması ~1 saat sürebilir.
const GUILD_ID = (process.env.DISCORD_GUILD_ID || process.env.GUILD_ID || "").trim();

// ===================== Render Keep-Alive =====================
const app = express();
app.get("/", (req, res) => res.status(200).send("OK"));
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => console.log("🌐 Web aktif:", PORT));

// ===================== AYARLAR =====================
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

// ===================== FIVEM API (fivem-server-api paketi ile) =====================
let lastPlayersFetchAt = 0;
let cachedServerData = null;

function cleanFiveMName(name = "") {
  return String(name).replace(/\^\d/g, "").toLowerCase();
}

async function getServerPlayersCached() {
  const now = Date.now();

  if (cachedServerData && now - lastPlayersFetchAt < 30000) {
    return cachedServerData;
  }

  const result = await getServerByEndpoint(CFX_CODE, 10000);

  if (!result) {
    throw new Error(`Sunucu bulunamadı (CFX kodu: ${CFX_CODE}). Kod yanlış olabilir ya da sunucu offline.`);
  }

  cachedServerData = result;
  lastPlayersFetchAt = now;

  return result;
}

async function getPlayerFromCFX(playerId) {
  const result = await getServerPlayersCached();
  const players = result?.Data?.players || [];
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

// ===================== SLASH KOMUT TANIMLARI =====================
const commands = [
  new SlashCommandBuilder()
    .setName("id")
    .setDescription("FiveM sunucusundaki bir oyuncuyu ID'sine göre sorgular")
    .addIntegerOption((opt) =>
      opt
        .setName("oyuncuid")
        .setDescription("Sunucu içi oyuncu ID'si (örn. 12)")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("tag")
    .setDescription("FiveM sunucusunda isme göre oyuncu arar")
    .addStringOption((opt) =>
      opt
        .setName("isim")
        .setDescription("Aranacak isim/parça (örn. kaisen)")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("sesgir")
    .setDescription("Botu bulunduğun ses kanalına davet eder"),

  new SlashCommandBuilder()
    .setName("sestopla")
    .setDescription("Sunucuda seste olan herkesi senin bulunduğun ses kanalına toplar"),

  new SlashCommandBuilder()
    .setName("kisi")
    .setDescription("FiveM sunucusundaki tüm oyuncuları (ID ve isim) listeler")
].map((c) => c.toJSON());

async function registerCommands(clientId) {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {
    if (GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(clientId, GUILD_ID), {
        body: commands
      });
      console.log(`✅ Slash komutlar GUILD'e kaydedildi (anında aktif): ${GUILD_ID}`);
    } else {
      await rest.put(Routes.applicationCommands(clientId), {
        body: commands
      });
      console.log("✅ Slash komutlar GLOBAL kaydedildi (yayılması ~1 saat sürebilir).");
    }
  } catch (err) {
    console.error("❌ Slash komut kaydı başarısız:", err);
  }
}

// ===================== DISCORD CLIENT =====================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Channel]
});

client.once("clientReady", async () => {
  console.log(`🟢 Bot aktif: ${client.user.tag}`);

  if (!CLIENT_ID) CLIENT_ID = client.user.id;
  await registerCommands(CLIENT_ID);
});

// ===================== SLASH COMMAND HANDLER =====================
client.on("interactionCreate", async (i) => {
  try {
    if (!i.isChatInputCommand()) return;
    if (!i.guild) return;

    const guild = i.guild;

    // ===================== /ID (FiveM) =====================
    if (i.commandName === "id") {
      await i.deferReply();

      const playerId = i.options.getInteger("oyuncuid");

      try {
        const data = await getPlayerFromCFX(playerId);

        if (!data.found) {
          return i.editReply({
            embeds: [
              createEmbed(guild, {
                title: line(EMOJI.warn, "ʙᴜʟᴜɴᴀᴍᴀᴅɪ"),
                description: line(EMOJI.warn, "Oyuncu bulunamadı.")
              })
            ]
          });
        }

        return i.editReply({
          embeds: [
            createEmbed(guild, {
              title: line(EMOJI.fivem, "ꜰɪᴠᴇᴍ ᴏʏᴜɴᴄᴜ"),
              fields: [
                { name: line(EMOJI.info, "İsim"), value: `\`${data.name}\`` },
                { name: line(EMOJI.settings, "ID"), value: `\`${data.id}\``, inline: true },
                { name: line(EMOJI.right, "Ping"), value: `\`${data.ping}\``, inline: true },
                { name: line(EMOJI.search, "Steam"), value: `\`${data.steam}\`` },
                { name: line(EMOJI.search, "Discord"), value: `\`${data.discord}\`` }
              ]
            })
          ]
        });
      } catch (err) {
        console.error("ID CMD ERROR:", err);
        return i.editReply({
          embeds: [
            createEmbed(guild, {
              title: line(EMOJI.warn, "ᴀᴘɪ ʜᴀᴛᴀ"),
              description: line(EMOJI.warn, err?.message || "FiveM API bağlantı hatası")
            })
          ]
        });
      }
    }

    // ===================== /TAG (FiveM) =====================
    if (i.commandName === "tag") {
      await i.deferReply();

      const search = i.options.getString("isim").trim();

      try {
        const json = await getServerPlayersCached();
        const players = json?.Data?.players || [];

        const matched = players.filter((p) =>
          cleanFiveMName(p.name).includes(search.toLowerCase())
        );

        if (!matched.length) {
          return i.editReply({
            embeds: [
              createEmbed(guild, {
                title: line(EMOJI.warn, "ʙᴜʟᴜɴᴀᴍᴀᴅɪ"),
                description: line(EMOJI.warn, "Oyuncu bulunamadı.")
              })
            ]
          });
        }

        const list = matched
          .slice(0, 25)
          .map((p) => `${EMOJI.right} ・ **${p.name}** (ID: \`${p.id}\` | Ping: \`${p.ping}\`)`)
          .join("\n");

        return i.editReply({
          embeds: [
            createEmbed(guild, {
              title: `${EMOJI.search} ・ ᴛᴀɢ ᴀʀᴀᴍᴀ`,
              description: `${EMOJI.success} ・ Toplam: **${matched.length} kişi**\n\n` + list
            })
          ]
        });
      } catch (err) {
        console.error("TAG CMD ERROR:", err);
        return i.editReply({
          embeds: [
            createEmbed(guild, {
              title: line(EMOJI.warn, "ᴀᴘɪ ʜᴀᴛᴀ"),
              description: line(EMOJI.warn, err?.message || "FiveM API bağlantı hatası")
            })
          ]
        });
      }
    }

    // ===================== /SESGİR =====================
    if (i.commandName === "sesgir") {
      const vc = i.member?.voice?.channel;

      if (!vc) {
        return i.reply({
          embeds: [
            createEmbed(guild, {
              title: line(EMOJI.warn, "ʜᴀᴛᴀ"),
              description: "Ses kanalında değilsin."
            })
          ],
          flags: 64
        });
      }

      joinVoiceChannel({
        channelId: vc.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator
      });

      return i.reply({
        embeds: [
          createEmbed(guild, {
            title: line(EMOJI.success, "ꜱᴇꜱ"),
            description: "Ses kanalına girildi."
          })
        ]
      });
    }

    // ===================== /SESTOPLA =====================
    if (i.commandName === "sestopla") {
      const vc = i.member?.voice?.channel;

      if (!vc) {
        return i.reply({
          embeds: [
            createEmbed(guild, {
              title: line(EMOJI.warn, "ʜᴀᴛᴀ"),
              description: "Önce bir ses kanalına girmelisin."
            })
          ],
          flags: 64
        });
      }

      const me = guild.members.me;
      if (!me?.permissions?.has("MoveMembers")) {
        return i.reply({
          embeds: [
            createEmbed(guild, {
              title: line(EMOJI.lock, "ʏᴇᴛᴋɪ ʏᴏᴋ"),
              description: "Botun **Üyeleri Taşı (Move Members)** yetkisi yok."
            })
          ],
          flags: 64
        });
      }

      await i.deferReply();

      const voiceChannels = guild.channels.cache.filter(
        (c) => c.isVoiceBased?.() && c.id !== vc.id
      );

      let moved = 0;
      let failed = 0;

      for (const [, channel] of voiceChannels) {
        const members = [...channel.members.values()];
        for (const member of members) {
          if (member.id === client.user.id) continue;
          try {
            await member.voice.setChannel(vc);
            moved++;
          } catch (err) {
            failed++;
          }
        }
      }

      return i.editReply({
        embeds: [
          createEmbed(guild, {
            title: line(EMOJI.success, "ꜱᴇꜱ ᴛᴏᴘʟᴀᴍᴀ"),
            description:
              `${EMOJI.right} ・ **${moved}** kişi <#${vc.id}> kanalına taşındı.` +
              (failed ? `\n${EMOJI.warn} ・ **${failed}** kişi taşınamadı.` : "")
          })
        ]
      });
    }

    // ===================== /KISI (FiveM) =====================
    if (i.commandName === "kisi") {
      await i.deferReply();

      try {
        const json = await getServerPlayersCached();
        const players = json?.Data?.players || [];

        if (!players.length) {
          return i.editReply({
            embeds: [
              createEmbed(guild, {
                title: line(EMOJI.warn, "ʙᴏꜱ"),
                description: line(EMOJI.warn, "Sunucuda kimse yok.")
              })
            ]
          });
        }

        const lines = players.map(
          (p) => `${EMOJI.right} ・ \`${p.id}\` **${p.name}**`
        );

        // Discord embed field value limiti 1024 karakter, bu yüzden listeyi parçalara bölüyoruz
        const fields = [];
        let chunk = "";
        let part = 1;

        for (const l of lines) {
          if ((chunk + "\n" + l).length > 1000) {
            fields.push({
              name: part === 1 ? line(EMOJI.fivem, "ᴏʏᴜɴᴄᴜ ʟɪꜱᴛᴇꜱɪ") : `\u200b`,
              value: chunk
            });
            chunk = l;
            part++;
          } else {
            chunk = chunk ? chunk + "\n" + l : l;
          }
        }
        if (chunk) {
          fields.push({
            name: part === 1 ? line(EMOJI.fivem, "ᴏʏᴜɴᴄᴜ ʟɪꜱᴛᴇꜱɪ") : `\u200b`,
            value: chunk
          });
        }

        return i.editReply({
          embeds: [
            createEmbed(guild, {
              title: line(EMOJI.fivem, "ꜰɪᴠᴇᴍ ᴋɪꜱɪ ʟɪꜱᴛᴇꜱɪ"),
              description: `${EMOJI.success} ・ Toplam: **${players.length} kişi**`,
              fields
            })
          ]
        });
      } catch (err) {
        console.error("KISI CMD ERROR:", err);
        return i.editReply({
          embeds: [
            createEmbed(guild, {
              title: line(EMOJI.warn, "ᴀᴘɪ ʜᴀᴛᴀ"),
              description: line(EMOJI.warn, err?.message || "FiveM API bağlantı hatası")
            })
          ]
        });
      }
    }
  } catch (err) {
    console.error("INTERACTION ERROR:", err);
    if (i.deferred || i.replied) {
      await i.editReply("❌ Bir hata oluştu.").catch(() => {});
    } else {
      await i.reply({ content: "❌ Bir hata oluştu.", flags: 64 }).catch(() => {});
    }
  }
});

// ===================== LOGIN =====================
client.login(TOKEN)
  .then(() => console.log("✅ Discord Login OK"))
  .catch((err) => console.error("❌ Discord Login FAIL:", err));
