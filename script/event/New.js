const axios = require("axios");
const moment = require("moment-timezone");
const fs = require("fs");

module.exports.config = {
  name: "auto-news-ph-tiktok-video",
  version: "FINAL-VIDEO",
};

const CACHE_FILE = "./phNewsVideoCache.json";
const POST_INTERVAL = 5 * 60 * 1000;
let started = false;
let postedLinks = new Set();

/* LOAD CACHE */
if (fs.existsSync(CACHE_FILE)) {
  try {
    postedLinks = new Set(JSON.parse(fs.readFileSync(CACHE_FILE)));
  } catch {
    postedLinks = new Set();
  }
}

/* APIS */
const NEWS_API =
  "https://newsdata.io/api/1/latest?apikey=pub_0318d0b2916048e0914e48838720b00c&country=ph&language=en";

const TIKTOK_API =
  "https://norch-project.gleeze.com/api/tiktok?keywords=news";

module.exports.handleEvent = async function ({ api }) {
  if (started) return;
  started = true;

  console.log("[PH NEWS + TIKTOK] STARTED — 24/7 VIDEO MODE");
  setTimeout(() => autoPost(api), 5000);
};

async function autoPost(api) {
  try {
    let pool = [];

    /* ===== NEWS DATA PH ===== */
    try {
      const res = await axios.get(NEWS_API, { timeout: 15000 });
      (res.data.results || []).forEach(n => {
        if (n.link && !postedLinks.has(n.link)) {
          pool.push({
            type: "news",
            title: n.title,
            desc: n.description,
            link: n.link,
            source: n.source_id || "PH News",
          });
        }
      });
    } catch {}

    /* ===== TIKTOK VIDEO ===== */
    try {
      const res = await axios.get(TIKTOK_API, { timeout: 15000 });
      (res.data?.data || []).forEach(v => {
        if (!v.video || !v.url) return;
        if (postedLinks.has(v.url)) return;

        // PH filter
        if (
          !/philippines|ph|manila|cebu|davao/i.test(
            `${v.title} ${v.description || ""}`
          )
        )
          return;

        pool.push({
          type: "tiktok",
          title: v.title || "Trending News",
          desc: v.description || "Trending sa TikTok PH",
          video: v.video,
          link: v.url,
          source: "TikTok PH",
        });
      });
    } catch {}

    if (!pool.length) {
      console.log("[AUTO POST] No new PH content");
      return schedule(api);
    }

    const item = pool[Math.floor(Math.random() * pool.length)];
    postedLinks.add(item.link);
    saveCache();

    /* ===== POST NEWS ===== */
    if (item.type === "news") {
      await postText(api, item);
    } else {
      await postVideo(api, item);
    }

  } catch (err) {
    console.error("[AUTO POST ERROR]", err.message);
  }

  schedule(api);
}

/* ===== TEXT POST ===== */
async function postText(api, news) {
  const message = `🚨 𝗕𝗥𝗘𝗔𝗞𝗜𝗡𝗚 𝗡𝗘𝗪𝗦 | 🇵🇭

${news.title}

${news.desc || ""}

🕒 ${moment().tz("Asia/Manila").format("MMMM DD, YYYY • hh:mm A")}
📰 Source: ${news.source}

👉 Buong balita:
${news.link}

#BreakingNewsPH #PinoyNews`;

  const payload = {
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
    post?.data?.story_create?.story?.legacy_story_hideable_id;

  if (postID) {
    await api.createComment(`📌 Source 👇\n${news.link}`, postID);
  }

  console.log("[POSTED] PH NEWS");
}

/* ===== VIDEO POST ===== */
async function postVideo(api, vid) {
  const caption = `🔥 TRENDING NEWS | 🇵🇭

${vid.title}

${vid.desc}

🕒 ${moment().tz("Asia/Manila").format("hh:mm A")}
📍 Source: TikTok PH

#TrendingPH #TikTokNews #BreakingNews`;

  await api.postVideo(
    vid.video,
    caption
  );

  console.log("[POSTED] TIKTOK VIDEO");
}

/* ===== LOOP ===== */
function schedule(api) {
  setTimeout(() => autoPost(api), POST_INTERVAL);
}

function saveCache() {
  fs.writeFileSync(
    CACHE_FILE,
    JSON.stringify([...postedLinks], null, 2)
  );
}
