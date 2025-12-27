const axios = require("axios");
const moment = require("moment-timezone");
const fs = require("fs");

module.exports.config = {
  name: "auto-weather-ph-all",
  version: "FINAL",
};

const API_KEY = "7/TlRoS75kuvxH0ekixmTA==2ggIWhQ14ih84mE4";
const CACHE_FILE = "./weatherIndex.json";

let started = false;
let cityIndex = 0;

// 🇵🇭 ALL MAJOR PH CITIES
const CITIES = [
  "Manila", "Quezon City", "Caloocan", "Las Pinas", "Makati",
  "Malabon", "Mandaluyong", "Marikina", "Muntinlupa",
  "Navotas", "Paranaque", "Pasay", "Pasig", "Pateros",
  "San Juan", "Taguig", "Valenzuela",

  "Angeles", "San Fernando Pampanga", "Olongapo",
  "Baguio", "Dagupan", "San Carlos Pangasinan",
  "Tuguegarao", "Ilagan", "Cauayan",

  "Batangas City", "Lipa", "Tanauan",
  "Calamba", "Santa Rosa Laguna", "San Pablo",
  "Lucena",

  "Naga", "Legazpi", "Iriga", "Sorsogon",

  "Iloilo City", "Bacolod", "Roxas",
  "Kalibo", "Antique",

  "Cebu City", "Mandaue", "Lapu-Lapu",
  "Tagbilaran", "Dumaguete",

  "Tacloban", "Ormoc", "Calbayog",
  "Catbalogan", "Borongan",

  "Zamboanga City", "Dipolog", "Pagadian",
  "Isabela Basilan",

  "Cagayan de Oro", "Iligan",
  "Malaybalay", "Valencia Bukidnon",

  "Davao City", "Tagum", "Panabo", "Digos",
  "General Santos", "Koronadal",

  "Cotabato City", "Kidapawan",
  "Butuan", "Surigao City",
  "Tandag", "Bislig",

  "Puerto Princesa"
];

// LOAD INDEX
if (fs.existsSync(CACHE_FILE)) {
  try {
    const data = JSON.parse(fs.readFileSync(CACHE_FILE));
    cityIndex = data.index || 0;
  } catch {}
}

module.exports.handleEvent = async function ({ api }) {
  if (started) return;
  started = true;

  global.apiInstance = api;

  console.log("[AUTO WEATHER PH] STARTED 🇵🇭");
  setTimeout(() => postWeather(api), 5000);
};

async function postWeather(api) {
  try {
    const city = CITIES[cityIndex];

    const res = await axios.get(
      `https://api.api-ninjas.com/v1/weather?city=${encodeURIComponent(city)}`,
      {
        headers: { "X-Api-Key": API_KEY },
      }
    );

    const w = res.data;
    if (!w || !w.temp) throw new Error("No weather data");

    const message = `🌦️ 𝗪𝗘𝗔𝗧𝗛𝗘𝗥 𝗨𝗣𝗗𝗔𝗧𝗘 | 🇵🇭

📍 ${city}, Philippines

🌡️ Temp: ${w.temp}°C
🤗 Feels Like: ${w.feels_like}°C
💧 Humidity: ${w.humidity}%
🌬️ Wind: ${w.wind_speed} km/h
☁️ Cloud: ${w.cloud_pct}%

🕒 ${moment()
      .tz("Asia/Manila")
      .format("MMMM DD, YYYY • hh:mm A")}

#WeatherPH #${city.replace(/ /g, "")}`;

    const payload = {
      input: {
        composer_entry_point: "inline_composer",
        composer_source_surface: "timeline",
        idempotence_token: `${Date.now()}_WEATHER`,
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
        variables: JSON.stringify(payload),
      }
    );

    console.log(`[WEATHER] POSTED ✔ ${city}`);

    // NEXT CITY
    cityIndex = (cityIndex + 1) % CITIES.length;
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ index: cityIndex }));

  } catch (err) {
    console.error("[WEATHER ERROR]", err.message);
  }
}

// ⏱️ EVERY 10 MINUTES (SAFE SA API)
setInterval(() => {
  if (global.apiInstance) {
    postWeather(global.apiInstance);
  }
}, 10 * 60 * 1000);
