// Content for the Monday 23 November 2026 front page (Template v4).
// Every fact traces to local-grade/newsimage/research-23nov.md.
// Headlines and briefs are sized to their boxes: complete, never cut off.

export interface Pictured {
  n: number;
  scene: string;
  region: string;
  regionLabel: string;
  tag: string;
  source: string;
  headline: string;
  brief: string;
  fact?: string;
  pin: [number, number]; // lon, lat
}

export const LEADS: Pictured[] = [
  {
    n: 1, scene: "nvidia", region: "americas", regionLabel: "AMERICAS",
    tag: "CONFIRMED", source: "REUTERS",
    headline: "Nvidia reinstates Huang; Wall Street roars",
    brief: "Back 11 days after resigning in scandal; shares +31% as Wall Street roars back.",
    fact: "+31%", pin: [-122, 37],
  },
  {
    n: 2, scene: "puigdemont", region: "europe", regionLabel: "EUROPE",
    tag: "CONFIRMED", source: "REUTERS",
    headline: "Puigdemont free to return after nine years in exile",
    brief: "The Supreme Court shelves the case; he may come home after nine years in Belgium.",
    pin: [3, 42],
  },
  {
    n: 3, scene: "grok", region: "americas", regionLabel: "AMERICAS",
    tag: "CONFIRMED", source: "AP",
    headline: "Two states sue Musk over Grok's sexualised deepfakes",
    brief: "Virginia and Oregon file the first state suits; the filings cite 3 million images.",
    pin: [-78, 38],
  },
];

export const CARDS: Pictured[] = [
  {
    n: 4, scene: "sanctions", region: "europe", regionLabel: "EUROPE",
    tag: "CONFIRMED", source: "AP",
    headline: "EU unveils 22nd Russia sanctions",
    brief: "60 banks cut off SWIFT; crypto and 70 ships hit.",
    pin: [4, 51],
  },
  {
    n: 5, scene: "fire", region: "asia", regionLabel: "ASIA-PACIFIC",
    tag: "CONFIRMED", source: "REUTERS",
    headline: "Indonesia: 24 dead in candy-factory fire",
    brief: "Cikande blaze began Saturday; 30 still missing.",
    pin: [106, -6],
  },
  {
    n: 6, scene: "gaza", region: "mideast", regionLabel: "MIDDLE EAST",
    tag: "CONFIRMED", source: "BBC",
    headline: "Gaza a 'toxic wasteland' — Oxfam",
    brief: "Contamination signs cover 99% of the territory.",
    pin: [34, 31],
  },
  {
    n: 7, scene: "merger", region: "americas", regionLabel: "AMERICAS",
    tag: "CONFIRMED", source: "REUTERS",
    headline: "CrowdStrike to buy Zscaler for $43.9bn",
    brief: "A 34% premium; holders get 1.135 shares each.",
    pin: [-98, 30],
  },
  {
    n: 8, scene: "ahmadi", region: "mideast", regionLabel: "MIDDLE EAST",
    tag: "CONFIRMED", source: "REUTERS",
    headline: "Iran flogs singer Ahmadi 74 times",
    brief: "Lashed in Qom over a 2024 concert without hijab.",
    pin: [51, 35],
  },
  {
    n: 9, scene: "stadium", region: "europe", regionLabel: "EUROPE",
    tag: "CONFIRMED", source: "PREM LEAGUE",
    headline: "Brentford thrash Everton 4-0",
    brief: "Lewis-Potter scored twice in two minutes.",
    fact: "4-0", pin: [0, 52],
  },
  {
    n: 10, scene: "screening", region: "europe", regionLabel: "EUROPE",
    tag: "CONFIRMED", source: "SKY NEWS",
    headline: "AI breast-screening invites 700,000 women",
    brief: "EDITH trial: AI mammograms at 30 UK sites.",
    pin: [0, 52],
  },
  {
    n: 11, scene: "awacs", region: "europe", regionLabel: "EUROPE",
    tag: "CONFIRMED", source: "REUTERS",
    headline: "Drone in Poland; NATO sends AWACS",
    brief: "Drone crossed briefly in the night attack.",
    pin: [19, 52],
  },
  {
    n: 12, scene: "iowa", region: "americas", regionLabel: "AMERICAS",
    tag: "CONFIRMED", source: "REUTERS",
    headline: "Trump halts Iowa blast of 10,000 lb",
    brief: "68 barrels of lead azide; a court stay stopped it.",
    pin: [-91, 41],
  },
  {
    n: 13, scene: "quake", region: "oceania", regionLabel: "OCEANIA",
    tag: "CONFIRMED", source: "USGS",
    headline: "M6.5 quake shakes Pacific; no damage",
    brief: "601 km deep; green alert, no damage reported.",
    fact: "M6.5", pin: [170, -15],
  },
  {
    n: 14, scene: "cobalt", region: "africa", regionLabel: "AFRICA",
    tag: "CONFIRMED", source: "REUTERS",
    headline: "Congo halts cobalt exports from 30 Nov",
    brief: "Acts on oversupply, weak prices, rising stocks.",
    pin: [25, -11],
  },
  {
    n: 15, scene: "dymer", region: "europe", regionLabel: "EUROPE",
    tag: "CONFIRMED", source: "REUTERS",
    headline: "Kyiv-region strike toll rises to 15",
    brief: "11 of the dead were in one five-storey block.",
    pin: [30, 51],
  },
];

