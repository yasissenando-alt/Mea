const axios = require("axios");
const moment = require("moment-timezone");
const fs = require("fs");

module.exports.config = {
  name: "auto-earthquake-ph-image",
  version: "FINAL-PHIVOLCS-IMAGE",
};

const API_URL =
  "https://hutchingd-earthquake-info-philvocs-api-cc.hf.space/info";

const CHECK_INTERVAL = 2 * 60 * 1000;
const CACHE_FILE = "./earthquakeCache.json";

let started = false;
let lastID = null;

/* ===== LOAD CACHE ===== */
if (fs.existsSync(CACHE_FILE)) {
  try {
    lastID = JSON.parse(fs.readFileSync(CACHE_FILE)).lastID;
  } catch {
    lastID = null;
  }
}

module.exports.handleEvent = async function ({ api }) {
  if (started) return;
  started = true;

  console.log("🌏 PHIVOLCS EARTHQUAKE IMAGE BOT STARTED");
  monitor(api);
};

async function monitor(api) {
  try {
    const res = await axios.get(API_URL, { timeout: 15000 });
    const eq = res.data?.data;
    if (!eq) return loop(api);

    const id = `${eq.date}_${eq.time}_${eq.magnitude}_${eq.location}`;
    if (id === lastID) return loop(api);

    lastID = id;
    saveCache(id);

    await postEarthquake(api, eq);

  } catch (e) {
    console.log("⚠️ ERROR:", e.message);
  }

  loop(api);
}

/* ===== IMAGE GENERATOR ===== */
function generateImage(eq) {
  const mag = eq.magnitude;
  const time = `${eq.date} ${eq.time}`;

  const graph = `
digraph {
  bgcolor="#ffffff";
  node [shape=box style=filled fontname="Arial"];

  header [label="EARTHQUAKE BULLETIN\\nPHILIPPINES"
          fillcolor="#b00000" fontcolor="white" fontsize=24];

  info [label="📍 LOCATION:\\n${eq.location}\\n\\n💥 MAGNITUDE: ${mag}\\n📏 DEPTH: ${eq.depth}\\n🕒 ${time}"
        fillcolor="#f2f2f2" fontcolor="#000000" fontsize=18];

  footer [label="SOURCE: PHIVOLCS"
          fillcolor="#000000" fontcolor="white" fontsize=14];

  header -> info -> footer;
}
`;

  return `https://quickchart.io/graphviz?graph=${encodeURIComponent(
    graph
  )}`;
}

/* ===== POST WITH IMAGE ===== */
async function postEarthquake(api, eq) {
  const mag = parseFloat(eq.magnitude);
  let emoji = "⚠️";
  if (mag >= 6) emoji = "🚨🚨";
  if (mag >= 7) emoji = "🚨🚨🚨";

  const imageUrl = generateImage(eq);

  const caption = `${emoji} EARTHQUAKE ALERT | 🇵🇭

📍 ${eq.location}
💥 Magnitude: ${eq.magnitude}
📏 Depth: ${eq.depth}
🕒 ${eq.date} • ${eq.time}

📡 PHIVOLCS
#EarthquakePH #PHIVOLCS #Lindol`;

  try {
    await api.postPhoto(imageUrl, caption);
    console.log("🖼️ EARTHQUAKE IMAGE POSTED");
  } catch (e) {
    console.log("❌ IMAGE POST FAILED:", e.message);
  }
}

/* ===== LOOP ===== */
function loop(api) {
  setTimeout(() => monitor(api), CHECK_INTERVAL);
}

function saveCache(id) {
  fs.writeFileSync(
    CACHE_FILE,
    JSON.stringify({ lastID: id }, null, 2)
  );
}
