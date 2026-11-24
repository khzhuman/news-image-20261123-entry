// Content for the one-day world news page: Monday 23 November 2026.
// Every string below is the page's editorial content: three lead stories,
// ten illustrated cards, the UTC strip, the brief wire, the date check.

export type RegionName =
  | "Europe"
  | "Americas"
  | "Middle East"
  | "Asia-Pacific"
  | "Africa"
  | "Global"
  | "Oceania";

export interface StoryCard {
  scene: string; // key of the silhouette scene painter
  fact: string; // the one big number/word painted over the scene
  caption: string; // small caps line inside the scene (leads only, else "")
  tag: string; // certainty + source chip, e.g. "CONFIRMED • REUTERS"
  region: string; // right-hand region label, "" when the page shows none
  headline: string;
  brief: string;
}

export const LEADS: StoryCard[] = [
  {
    scene: "chip",
    fact: "+31%",
    caption: "NVIDIA SHARES; NASDAQ +6.5%",
    tag: "CONFIRMED • REUTERS",
    region: "AMERICAS",
    headline: "Huang returns as Nvidia chief; Wall Street roars back",
    brief:
      "Huang is back 11 days after resigning in scandal; shares jump 31% " +
      "and Wall Street roars to a record rebound.",
  },
  {
    scene: "courthouse",
    fact: "9 YEARS",
    caption: "IN EXILE, ENDED BY THE COURT",
    tag: "CONFIRMED • REUTERS",
    region: "EUROPE",
    headline: "Puigdemont free to return after nine years in exile",
    brief:
      "The Supreme Court shelves the case; the Catalan leader may come " +
      "home after nine years in exile in Belgium.",
  },
  {
    scene: "scales",
    fact: "3M",
    caption: "SEXUALISED IMAGES, CCDH COUNT",
    tag: "CONFIRMED • AP",
    region: "AMERICAS",
    headline: "Two states sue Musk over Grok’s sexualised deepfakes",
    brief:
      "Virginia and Oregon file the first state suits over Grok’s " +
      "sexualised deepfakes; the suits cite 3 million images.",
  },
];

export const CARDS: StoryCard[] = [
  {
    scene: "bank",
    fact: "60 BANKS",
    caption: "",
    tag: "CONFIRMED • AP",
    region: "EUROPE",
    headline: "EU unveils 22nd Russia sanctions",
    brief:
      "The package cuts 60 banks off SWIFT and hits crypto, 70 " +
      "shadow-fleet ships and Russian flags.",
  },
  {
    scene: "factory",
    fact: "24 DEAD",
    caption: "",
    tag: "CONFIRMED • REUTERS",
    region: "",
    headline: "Indonesia confirms 24 dead in candy-factory fire",
    brief:
      "The Cikande blaze broke out on Saturday; about 30 people are " +
      "still missing in the burned factory.",
  },
  {
    scene: "gaza",
    fact: "99%",
    caption: "",
    tag: "CONFIRMED • BBC",
    region: "MIDDLE EAST",
    headline: "Gaza is now a ‘toxic wasteland’, Oxfam warns",
    brief:
      "Oxfam says signs of contamination cover 99% of the territory; " +
      "three more were killed on Monday.",
  },
  {
    scene: "skyline-arrow",
    fact: "$43.9BN",
    caption: "",
    tag: "CONFIRMED • REUTERS",
    region: "AMERICAS",
    headline: "CrowdStrike to buy Zscaler in a $43.9bn deal",
    brief:
      "Zscaler holders get 1.135 CrowdStrike shares each, a 34% " +
      "premium; the close is due in fiscal 2028.",
  },
  {
    scene: "stage",
    fact: "74 LASHES",
    caption: "",
    tag: "CONFIRMED • REUTERS",
    region: "",
    headline: "Iran flogs singer Ahmadi 74 times over hijab video",
    brief:
      "Ahmadi and four of her team were lashed in Qom for a 2024 " +
      "concert filmed without the mandatory hijab.",
  },
  {
    scene: "stadium",
    fact: "4-0",
    caption: "",
    tag: "CONFIRMED • PREM LEAGUE",
    region: "",
    headline: "Brentford thrash Everton 4-0 on Monday night",
    brief:
      "Lewis-Potter scored twice in two minutes as Brentford closed " +
      "Matchday 11 with a rout.",
  },
  {
    scene: "hospital",
    fact: "700,000",
    caption: "",
    tag: "CONFIRMED • SKY NEWS",
    region: "EUROPE",
    headline: "AI breast-screening trial to invite 700,000 women",
    brief:
      "The EDITH trial will test AI-assisted mammogram reading at 30 " +
      "UK sites over three years.",
  },
  {
    scene: "awacs",
    fact: "AWACS",
    caption: "",
    tag: "CONFIRMED • REUTERS",
    region: "EUROPE",
    headline: "Russian drone enters Poland; NATO sends AWACS",
    brief:
      "A drone briefly crossed into Polish airspace in Russia’s night " +
      "attack on western Ukraine.",
  },
  {
    scene: "barrels",
    fact: "10,000 LB",
    caption: "",
    tag: "CONFIRMED • REUTERS",
    region: "AMERICAS",
    headline: "Trump halts the Iowa blast of 10,000 lb of explosive",
    brief:
      "The Army planned to detonate 68 barrels of degraded lead azide " +
      "until a court stay stopped it.",
  },
  {
    scene: "quake",
    fact: "M6.5",
    caption: "",
    tag: "CONFIRMED • USGS",
    region: "OCEANIA",
    headline: "Deep M6.5 quake shakes the Pacific; no damage",
    brief:
      "The quake struck 601 km down in the Vanuatu region; a green " +
      "alert was issued, with no damage.",
  },
];