// Dense brief column: label + one short line each (28 briefs; 43 stories in all).
export const BRIEFS: Array<[string, string, string]> = [
  ["ITURI", "africa", "Fighting traps Ebola responders"],
  ["IRAN", "mideast", "Courts say the US owes $290bn damages"],
  ["HORMUZ", "mideast", "Iran vows to counter the US blockade"],
  ["LIBYA", "europe", "Kyiv claims it sank the Merkury warship"],
  ["ESTONIA", "europe", "Moscow warns of acts near open war"],
  ["EU BUDGET", "europe", "Czech, Hungarian leaders reject it"],
  ["KALININGRAD", "europe", "Russia: $576m for exclave ferries"],
  ["CATHERINE", "europe", "Opens up on cancer in film 'Heal'"],
  ["TRUMP", "americas", "Attacks Newsom's 548 commutations at DoJ"],
  ["DEMOCRATS", "americas", "12 debates for 2028; first Jun 2027"],
  ["HOUSE", "americas", "Majority confirmed at 258, most since 1992"],
  ["CHAPO ISIDRO", "americas", "US seeks his extradition"],
  ["49ERS", "americas", "Rout the Vikings 35-10 in Mexico City"],
  ["NEPAL", "asia", "Modi gives NPR 24,000-crore rebuild aid"],
  ["MEGASPEED", "asia", "US blacklists firm in Nvidia case"],
  ["QUAKES", "asia", "PNG M5.0, Macquarie M5.5, China M4.9"],
  ["WFP", "global", "Wars put food aid for 7.3m more at risk"],
  ["OPCW", "global", "Faces a budget crisis over US arrears"],
  ["WEBB", "global", "Maps dust inside Cassiopeia A remnant"],
  ["NBA", "americas", "Heat win 7th straight; Nuggets 151-145 OT"],
  ["AI PACT", "global", "Trump, Xi: humans keep mil. AI"],
  ["SYRIA", "mideast", "US weighs training Syrian demining teams"],
  ["MAGYAR", "europe", "Hungary's PM to travel to Ukraine 'soon'"],
  ["ANDREW", "europe", "High Court told of a £750,000 'bribe'"],
  ["PMI", "europe", "Eurozone holds at 51.7; France weak"],
  ["CUBA", "americas", "WHO chief visits as health system fails"],
  ["FBI", "americas", "Hit by a second cyber incident, says report"],
  ["TINUBU", "africa", "Villa also suffers power outages"],
];

// THE DAY IN UTC — exact, verified times only.
export const UTC_STRIP: Array<[string, string]> = [
  ["02:40", "Vanuatu quake, M6.5"],
  ["09:00", "Eurozone PMI holds, 51.7"],
  ["14:20", "Nvidia reinstates Huang"],
  ["14:43", "14 nations press Myanmar"],
  ["15:35", "EU unveils 22nd sanctions"],
  ["20:00", "Brentford 4-0 Everton"],
  ["20:41", "Iran flogs singer Ahmadi"],
  ["21:00", "Nasdaq closes +6.5%"],
];

// DATE CHECK — big stories left out, with their real dates.
export const DATE_CHECK: string[] = [
  "COP31 collapses, no deal — Sun 22 Nov — longest COP ever",
  "Russian warship hit off Libya — Sun 22 Nov — claim is today",
  "Don Toliver concert evacuated — Sun 22 Nov — 12,000 out",
  "Liverpool rout United 4-0 — Sun 22 Nov — Pochettino debut",
  "Mets agree $450M Skubal deal — Sun 22 Nov — pitcher record",
  "'Molly' Meldrum dies, 83 — Sun 22 Nov — announced Monday",
  "Dymer flats strike — Sun 22 Nov — today's story is the toll",
  "Kryvyi Rih mall strike — Fri 20 Nov — toll 16 by Saturday",
  "Missiles land in Poland — Fri 20 Nov — today: drone + AWACS",
  "Sparta II ship hit — Sat 21 Nov — Finland summons envoy Mon",
  "'Chapo Isidro' captured — Fri 20 Nov — extradition is today",
  "ICJ: Myanmar genocide — Thu 19 Nov — 14 nations press Mon",
  "Bayelsa boat capsizes — Fri 20 Nov — 29 dead, toll set Sun",
];

export const NOT_YET =
  "NOT YET — Amazon Leo launch, 24 Nov · US inflation + GDP data, 25 Nov · EU budget summit, 26-27 Nov · Thanksgiving, 26 Nov · Spain votes, 29 Nov · 'Heal' airs, 29 Nov · OPEC+ meets, 29 Nov";

export const REGION_BAR =
  "Europe 14 · Americas 12 · Middle East 5 · Asia-Pacific 4 · Global 4 · Africa 3 · Oceania 1";

export const REGION_COLORS: Record<string, [number, number, number]> = {
  americas: [46, 125, 50],
  europe: [30, 90, 168],
  mideast: [123, 74, 160],
  asia: [0, 121, 107],
  africa: [196, 120, 20],
  oceania: [38, 38, 38],
  global: [110, 110, 110],
};
