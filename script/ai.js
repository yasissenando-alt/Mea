const axios = require("axios");
const fs = require("fs");

/* ================= ADMIN ================= */
const ADMIN_ID = "61576920532388";

/* ================= MEMORY ================= */
const MEMORY_FILE = "./aiStudentMemory.json";
let memory = fs.existsSync(MEMORY_FILE)
  ? JSON.parse(fs.readFileSync(MEMORY_FILE))
  : {};

function saveMemory() {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
}

/* ================= CONFIG ================= */
module.exports.config = {
  name: "ai",
  version: "2026.SUPREME",
  role: 0,
  hasPrefix: false,
  aliases: ["gpt", "study", "exam", "essay"],
  description: "AI School Assistant 2026 SUPREME (Academic Only)",
  usage: "ai [question]",
  credits: "ChatGPT 2026",
  cooldown: 0
};

/* ================= HELPERS ================= */
const isFilipino = (t) =>
  /(ano|paano|bakit|ipaliwanag|sanaysay|kwentahin|tungkol|ilan)/i.test(t);

const isAcademic = (t) =>
  /(math|solve|science|history|essay|exam|biology|chemistry|physics|algebra|calculus|review|sanaysay|ipaliwanag|compute)/i.test(
    t.toLowerCase()
  );

function getMode(text) {
  if (/timer/i.test(text)) return "EXAM_TIMER";
  if (/essay|sanaysay/i.test(text)) return "ESSAY_CHECKER";
  if (/exam|review/i.test(text)) return "EXAM_REVIEWER";
  if (/solve|kwentahin|compute/i.test(text)) return "MATH_SOLVER";
  return "LESSON_EXPLAIN";
}

/* ================= MAIN ================= */
module.exports.run = async function ({ api, event, args }) {
  const input = args.join(" ").trim();
  const uid = event.senderID;
  const threadID = event.threadID;

  /* ---------- HELP ---------- */
  if (!input) {
    return api.sendMessage(
`🎓 AI SCHOOL ASSISTANT 2026 SUPREME

Examples:
• ai solve 2x + 6 = 14
• ai ipaliwanag ang photosynthesis
• ai essay tungkol kay rizal
• ai exam review biology
• ai timer 30 exam math
• ai progress
• ai leaderboard`,
      threadID
    );
  }

  /* ---------- ADMIN ---------- */
  if (/teacher reset student/i.test(input) && uid === ADMIN_ID) {
    memory = {};
    saveMemory();
    return api.sendMessage("✅ All student records reset.", threadID);
  }

  if (/teacher view stats/i.test(input) && uid === ADMIN_ID) {
    return api.sendMessage(
      `👨‍🏫 TEACHER DASHBOARD\n\nTotal Students: ${Object.keys(memory).length}`,
      threadID
    );
  }

  /* ---------- LEADERBOARD ---------- */
  if (/leaderboard/i.test(input)) {
    const sorted = Object.entries(memory)
      .map(([id, d]) => ({
        id,
        score: (d.lessons || 0) + (d.math || 0) * 2 + (d.essay || 0) * 3
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    let msg = "🏆 TOP STUDENTS LEADERBOARD\n\n";
    if (!sorted.length) msg += "No data yet.";
    sorted.forEach((s, i) => {
      msg += `${i + 1}. Student ID: ${s.id}\nScore: ${s.score}\n\n`;
    });

    return api.sendMessage(msg, threadID);
  }

  /* ---------- PROGRESS ---------- */
  if (/progress/i.test(input)) {
    const d = memory[uid] || {};
    return api.sendMessage(
`📊 STUDENT PROGRESS

Lessons: ${d.lessons || 0}
Math Solved: ${d.math || 0}
Essays Checked: ${d.essay || 0}`,
      threadID
    );
  }

  /* ---------- ACADEMIC FILTER ---------- */
  if (!isAcademic(input) && !/timer/i.test(input)) {
    return api.sendMessage(
      "❌ Pang-akademikong tanong lamang.\nMath • Science • Essay • Exam",
      threadID
    );
  }

  const mode = getMode(input);
  const filipino = isFilipino(input);

  /* ---------- TIMER ---------- */
  if (mode === "EXAM_TIMER") {
    const mins = parseInt(input.match(/\d+/)?.[0]);
    if (!mins) {
      return api.sendMessage("❌ Ilagay ang oras sa minuto.", threadID);
    }

    api.sendMessage(`⏱️ Exam Timer Started: ${mins} minutes`, threadID);
    setTimeout(() => {
      api.sendMessage("⏰ TIME IS UP! Tapusin na ang exam.", threadID);
    }, mins * 60000);
    return;
  }

  /* ---------- MEMORY UPDATE ---------- */
  memory[uid] = memory[uid] || { lessons: 0, math: 0, essay: 0 };
  if (mode === "LESSON_EXPLAIN") memory[uid].lessons++;
  if (mode === "MATH_SOLVER") memory[uid].math++;
  if (mode === "ESSAY_CHECKER") memory[uid].essay++;
  saveMemory();

  /* ---------- AI PROMPT ---------- */
  const systemPrompt = `
You are an AI SCHOOL TEACHER (2026 SUPREME).

MODE: ${mode}

RULES:
- Academic only
- Explain like a professional teacher
- Step-by-step for Math
- Essay: score 0–100 with rubric
- Exam review: bullet points + key facts
- Use Filipino if student uses Filipino
- Student-safe, clear, structured
`;

  api.sendMessage("🎓 AI Teacher is thinking...", threadID, async (_, info) => {
    try {
      const { data } = await axios.get(
        "https://urangkapolka.vercel.app/api/chatgpt4",
        {
          params: {
            prompt: `${systemPrompt}\n\nSTUDENT INPUT:\n${input}`
          },
          timeout: 30000
        }
      );

      const answer =
        data?.response ||
        data?.answer ||
        "No academic response generated.";

      api.editMessage(
`🎓 AI SCHOOL ASSISTANT — 2026 SUPREME
━━━━━━━━━━━━━━━━━━━━━━
🧠 Mode: ${mode}

${answer}

━━━━━━━━━━━━━━━━━━━━━━
📚 Public • Safe • 24/7`,
        info.messageID
      );
    } catch (e) {
      api.editMessage(
        filipino
          ? "❌ Hindi available ang AI Teacher ngayon."
          : "❌ AI Teacher is temporarily unavailable.",
        info.messageID
      );
    }
  });
};
