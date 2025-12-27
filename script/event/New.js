const axios = require("axios");
const moment = require("moment-timezone");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "auto-news-247-abs",
  version: "FINAL-24-7",
};

let started = false;
const HISTORY_FILE = path.join(__dirname, "posted_news.json");

// 🔐 load posted history (restart-safe)
let postedLinks = new Set();
if (fs.existsSync(HISTORY_FILE)) {
  try {
    postedLinks = new Set(JSON.parse(fs.readFileSync(HISTORY_FILE)));
  } catch {
    postedLinks = new Set();
  }
}

module.exports.handleEvent = async function ({ api }) {
  if (!started) {
    started = true;
    startAutoNews(api);
  }
};

async function startAutoNews(api) {
  const API_KEY = "pub_0318d0b2916048e0914e48838720b00c";
  const NEWS_URL =
    `https://newsdata.io/api/1/latest?apikey=${API_KEY}&country=ph&language=en`;

  const INTERVAL = 5 * 60 * 1000; // 5 minutes EXACT

  const postNews = async () => {
    try {
      const now = moment().tz("Asia/Manila");

      const res = await axios.get(NEWS_URL, { timeout: 20000 });
      const articles = res.data.results || [];
      if (!articles.length) return;

      const article = articles.find(
        a => a.link && !postedLinks.has(a.link)
      );
      if (!article) return;

      // save link
      postedLinks.add(article.link);
      fs.writeFileSync(HISTORY_FILE, JSON.stringify([...postedLinks]));

      // 🖼️ auto image
      let imagePath = null;
      if (article.image_url) {
        try {
          const img = await axios.get(article.image_url, {
            responseType: "arraybuffer",
            timeout: 15000,
          });
          imagePath = path.join(__dirname, "news_img.jpg");
          fs.writeFileSync(imagePath, img.data);
        } catch {}
      }

      // 📰 ABS-CBN STYLE TEXT
      const message = `
${article.title}

${article.description || ""}

🗞 ${article.source_id}
🕒 ${article.pubDate}

🔗 ${article.link}
`;

      let postData = { body: message };

      if (imagePath && fs.existsSync(imagePath)) {
        postData.attachment = fs.createReadStream(imagePath);
      }

      const result = await api.postFormData(
        `https://graph.facebook.com/${api.getCurrentUserID()}/feed`,
        {
          access_token: api.getAccessToken(),
          ...postData,
        }
      );

      console.log(
        `[24/7 NEWS] ${now.format("YYYY-MM-DD HH:mm")} → ${result.id}`
      );

      if (imagePath && fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    } catch (err) {
      console.error("AUTO NEWS ERROR:", err.message);
    }
  };

  // 🚀 start immediately
  postNews();

  // 🔁 NEVER STOPS
  setInterval(postNews, INTERVAL);
}
