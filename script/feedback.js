module.exports.config = {
  name: "feedback",
  version: "1.1.0",
  role: 0,
  hasPrefix: false,
  aliases: ["report", "bug"],
  description: "Send AI feedback or bug report to admin",
  usage: "feedback [message]",
  cooldown: 0
};

module.exports.run = async function({ api, event, args }) {
  const ADMIN_UID = "61576920532388";
  const feedbackText = args.join(" ").trim();

  if (!feedbackText) {
    return api.sendMessage(
      "❌ Please provide your feedback.\n\nExample:\nfeedback The AI answer is incorrect.",
      event.threadID,
      event.messageID
    );
  }

  api.getThreadInfo(event.threadID, (err, threadInfo) => {
    const groupName = threadInfo?.threadName || "Private Chat";
    const isGroup = threadInfo?.isGroup || false;

    api.getUserInfo(event.senderID, (err2, userInfo) => {
      const userName =
        userInfo?.[event.senderID]?.name || "Unknown User";

      const reportMessage =
`🚨 AI FEEDBACK REPORT
━━━━━━━━━━━━━━━━━━━━━━
👤 User: ${userName}
🆔 User ID: ${event.senderID}

🧑‍🤝‍🧑 Chat Type: ${isGroup ? "Group Chat" : "Private Chat"}
📛 Group Name: ${isGroup ? groupName : "N/A"}
🆔 Group Thread ID: ${event.threadID}

💬 Feedback:
${feedbackText}

🕒 ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}
━━━━━━━━━━━━━━━━━━━━━━`;

      // Send to admin
      api.sendMessage(reportMessage, ADMIN_UID);

      // Confirm to user
      api.sendMessage(
        "✅ Thank you for your feedback!\nYour report has been sent to the admin.",
        event.threadID,
        event.messageID
      );
    });
  });
};
