module.exports.config = {
  name: "notify",
  version: "1.0.0",
  role: 2, // ADMIN ONLY
  hasPrefix: false,
  aliases: ["groupmsg", "adminmsg"],
  description: "Admin sends message to a group using Group Thread ID",
  usage: "notify [groupThreadID] [message]",
  cooldown: 0
};

module.exports.run = async function({ api, event, args }) {
  const ADMIN_UID = "61576920532388";

  // Admin check
  if (event.senderID !== ADMIN_UID) {
    return api.sendMessage(
      "❌ You are not authorized to use this command.",
      event.threadID,
      event.messageID
    );
  }

  const groupThreadID = args.shift();
  const message = args.join(" ");

  if (!groupThreadID || !message) {
    return api.sendMessage(
      "❌ Usage:\nnotify [groupThreadID] [message]\n\nExample:\nnotify 1983237947 AI issue has been fixed.",
      event.threadID,
      event.messageID
    );
  }

  // Send message to group
  api.sendMessage(
    `📢 ADMIN NOTICE\n━━━━━━━━━━━━━━\n${message}`,
    groupThreadID
  );

  // Confirm to admin
  api.sendMessage(
    `✅ Message successfully sent to Group ID: ${groupThreadID}`,
    event.threadID,
    event.messageID
  );
};
