const axios = require("axios");
const fs = require("fs");
const moment = require("moment-timezone");

module.exports.config = {
  name: "auto-tiktok-only",
  version: "NO-ERROR-24/7",
};

const API_URL =
  "https://norch-project.gleeze.com/api/tiktok?keywords=news";

const CACHE_FILE = "./tiktokOnlyCache.json";
const INTERVAL = 5 * 60 * 1000;

let started = false;
let posted = new Set();

/* LOAD CACHE SAFELY */
try {
  if (fs.existsSync(CACHE_FILE)) {
    const data = JSON.parse(fs.readFileSync(CACHE_FILE));
    if (Array.isArray(data)) data.forEach(v => posted.add(v));
  }
} catch {
  posted.clear();
}

/* START BOT */
module.exports.handleEvent = async ({ api }) => {
  if (started) return;
  started = true;

  console.log("[TIKTOK] ✅ AUTOPOST STARTED (NO ERROR)");
  autoPost(api);
};

async function autoPost(api) {
  try {
    const res = await axios.get(API_URL, { timeout: 20000 });
    const list = res?.data?.data || [];

    const video = list.find(v =>
      v?.video &&
      typeof v.video === "string" &&
      !posted.has(v.video) &&
      /ph|philippines|pinoy|manila|cebu|davao/i.test(
        `${v?.title || ""} ${v?.author || ""}`
      )
    );

    if (!video) {
      console.log("[TIKTOK] No new PH video");
      return schedule(api);
    }

    posted.add(video.video);
    saveCache();

    const timePH = moment()
      .tz("Asia/Manila")
      .format("hh:mm A | MMM DD");

    await api.sendMessage(
      {
        body:
`🇵🇭 PH TIKTOK NEWS
━━━━━━━━━━━━━━
🕒 ${timePH}

📌 ${video.title || "Latest viral update"}
#BreakingNews #Philippines #Pinoy`,
        attachment: await api.getStreamFromURL(video.video),
      },
      api.getCurrentUserID()
    );

    console.log("[TIKTOK] ✅ POSTED:", timePH);
  } catch (err) {
    console.error("[TIKTOK ERROR]", err?.message || err);
  }

  schedule(api);
}

function schedule(api) {
  setTimeout(() => autoPost(api), INTERVAL);
}

function saveCache() {
  try {
    fs.writeFileSync(
      CACHE_FILE,
      JSON.stringify([...posted].slice(-300))
    );
  } catch {}
}