// "THE DAY IN UTC" strip: four columns of two entries, read down each column.
export const UTC_COLUMNS: string[][] = [
  ["02:40|Vanuatu quake, M6.5", "15:35|EU unveils 22nd sanctions"],
  ["09:00|Eurozone PMI holds, 51.7", "20:00|Brentford 4-0 Everton"],
  ["14:20|Nvidia reinstates Huang", "20:41|Iran flogs singer Ahmadi"],
  ["14:43|Fourteen nations press Myanmar", "21:00|Nasdaq closes +6.5%"],
];

export interface BriefLine {
  who: string; // bold lead-in name
  text: string; // rest of the one-line brief, after the em dash
  region: RegionName;
}

// "THE REST OF THE DAY — in brief": stories 14–24 left, 25–35 right.
export const BRIEFS: BriefLine[] = [
  { who: "Congo", text: "halts cobalt exports from 30 Nov to lift prices.", region: "Africa" },
  { who: "Ituri", text: "fighting traps Ebola responders; WHO pleads for peace.", region: "Africa" },
  { who: "Iran", text: "courts say the US owes $290bn in damages.", region: "Middle East" },
  { who: "Iran", text: "vows to counter the US blockade of Hormuz.", region: "Middle East" },
  { who: "Libya", text: "Kyiv claims it sank the Merkuriy; Albania denies a role.", region: "Europe" },
  { who: "Dymer", text: "toll rises to 15 as bodies come from the flats.", region: "Europe" },
  { who: "Estonia", text: "Moscow warns of acts ‘on the verge of open war’.", region: "Europe" },
  { who: "Babis", text: "joins Orban in rejecting the EU budget plan.", region: "Europe" },
  { who: "Kaliningrad", text: "Russia to spend $576m on ferries for the exclave.", region: "Europe" },
  { who: "Compass", text: "plans to move its listing to New York.", region: "Europe" },
  { who: "Catherine", text: "opens up on cancer in BBC film ‘Heal’.", region: "Europe" },
  { who: "Trump", text: "attacks Newsom’s 548 commutations at the Justice Dept.", region: "Americas" },
  { who: "Gomez", text: "to resign after ethics finds sexual misconduct.", region: "Americas" },
  { who: "Democrats", text: "plan 12 debates for 2028; first in June 2027.", region: "Americas" },
  { who: "Democrats", text: "majority confirmed at 258, largest since 1992.", region: "Americas" },
  { who: "Chapo Isidro", text: "US seeks extradition of the captured cartel boss.", region: "Americas" },
  { who: "49ers", text: "rout the Vikings 35-10 in Mexico City.", region: "Americas" },
  { who: "Modi", text: "gives Nepal a NPR 24,000-crore rebuild package.", region: "Asia-Pacific" },
  { who: "Megaspeed", text: "US blacklists the firm at the heart of the Nvidia scandal.", region: "Asia-Pacific" },
  { who: "Quakes", text: "PNG M5.0, Macquarie M5.5 and China M4.9; no damage.", region: "Asia-Pacific" },
  { who: "WFP", text: "wars put food aid for 7.3m more people at risk.", region: "Global" },
  { who: "OPCW", text: "faces a budget crisis over US arrears.", region: "Global" },
];

