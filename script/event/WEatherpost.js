const axios = require("axios");
const moment = require("moment-timezone");
const fs = require("fs");

module.exports.config = {
  name: "auto-weather-ph-zones",
  version: "FINAL-ZONES",
};

const WEATHER_KEY = "7a165fb761f045bdaf3165634252712";
const POST_INTERVAL = 10 * 60 * 1000;
const CACHE_FILE = "./weatherZoneCache.json";
let started = false;

/* PH ZONES + CITIES */
const PH_ZONES = {
  "NCR": [
    "Manila","Quezon City","Caloocan","Makati","Pasig",
    "Taguig","Parañaque","Las Piñas","Mandaluyong","Marikina"
  ],

  "North Luzon": [
    "Baguio","Laoag","Vigan","Tuguegarao",
    "Ilagan","Cauayan","Aparri"
  ],

  "Central Luzon": [
    "San Fernando Pampanga","Angeles",
    "Olongapo","Cabanatuan","Tarlac City"
  ],

  "South Luzon": [
    "Batangas City","Lipa","Lucena",
    "Calamba","Los Baños","Legazpi","Naga"
  ],

  "MIMAROPA": [
    "Puerto Princesa","Calapan",
    "Odiongan","Boac"
  ],

  "Western Visayas": [
    "Iloilo City","Bacolod","Roxas City","Kalibo"
  ],

  "Central Visayas": [
    "Cebu City","Mandaue","Lapu-Lapu",
    "Tagbilaran","Dumaguete"
  ],

  "Eastern Visayas": [
    "Tacloban","Ormoc","Catbalogan","Maasin"
  ],

  "Zamboanga Peninsula": [
    "Zamboanga City","Pagadian","Dipolog"
  ],

  "Northern Mindanao": [
    "Cagayan de Oro","Iligan","Valencia"
  ],

  "Davao Region": [
    "Davao City","Tagum","Panabo","Digos"
  ],

  "SOCCSKSARGEN": [
    "General Santos","Koronadal","Kidapawan"
  ],

  "Caraga": [
    "Butuan","Surigao City","Bayugan"
  ],

  "BARMM": [
    "Cotabato City","Marawi","Jolo"
  ]
};

let zoneKeys = Object.keys(PH_ZONES);
let state = { zone: 0, city: 0 };

/* LOAD CACHE */
if (fs.existsSync(CACHE_FILE)) {
  try {
    state = JSON.parse(fs.readFileSync(CACHE_FILE));
  } catch {}
}

module.exports.handleEvent = async function ({ api }) {
  if (started) return;
  started = true;

  console.log("[AUTO WEATHER PH] ZONES MODE 24/7");
  setTimeout(() => autoPost(api), 5000);
};

async function autoPost(api) {
  try {
    const zoneName = zoneKeys[state.zone];
    const cities = PH_ZONES[zoneName];
    const city = cities[state.city];

    state.city++;
    if (state.city >= cities.length) {
      state.city = 0;
      state.zone = (state.zone + 1) % zoneKeys.length;
    }
    saveState();

    const url = `https://api.weatherapi.com/v1/current.json?key=${WEATHER_KEY}&q=${encodeURIComponent(city)}&aqi=no`;
    const res = await axios.get(url);
    const w = res.data;

    const msg = `🌦️ 𝗪𝗘𝗔𝗧𝗛𝗘𝗥 𝗨𝗣𝗗𝗔𝗧𝗘 | 🇵🇭

📍 ${w.location.name}
🗺️ Zone: ${zoneName}

🌡️ Temp: ${w.current.temp_c}°C
🤒 Feels Like: ${w.current.feelslike_c}°C
☁️ Condition: ${w.current.condition.text}
💧 Humidity: ${w.current.humidity}%
🌬️ Wind: ${w.current.wind_kph} kph

🕒 ${moment().tz("Asia/Manila").format("MMMM DD, YYYY • hh:mm A")}

#WeatherPH #Panahon #${zoneName.replace(/\s/g,"")}`;

    await api.httpPost(
      "https://www.facebook.com/api/graphql/",
      {
        av: api.getCurrentUserID(),
        fb_api_req_friendly_name: "ComposerStoryCreateMutation",
        fb_api_caller_class: "RelayModern",
        doc_id: "7711610262190099",
        variables: JSON.stringify({
          input: {
            composer_entry_point: "inline_composer",
            composer_source_surface: "timeline",
            idempotence_token: Date.now(),
            source: "WWW",
            message: { text: msg },
            audience: { privacy: { base_state: "EVERYONE" } },
            actor_id: api.getCurrentUserID(),
          },
        }),
      }
    );

    console.log(`[WEATHER POSTED] ${city} (${zoneName})`);
  } catch (e) {
    console.error("[WEATHER ERROR]", e.message);
  }

  setTimeout(() => autoPost(api), POST_INTERVAL);
}

function saveState() {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(state));
}
