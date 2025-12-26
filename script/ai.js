const axios = require('axios');

module.exports.config = {
  name: 'ai',
  version: '4.0.0',
  role: 0,
  hasPrefix: false,
  aliases: ['gpt', 'study', 'assistant', 'exam'],
  description: "ChatGPT School Assistant (Exam, MCQ, Essay, Math, Vision)",
  usage: "ai [question] or reply to homework image",
  credits: 'Chatgpt',
  cooldown: 0,
};

module.exports.run = async function({ api, event, args }) {
  const promptText = args.join(" ").trim();
  const repliedText = event.messageReply?.body || '';
  const studentPrompt = [repliedText, promptText].filter(Boolean).join("\n");

  if (!studentPrompt && !event.messageReply?.attachments?.[0]?.url) {
    return api.sendMessage(
      "❌ Please ask a school-related question or reply to a homework image.",
      event.threadID,
      event.messageID
    );
  }

  const systemPrompt = `
You are CHATGPT SCHOOL ASSISTANT.

Rules:
- Always give academic, school-appropriate answers.
- If math → solve step-by-step.
- If multiple choice → choose correct answer and explain why.
- If exam/reviewer → summarize clearly with key points.
- If essay/research → formal academic tone.
- If student asks for simple explanation → explain like a teacher.
- Use Filipino if the student uses Filipino.
- Cite sources in APA format when applicable.
`;

  api.sendMessage(
    "🎓 ChatGPT School Assistant is analyzing...",
    event.threadID,
    async (err, info) => {
      if (err) return;

      try {
        let imageUrl = "";
        const attachment = event.messageReply?.attachments?.[0];
        if (attachment?.url) imageUrl = attachment.url;

        const { data } = await axios.get(
          "https://apis-rho-nine.vercel.app/gemini",
          {
            params: {
              ask: `${systemPrompt}\n\nStudent Question:\n${studentPrompt}`,
              imageurl: imageUrl
            },
            timeout: 15000
          }
        );

        const answer = data.description || "No academic answer generated.";

        api.getUserInfo(event.senderID, (err, userInfo) => {
          const studentName =
            userInfo?.[event.senderID]?.name || "Student";
          const timePH = new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila'
          });

          const finalMessage = 
`🎓 CHATGPT SCHOOL ASSISTANT
━━━━━━━━━━━━━━━━━━━━━━
📘 Academic Response:

${answer}

━━━━━━━━━━━━━━━━━━━━━━
👤 Student: ${studentName}
🕒 ${timePH}
📚 Mode: Exam & Study Assistant`;

          api.editMessage(finalMessage, info.messageID);
        });

      } catch (error) {
        console.error("AI Error:", error);
        api.editMessage(
          "❌ School Assistant is temporarily unavailable. Please try again later.",
          info.messageID
        );
      }
    }
  );
};