export interface DateCheckItem {
  name: string;
  date: string; // the story's real date, printed in red
  note: string;
}

export const DATE_CHECK_LEFT: DateCheckItem[] = [
  { name: "COP31 collapses, no climate deal", date: "Sun 22 Nov", note: "the longest COP ever" },
  { name: "Russian warship hit off Libya", date: "Sun 22 Nov", note: "Kyiv’s claim is today" },
  { name: "Don Toliver concert evacuated", date: "Sun 22 Nov 22:00", note: "12,000 out; O2 show moved" },
  { name: "Liverpool rout United 4-0", date: "Sun 22 Nov", note: "Pochettino’s debut" },
  { name: "Mets agree $450M Skubal deal", date: "Sun 22 Nov", note: "a record for a pitcher" },
  { name: "‘Molly’ Meldrum dies, 83", date: "Sun 22 Nov 18:30", note: "announced Monday" },
  { name: "Dymer flats strike", date: "Sun 22 Nov", note: "today’s story is the toll" },
];

export const DATE_CHECK_RIGHT: DateCheckItem[] = [
  { name: "Kryvyi Rih mall strike", date: "Fri 20 Nov", note: "toll reached 16 on Saturday" },
  { name: "Russian missiles land in Poland", date: "Fri 20 Nov", note: "today: drone + AWACS" },
  { name: "Sparta II cargo ship hit", date: "Sat 21 Nov", note: "Finland summons envoy Monday" },
  { name: "‘Chapo Isidro’ captured", date: "Fri 20 Nov", note: "extradition order is today" },
  { name: "ICJ: Myanmar guilty of genocide", date: "Thu 19 Nov", note: "14 nations press Monday" },
  { name: "Riemann proof claim", date: "Fri 20 Nov", note: "checks done Sat 21 Nov" },
  { name: "Bayelsa boat capsizes", date: "Fri 20 Nov", note: "29 dead, toll set Sunday" },
];

export const NOT_YET_TEXT =
  "Amazon Leo launch, 24 Nov • US data, 25 Nov • Thanksgiving, 26 Nov • " +
  "EU summit, 26-27 Nov • Spain votes, 29 Nov • “Heal” airs, 29 Nov • " +
  "OPEC+, 29 Nov • Compass results, 24 Nov";

export const LEGEND_LINES: string[] = [
  "Europe 11 · Americas 10 · Middle East 5 · Asia-Pacific 4",
  "Africa 2 · Global 2 · Oceania 1 — bar + pins by region",
];

// Region colours as [r, g, b], shared by the brief badges, the map pins
// and the segmented bar under the map.
export const REGION_RGB: Record<RegionName, [number, number, number]> = {
  Europe: [30, 55, 92],
  Americas: [18, 96, 84],
  "Middle East": [166, 44, 30],
  "Asia-Pacific": [110, 58, 130],
  Africa: [176, 118, 20],
  Global: [88, 82, 74],
  Oceania: [38, 106, 150],
};

// Bar segments under the map, in order, with their story counts.
export const BAR_SEGMENTS: { region: RegionName; count: number }[] = [
  { region: "Europe", count: 11 },
  { region: "Americas", count: 10 },
  { region: "Middle East", count: 5 },
  { region: "Asia-Pacific", count: 4 },
  { region: "Africa", count: 2 },
  { region: "Global", count: 2 },
  { region: "Oceania", count: 1 },
];
