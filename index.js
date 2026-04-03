require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const Groq = require("groq-sdk");
const express = require("express");

// ── Keep Alive Server ──────────────────────────────────────
const app = express();
app.get("/", (req, res) => res.send("Bot is running!"));
app.listen(3000);

// ── Constants ──────────────────────────────────────────────
const GROQ_MODEL = "llama-3.1-8b-instant";

// 🛡️ Protected users — add as many as you want
const PROTECTED_USERS = [
  {
    id: "1413894682248745051",
    names: ["aahrif", "arif", "aarif"],
    video: "https://res.cloudinary.com/dlyis1e1y/video/upload/v1775154371/comeback_zz8ijn.mp4",
  },
  {
    id: "1234064274410967050",
    names: ["shreyansh", "shreyanshhh", "yourboishreyansh"],
    video: "https://res.cloudinary.com/dlyis1e1y/video/upload/v1775154372/comeback_shreyansh_u5rmfu.mp4",
  },
];

const SYSTEM_PROMPT = `
You are a savage roasting bot.

Rules:
- VERY simple English
- 1–2 SHORT lines ONLY
- No explanation
- No "more like" jokes
- Max 1 emoji (or none)
- No "💀"
- Sound like Discord/Twitter banter
- ONLY use sports jokes if topic is clearly sports
- dont call football soccer

Style:
Short, direct, funny, slightly brutal.
`;

// ── Discord & Groq setup ───────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ── AI function ────────────────────────────────────────────
async function generateRoast(prompt) {
  const res = await groq.chat.completions.create({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    model: GROQ_MODEL,
    max_tokens: 50,
    temperature: 0.9,
  });

  return res.choices[0]?.message?.content || "I have no words.";
}

// ── Detection helpers ──────────────────────────────────────
const footballKeywords = [
  "fc", "football", "soccer", "messi", "ronaldo",
  "barcelona", "real madrid", "manchester", "premier league"
];

function isFootball(text) {
  return footballKeywords.some(word =>
    text.toLowerCase().includes(word)
  );
}

function looksLikeName(text) {
  return /^[a-zA-Z]+$/.test(text.trim());
}

// ── Check if target is a protected user ───────────────────
function getProtectedUser(mentionedUser, targetText) {
  for (const user of PROTECTED_USERS) {
    const idMatch = mentionedUser && mentionedUser.id === user.id;
    const nameMatch = user.names.some(name =>
      targetText.toLowerCase().includes(name)
    );
    if (idMatch || nameMatch) return user;
  }
  return null;
}

// ── Message handler ────────────────────────────────────────
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.content.startsWith("!roast")) return;

  const args = message.content.split(" ").slice(1);
  if (args.length === 0) {
    return message.reply("Tell me what to roast");
  }

  await message.channel.sendTyping();

  let targetText = args.join(" ");
  let prompt = "";

  const mentionedUser = message.mentions.users.first();

  // 🛡️ Prevent bot roasting itself
  if (mentionedUser?.id === client.user.id) {
    return message.reply("Nice try, I'm the one cooking here 🍳");
  }

  // 🎯 Protect all listed users
  const protected_ = getProtectedUser(mentionedUser, targetText);
  if (protected_) {
    return message.reply(`Nice try 😂 <${protected_.video}>`);
  }

  const football = isFootball(targetText);
  const nameLike = looksLikeName(targetText);

  // ── CASE 1: Mentioned user ───────────────────────────────
  if (mentionedUser) {
    targetText = targetText.replace(
      `<@${mentionedUser.id}>`,
      `user '${mentionedUser.username}'`
    );

    prompt = `
Roast this Discord user: "${targetText}"

Rules:
- This is a normal person
- DO NOT mention football or sports
- Keep it personal and funny
- 1-2 short lines
`;
  }

  // ── CASE 2: Looks like a name (prateek etc) ──────────────
  else if (nameLike && !football) {
    prompt = `
Roast this person: "${targetText}"

Rules:
- This is a normal person
- DO NOT mention football or sports
- Keep it personal and relatable
- 1-2 short lines
`;
  }

  // ── CASE 3: Football topic ───────────────────────────────
  else if (football) {
    prompt = `
Roast this football topic: "${targetText}"

Rules:
- Use football memes or performance jokes
- Keep it short and brutal
- No explanation
`;
  }

  // ── CASE 4: General topic ────────────────────────────────
  else {
    prompt = `
Roast this: "${targetText}"

Rules:
- DO NOT mention football or sports
- Keep it short and funny
- No explanation
`;
  }

  try {
    const roast = await generateRoast(prompt);
    message.reply(roast);
  } catch (err) {
    console.error("🔥 Groq API Error:", err);
    message.reply("I burned the food... try again 😭");
  }
});

// ── Ready ──────────────────────────────────────────────────
client.once("ready", () => {
  console.log(`🔥 Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);

