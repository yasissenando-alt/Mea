const axios = require("axios");
const moment = require("moment-timezone");

module.exports.config = {
  name: "auto-news-weather-card",
  version: "5.0.0",
};

let started = false;
let postedLinks = new Set();

const NEWS_API =
  "https://newsdata.io/api/1/latest?apikey=pub_0318d0b2916048e0914e48838720b00c&country=ph&language=en";

module.exports.handleEvent = async function ({ api }) {
  if (!started) {
    started = true;
    startAutoPost(api);
  }
};

async function startAutoPost(api) {
  const run = async () => {
    let articles = [];

    try {
      const res = await axios.get(NEWS_API, { timeout: 15000 });
      articles = res.data.results || [];
    } catch (err) {
      console.error("NEWS API ERROR:", err.message);
      return scheduleNext();
    }

    const fresh = articles.filter(
      a => a.link && !postedLinks.has(a.link)
    );

    if (!fresh.length) return scheduleNext();

    const news = fresh[Math.floor(Math.random() * fresh.length)];
    postedLinks.add(news.link);

    const isWeather =
      /weather|rain|storm|bagyo|typhoon|flood/i.test(
        `${news.title} ${news.description}`
      );

    const label = isWeather
      ? "𝗦𝗧𝗔𝗥 𝗠𝗘𝗚𝗔 𝗪𝗘𝗔𝗧𝗛𝗘𝗥 𝗨𝗣𝗗𝗔𝗧𝗘"
      : "𝗕𝗥𝗘𝗔𝗞𝗜𝗡𝗚 𝗡𝗘𝗪𝗦";

    // 👉 LINK SA DULO = AUTO IMAGE CARD
    const message = `${label}

👀 Usap-usapan ngayon sa Pinas!

${news.title || "May bagong ganap!"}

📍 Philippines
📰 ${news.source_id || "Local News"}

🔗 ${news.link}

#ChikaNews #BreakingPH #StarMegaUpdate`;

    try {
      const payload = {
        input: {
          composer_entry_point: "inline_composer",
          composer_source_surface: "timeline",
          idempotence_token: `${Date.now()}_CARD`,
          source: "WWW",
          message: { text: message },
          audience: {
            privacy: { base_state: "EVERYONE" },
          },
          actor_id: api.getCurrentUserID(),
        },
      };

      const res = await api.httpPost(
        "https://www.facebook.com/api/graphql/",
        {
          av: api.getCurrentUserID(),
          fb_api_req_friendly_name: "ComposerStoryCreateMutation",
          fb_api_caller_class: "RelayModern",
          doc_id: "7711610262190099",
          variables: JSON.stringify(payload),
        }
      );

      const postID =
        res.data.story_create.story.legacy_story_hideable_id;

      console.log(
        `[AUTO CARD] ${moment
          .tz("Asia/Manila")
          .format("HH:mm:ss")} → https://facebook.com/${api.getCurrentUserID()}/posts/${postID}`
      );
    } catch (err) {
      console.error("POST ERROR:", err.message);
    }

    scheduleNext();
  };

  const scheduleNext = () => {
    const delay =
      (Math.floor(Math.random() * 5) + 3) * 60 * 1000; // 3–7 minutes
    setTimeout(run, delay);
  };

  run();
}
