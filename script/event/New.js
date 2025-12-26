const axios = require("axios");
const moment = require("moment-timezone");

module.exports.config = {
  name: "auto-news",
  version: "1.1.0",
};

let isStarted = false;
let lastPostedLink = null; // anti-duplicate (isa-isa)

module.exports.handleEvent = async function ({ api }) {
  if (!isStarted) {
    isStarted = true;
    startAutoNews(api);
  }
};

function startAutoNews(api) {
  const API_KEY = "pub_0318d0b2916048e0914e48838720b00c";
  const URL = "https://newsdata.io/api/1/latest";

  setInterval(async () => {
    try {
      const res = await axios.get(URL, {
        params: {
          apikey: API_KEY,
          q: "news",
          language: "en",
        },
      });

      const articles = res.data.results;
      if (!articles || articles.length === 0) return;

      // 👉 KUNIN LANG YUNG UNANG HINDI PA NAIPO-POST
      const news = articles.find(n => n.link && n.link !== lastPostedLink);
      if (!news) return;

      lastPostedLink = news.link; // mark as posted

      const time = moment().tz("Asia/Manila").format("MMM D, YYYY • hh:mm A");

      const message =
`📰 LATEST NEWS
━━━━━━━━━━━━
${news.title}

${news.description || ""}

🌍 ${news.country?.join(", ") || "Global"}
⏰ ${time}

🔗 ${news.link}`;

      const formData = {
        input: {
          composer_entry_point: "inline_composer",
          composer_source_surface: "timeline",
          idempotence_token: `${Date.now()}_NEWS`,
          source: "WWW",
          message: { text: message },
          audience: { privacy: { base_state: "EVERYONE" } },
          actor_id: api.getCurrentUserID(),
        },
      };

      await api.httpPost(
        "https://www.facebook.com/api/graphql/",
        {
          av: api.getCurrentUserID(),
          fb_api_req_friendly_name: "ComposerStoryCreateMutation",
          fb_api_caller_class: "RelayModern",
          doc_id: "7711610262190099",
          variables: JSON.stringify(formData),
        }
      );

      console.log("[AUTO NEWS] Posted ONE news:", news.title);
    } catch (e) {
      console.error("[AUTO NEWS ERROR]", e.message);
    }
  }, 3 * 60 * 1000); // ⏱️ every 3 minutes (ISA LANG)
}
