const axios = require("axios");
const moment = require("moment-timezone");

module.exports.config = {
  name: "auto-earthquake",
  version: "1.0.0",
};

let started = false;
let lastTimestamp = null;

module.exports.handleEvent = async function ({ api }) {
  if (!started) {
    started = true;
    startAutoEarthquake(api);
  }
};

async function startAutoEarthquake(api) {
  const API_URL =
    "https://hutchingd-earthquake-info-philvocs-api-cc.hf.space/info";

  const checkAndPost = async () => {
    try {
      const res = await axios.get(API_URL);
      const data = res.data.details;

      if (!data || !data.timestamp) return;

      // ❌ iwas double post
      if (lastTimestamp === data.timestamp) return;
      lastTimestamp = data.timestamp;

      const now = moment().tz("Asia/Manila").format("MMM DD, YYYY hh:mm A");

      const message = `
🚨 EARTHQUAKE UPDATE (PHIVOLCS)

📅 ${data.dateTime}
📍 ${data.location}
📏 Magnitude: ${data.magnitude}
🌍 Origin: ${data.origin}
🔁 Aftershocks: ${data.expectingAftershocks || "N/A"}

🗺️ Map:
${data.mapImageUrl}

🔗 Source:
${data.sourceUrl}

⏰ Posted: ${now}
`;

      const formData = {
        input: {
          composer_entry_point: "inline_composer",
          composer_source_surface: "timeline",
          idempotence_token: `${Date.now()}_FEED`,
          source: "WWW",
          message: { text: message },
          audience: {
            privacy: { base_state: "EVERYONE" },
          },
          actor_id: api.getCurrentUserID(),
        },
      };

      const result = await api.httpPost(
        "https://www.facebook.com/api/graphql/",
        {
          av: api.getCurrentUserID(),
          fb_api_req_friendly_name: "ComposerStoryCreateMutation",
          fb_api_caller_class: "RelayModern",
          doc_id: "7711610262190099",
          variables: JSON.stringify(formData),
        }
      );

      const postID =
        result.data.story_create.story.legacy_story_hideable_id;
      console.log(
        `[EARTHQUAKE POSTED] https://www.facebook.com/${api.getCurrentUserID()}/posts/${postID}`
      );
    } catch (err) {
      console.error("Earthquake auto-post error:", err.message);
    }

    // ⏰ check every 1 hour
    setTimeout(checkAndPost, 60 * 60 * 1000);
  };

  checkAndPost();
}
