const axios = require("axios");
const moment = require("moment-timezone");

module.exports.config = {
  name: "auto-earthquake-ph",
  version: "1.0.0",
};

let started = false;
let lastInfoNumber = null;

const EQ_API =
  "https://hutchingd-earthquake-info-philvocs-api-cc.hf.space/info";

module.exports.handleEvent = async function ({ api }) {
  if (!started) {
    started = true;
    startAutoEarthquake(api);
  }
};

async function startAutoEarthquake(api) {
  const run = async () => {
    let data;

    try {
      const res = await axios.get(EQ_API, { timeout: 15000 });
      data = res.data;
    } catch (err) {
      console.error("EQ API ERROR:", err.message);
      return scheduleNext();
    }

    if (!data?.details?.informationNumber)
      return scheduleNext();

    // ❌ skip if same bulletin
    if (data.details.informationNumber === lastInfoNumber)
      return scheduleNext();

    lastInfoNumber = data.details.informationNumber;

    const d = data.details;

    const message = `🔴 𝗣𝗛 𝗘𝗔𝗥𝗧𝗛𝗤𝗨𝗔𝗞𝗘 𝗨𝗣𝗗𝗔𝗧𝗘

📅 ${d.dateTime || "N/A"}
📍 ${d.location || "N/A"}
💥 Magnitude: ${d.magnitude || "N/A"}
🌏 Origin: ${d.origin || "N/A"}
⚠️ Aftershocks: ${d.expectingAftershocks || "N/A"}

🗺️ Earthquake Map:
${d.mapImageUrl}

🔗 Official PHIVOLCS Report:
${d.sourceUrl}

#EarthquakePH #PHIVOLCS #BreakingPH`;

    try {
      const payload = {
        input: {
          composer_entry_point: "inline_composer",
          composer_source_surface: "timeline",
          idempotence_token: `${Date.now()}_EQ`,
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
        `[EARTHQUAKE POSTED] https://facebook.com/${api.getCurrentUserID()}/posts/${postID}`
      );

      // 🟡 AUTO COMMENT
      autoComment(
        api,
        postID,
        `Alamin ang buong impormasyon sa comment section:\n${d.sourceUrl}`
      );
    } catch (err) {
      console.error("POST ERROR:", err.message);
    }

    scheduleNext();
  };

  const scheduleNext = () => {
    setTimeout(run, 2 * 60 * 1000); // check every 2 minutes
  };

  run();
}

// 🔽 AUTO COMMENT FUNCTION
async function autoComment(api, postID, text) {
  try {
    await api.httpPost(
      "https://www.facebook.com/api/graphql/",
      {
        av: api.getCurrentUserID(),
        fb_api_req_friendly_name:
          "CometUnifiedCommentCreateMutation",
        fb_api_caller_class: "RelayModern",
        doc_id: "5118394929738480",
        variables: JSON.stringify({
          input: {
            parent_fbid: postID,
            comment_text: text,
            feedback_source: "timeline_feed",
          },
        }),
      }
    );

    console.log("[AUTO COMMENT SUCCESS]");
  } catch (err) {
    console.error("COMMENT ERROR:", err.message);
  }
}
