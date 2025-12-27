const axios = require("axios");
const moment = require("moment-timezone");

module.exports.config = {
  name: "auto-news-fixed",
  version: "FINAL",
};

let started = false;
let postedLinks = new Set();

const NEWS_API =
  "https://newsdata.io/api/1/latest?apikey=pub_0318d0b2916048e0914e48838720b00c&country=ph&language=en";

module.exports.handleEvent = async function ({ api }) {
  if (started) return;
  started = true;

  console.log("[AUTO NEWS] STARTED — 24/7 MODE");
  setTimeout(() => autoPost(api), 5000); // start after 5 sec
};

async function autoPost(api) {
  try {
    const res = await axios.get(NEWS_API);
    const newsList = res.data.results || [];

    if (!newsList.length) {
      console.log("[AUTO NEWS] No news found");
      return schedule(api);
    }

    const fresh = newsList.filter(
      n => n.link && !postedLinks.has(n.link)
    );

    if (!fresh.length) {
      console.log("[AUTO NEWS] All news already posted");
      return schedule(api);
    }

    const news = fresh[Math.floor(Math.random() * fresh.length)];
    postedLinks.add(news.link);

    const message = `🚨 𝗕𝗥𝗘𝗔𝗞𝗜𝗡𝗚 𝗡𝗘𝗪𝗦 | 🇵🇭

${news.title}

${news.description || ""}

🕒 ${moment().tz("Asia/Manila").format("MMMM DD, YYYY • hh:mm A")}
📰 Source: ${news.source_id || "PH News"}

👉 Alamin ang buong balita dito:
${news.link}

#BreakingNewsPH #PinoyNews`;

    const payload = {
      input: {
        composer_entry_point: "inline_composer",
        composer_source_surface: "timeline",
        idempotence_token: `${Date.now()}_NEWS`,
        source: "WWW",
        message: { text: message },
        audience: {
          privacy: { base_state: "EVERYONE" },
        },
        actor_id: api.getCurrentUserID(),
      },
    };

    const post = await api.httpPost(
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
      post.data.story_create.story.legacy_story_hideable_id;

    // AUTO COMMENT
    await api.createComment(
      `📌 Alamin ang buong impormasyon dito 👇\n${news.link}`,
      postID
    );

    console.log(
      `[AUTO NEWS] POSTED @ ${moment()
        .tz("Asia/Manila")
        .format("HH:mm:ss")}`
    );
  } catch (err) {
    console.error("[AUTO NEWS ERROR]", err.message);
  }

  schedule(api);
}

function schedule(api) {
  const delay =
    (Math.floor(Math.random() * 5) + 3) * 60 * 1000; // 3–7 mins
  setTimeout(() => autoPost(api), delay);
}
