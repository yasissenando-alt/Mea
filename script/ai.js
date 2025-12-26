const axios = require("axios");

module.exports.config = {
  name: "ai",
  version: "1.0.0",
  role: 0, // ✅ PUBLIC ACCESS
  hasPrefix: false,
  aliases: ["gpt", "study", "exam"],
  description: "ChatGPT School Assistant (Public)",
  usage: "ai [question]",
  credits: "ChatGPT",
  cooldown: 0
};

module.exports.run = async function ({ api, event, args }) {
  const question = args.join(" ").trim();

  if (!question) {
    return api.sendMessage(
      "❌ Please ask a school-related question.\n\nExample:\nai Explain photosynthesis",
      event.threadID,
      event.messageID
    );
  }

  const systemPrompt = `
You are CHATGPT SCHOOL ASSISTANT.

Rules:
- Academic / school-related only.
- Explain like a teacher.
- Step-by-step for math.
- Explain answers for multiple choice.
- Use Filipino if the student uses Filipino.
- No unsafe or non-academic content.
`;

  api.sendMessage(
    "🎓 ChatGPT School Assistant is thinking...",
    event.threadID,
    async (err, info) => {
      if (err) return;

      try {
        const { data } = await axios.get(
          "https://urangkapolka.vercel.app/api/chatgpt4",
          {
            params: {
              prompt: `${systemPrompt}\n\nStudent Question:\n${question}`
            },
            timeout: 15000
          }
        );

        const answer =
          data?.response ||
          data?.answer ||
          data?.result ||
          "No academic response generated.";

        api.editMessage(
`🎓 CHATGPT SCHOOL ASSISTANT
━━━━━━━━━━━━━━━━━━━━━━
📘 Academic Answer:

${answer}

━━━━━━━━━━━━━━━━━━━━━━
📚 Mode: Public School Assistant`,
          info.messageID
        );

      } catch (error) {
        console.error("AI Error:", error);
        api.editMessage(
          "❌ School Assistant is currently unavailable.\nPlease try again later.",
          info.messageID
        );
      }
    }
  );
};
