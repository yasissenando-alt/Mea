const axios = require("axios");
const moment = require("moment-timezone");
const fs = require("fs");

module.exports.config = {
  name: "auto-earthquake",
  version: "1.3.0",
};

let isStarted = false;
const CACHE_FILE = "./eqCache.json";

let lastEventUrl = null;
let lastInfoNumber = null;

// load cache
if (fs.existsSync(CACHE_FILE)) {
  try {
    const cache = JSON.parse(fs.readFileSync(CACHE_FILE));
    lastEventUrl = cache.lastEventUrl;
    lastInfoNumber = cache.lastInfoNumber;
  } catch {}
}

module.exports.handleEvent = async function ({ api }) {
  if (!isStarted) {
    isStarted = true;
    startAutoEarthquake(api);
  }
};

function saveCache() {
  fs.writeFileSync(
    CACHE_FILE,
    JSON.stringify({ lastEventUrl, lastInfoNumber })
  );
}

function startAutoEarthquake(api) {
  const URL = "https://hutchingd-earthquake-info-philvocs-api-cc.hf.space/info";

  setInterval(async () => {
    try {
      const res = await axios.get(URL);
      const data = res.data;
      if (!data || !data.details) return;

      const d = data.details;
      const eventUrl = data.url;
      const infoNo = d.informationNumber;

      let isUpdate = false;

      if (lastEventUrl !== eventUrl) {
        lastEventUrl = eventUrl;
        lastInfoNumber = infoNo;
      } else if (lastInfoNumber !== infoNo) {
        isUpdate = true;
        lastInfoNumber = infoNo;
      } else {
        return;
      }

      saveCache();

      const eqTime = moment(d.timestamp)
        .tz("Asia/Manila")
        .format("MMM D, YYYY • hh:mm A");

      const header = isUpdate
        ? "🟡 EARTHQUAKE UPDATE (PHIVOLCS)"
        : "🔴 EARTHQUAKE ALERT (PHIVOLCS)";

      const message =
`${header}
━━━━━━━━━━━━━━
📢 Info No: ${infoNo}
📍 Location: ${d.location}
🌀 Magnitude: ${d.magnitude}
📏 Depth: ${d.depth || "N/A"}
⏰ Time (PH): ${eqTime}

🧭 Origin: ${d.origin}
🔁 Aftershocks: ${d.expectingAftershocks || "Unknown"}

🔗 Official Bulletin:
${eventUrl}`;

      const formData = {
        input: {
          composer_entry_point: "inline_composer",
          composer_source_surface: "timeline",
          idempotence_token: `${Date.now()}_EQ`,
          source: "WWW",

          message: { text: message },

          attachments: [
            {
              photo: {
                external_photo_url: d.mapImageUrl
              }
            }
          ],

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

      console.log(
        isUpdate
          ? "[EARTHQUAKE] UPDATED posted"
          : "[EARTHQUAKE] NEW posted"
      );

    } catch (err) {
      console.error("[AUTO EARTHQUAKE ERROR]", err.message);
    }
  }, 5 * 60 * 1000); // 24/7 checker (NOT spam)
}
