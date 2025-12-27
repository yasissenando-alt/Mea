const axios = require("axios");
const fs = require("fs");
const moment = require("moment-timezone");

module.exports.config = {
  name: "auto-tiktok-only",
  version: "FINAL-24/7",
};

const API_URL =
  "https://norch-project.gleeze.com/api/tiktok?keywords=news";

const CACHE_FILE = "./tiktokOnlyCache.json";
let started = false;

// LOAD CACHE
let posted = new Set();
if (fs.existsSync(CACHE_FILE)) {
  try {
    JSON.parse(fs.readFileSync(CACHE_FILE)).forEach(v =>
      posted.add(v)
    );
  } catch {}
}

module.exports.handleEvent = async function ({ api }) {
  if (started) return;
  started = true;

  console.log("[TIKTOK AUTOPOST] ✅ RUNNING 24/7");
  setTimeout(() => autoPost(api), 5000);
};

async function autoPost(api) {
  try {
    const res = await axios.get(API_URL, { timeout: 20000 });
    const list = res.data.data || [];

    const video = list.find(v =>
      v.video &&
      !posted.has(v.video) &&
      /ph|philippines|pinoy/i.test(
        `${v.title || ""} ${v.author || ""}`
      )
    );

    if (!video) {
      console.log("[TIKTOK AUTOPOST] No new PH video");
      return schedule(api);
    }

    posted.add(video.video);
    saveCache();

    await api.sendMessage(
      {
        body: `🎥 TikTok Video 🇵🇭\n🕒 ${moment()
          .tz("Asia/Manila")
          .format("hh:mm A")}`,
        attachment: await api.getStreamFromURL(video.video),
      },
      api.getCurrentUserID()
    );

    console.log(
      `[TIKTOK AUTOPOST] ✅ POSTED ${moment()
        .tz("Asia/Manila")
        .format("HH:mm:ss")}`
    );
  } catch (e) {
    console.error("[TIKTOK AUTOPOST ERROR]", e.message);
  }

  schedule(api);
}

function schedule(api) {
  const delay = 5 * 60 * 1000; // every 5 minutes nonstop
  setTimeout(() => autoPost(api), delay);
}

function saveCache() {
  fs.writeFileSync(
    CACHE_FILE,
    JSON.stringify([...posted].slice(-200))
  );
}
