/* data.ts — the day's stories (UTC 23 Nov 2026), facts as recorded in
   research-23nov.md. fact = the one big rendered fact in the card's scene;
   tag = certainty + source; brief = complete sentences only. */

export const PAPER = [247, 242, 231];
export const CARD = [255, 253, 246];
export const INK = [26, 23, 19];
export const FAINT = [104, 96, 80];
export const HAIR = [198, 188, 164];
export const NAVY = [30, 55, 92];
export const TEAL = [18, 96, 84];
export const RUST = [166, 44, 30];
export const GOLD = [176, 118, 20];
export const MOSS = [52, 104, 52];
export const PLUM = [110, 58, 130];
export const SKY = [38, 106, 150];
export const CREAM = [255, 244, 214];

export const TAGC = { CONFIRMED: [24, 96, 56], REPORTED: [178, 122, 18], CLAIM: [176, 44, 38] };
export const REGC = {
  'Middle East': RUST, 'Europe': NAVY, 'Africa': GOLD, 'Americas': TEAL,
  'Asia-Pacific': PLUM, 'Oceania': SKY, 'Global': [88, 82, 74],
};

export const LEADS = [
  {
    n: 1, region: 'Americas', tag: 'CONFIRMED', src: 'REUTERS', art: NAVY, scene: 'chip',
    fact: '+31%', factSub: 'NVIDIA SHARES; NASDAQ +6.5%',
    head: 'Huang returns as Nvidia chief; Wall Street roars back',
    brief: 'Huang is back 11 days after resigning in scandal; shares jump 31% and Wall Street roars to a record rebound.',
  },
  {
    n: 2, region: 'Europe', tag: 'CONFIRMED', src: 'REUTERS', art: TEAL, scene: 'summit',
    fact: '9 YEARS', factSub: 'IN EXILE, ENDED BY THE COURT',
    head: 'Puigdemont free to return after nine years in exile',
    brief: 'The Supreme Court shelves the case; the Catalan leader may come home after nine years in exile in Belgium.',
  },
  {
    n: 3, region: 'Americas', tag: 'CONFIRMED', src: 'AP', art: PLUM, scene: 'gavel',
    fact: '3M', factSub: 'SEXUALISED IMAGES, CCDH COUNT',
    head: "Two states sue Musk over Grok's sexualised deepfakes",
    brief: "Virginia and Oregon file the first state suits over Grok's sexualised deepfakes; the suits cite 3 million images.",
  },
];

export const CARDS = [
  {
    n: 4, region: 'Europe', tag: 'CONFIRMED', src: 'AP', art: NAVY, scene: 'bank',
    fact: '60 BANKS', factSub: 'OFF SWIFT IN 22ND PACKAGE',
    head: 'EU unveils 22nd Russia sanctions',
    brief: 'The package cuts 60 banks off SWIFT and hits crypto, 70 shadow-fleet ships and Russian flags.',
  },
  {
    n: 5, region: 'Asia-Pacific', tag: 'CONFIRMED', src: 'REUTERS', art: RUST, scene: 'factory',
    fact: '24 DEAD', factSub: 'CONFIRMED MONDAY; ~30 MISSING',
    head: 'Indonesia confirms 24 dead in candy-factory fire',
    brief: 'The Cikande blaze broke out on Saturday; about 30 people are still missing in the burned factory.',
  },
  {
    n: 6, region: 'Middle East', tag: 'CONFIRMED', src: 'BBC', art: MOSS, scene: 'gaza',
    fact: '99%', factSub: 'OF GAZA CONTAMINATED',
    head: "Gaza is now a 'toxic wasteland', Oxfam warns",
    brief: 'Oxfam says signs of contamination cover 99% of the territory; three more were killed on Monday.',
  },
  {
    n: 7, region: 'Americas', tag: 'CONFIRMED', src: 'REUTERS', art: TEAL, scene: 'chartup',
    fact: '$43.9BN', factSub: 'ALL-STOCK CYBER DEAL',
    head: 'CrowdStrike to buy Zscaler in a $43.9bn deal',
    brief: 'Zscaler holders get 1.135 CrowdStrike shares each, a 34% premium; the close is due in fiscal 2028.',
  },
  {
    n: 8, region: 'Middle East', tag: 'CONFIRMED', src: 'REUTERS', art: PLUM, scene: 'stage',
    fact: '74 LASHES', factSub: 'FOR SINGING WITHOUT HIJAB',
    head: 'Iran flogs singer Ahmadi 74 times over hijab video',
    brief: 'Ahmadi and four of her team were lashed in Qom for a 2024 concert filmed without the mandatory hijab.',
  },
  {
    n: 9, region: 'Europe', tag: 'CONFIRMED', src: 'PREM LEAGUE', art: MOSS, scene: 'stadium',
    fact: '4-0', factSub: 'BRENTFORD BEAT EVERTON',
    head: 'Brentford thrash Everton 4-0 on Monday night',
    brief: 'Lewis-Potter scored twice in two minutes as Brentford closed Matchday 11 with a rout.',
  },
  {
    n: 10, region: 'Europe', tag: 'CONFIRMED', src: 'SKY NEWS', art: SKY, scene: 'hospital',
    fact: '700,000', factSub: 'WOMEN TO BE INVITED',
    head: 'AI breast-screening trial to invite 700,000 women',
    brief: 'The EDITH trial will test AI-assisted mammogram reading at 30 UK sites over three years.',
  },
  {
    n: 11, region: 'Europe', tag: 'CONFIRMED', src: 'REUTERS', art: NAVY, scene: 'radar',
    fact: 'AWACS', factSub: 'NATO SENDS TO POLAND',
    head: 'Russian drone enters Poland; NATO sends AWACS',
    brief: "A drone briefly crossed into Polish airspace in Russia's night attack on western Ukraine.",
  },
  {
    n: 12, region: 'Americas', tag: 'CONFIRMED', src: 'REUTERS', art: GOLD, scene: 'barrels',
    fact: '10,000 LB', factSub: 'OF EXPLOSIVE CHEMICAL',
    head: 'Trump halts the Iowa blast of 10,000 lb of explosive',
    brief: 'The Army planned to detonate 68 barrels of degraded lead azide until a court stay stopped it.',
  },
  {
    n: 13, region: 'Oceania', tag: 'CONFIRMED', src: 'USGS', art: GOLD, scene: 'andes',
    fact: 'M6.5', factSub: '601 KM DOWN, NO DAMAGE',
    head: 'Deep M6.5 quake shakes the Pacific; no damage',
    brief: 'The quake struck 601 km down in the Vanuatu region; a green alert was issued, with no damage.',
  },
];

// Rest of the day: bold lead word, then one line holding a number or a name.
export const REST = [
  [14, 'Africa', 'Congo', 'halts cobalt exports from 30 Nov to lift prices.'],
  [15, 'Africa', 'Ituri', 'fighting traps Ebola responders; WHO pleads for peace.'],
  [16, 'Middle East', 'Iran', 'courts say the US owes $290bn in damages.'],
  [17, 'Middle East', 'Iran', 'vows to counter the US blockade of Hormuz.'],
  [18, 'Middle East', 'Libya', 'Kyiv claims it sank the Merkury; Albania denies a role.'],
  [19, 'Europe', 'Dymer', 'toll rises to 15 as bodies come from the flats.'],
  [20, 'Europe', 'Estonia', "Moscow warns of acts 'on the verge of open war'."],
  [21, 'Europe', 'Babis', 'joins Orban in rejecting the EU budget plan.'],
  [22, 'Europe', 'Kaliningrad', 'Russia to spend $576m on ferries for the exclave.'],
  [23, 'Europe', 'Compass', 'plans to move its listing to New York.'],
  [24, 'Europe', 'Catherine', "opens up on cancer in BBC film 'Heal'."],
  [25, 'Americas', 'Trump', "attacks Newsom's 548 commutations at the Justice Dept."],
  [26, 'Americas', 'Gomez', 'to resign after ethics finds sexual misconduct.'],
  [27, 'Americas', 'Democrats', 'plan 12 debates for 2028; first in June 2027.'],
  [28, 'Americas', 'Democrats', 'majority confirmed at 258, largest since 1992.'],
  [29, 'Americas', 'Chapo Isidro', 'US seeks extradition of the captured cartel boss.'],
  [30, 'Americas', '49ers', 'rout the Vikings 35-10 in Mexico City.'],
  [31, 'Asia-Pacific', 'Modi', 'gives Nepal a NPR 24,000-crore rebuild package.'],
  [32, 'Asia-Pacific', 'Megaspeed', 'US blacklists the firm at the heart of the Nvidia scandal.'],
  [33, 'Asia-Pacific', 'Quakes', 'PNG M5.0, Macquarie M5.5 and China M4.9; no damage.'],
  [34, 'Global', 'WFP', 'wars put food aid for 7.3m more people at risk.'],
  [35, 'Global', 'OPCW', 'faces a budget crisis over US arrears.'],
];

// The day in UTC — exact times only, as recorded in the research notes.
export const STRIP = [
  ['02:40', 'Vanuatu quake, M6.5'],
  ['09:00', 'Eurozone PMI holds, 51.7'],
  ['14:20', 'Nvidia reinstates Huang'],
  ['14:43', 'Fourteen nations press Myanmar'],
  ['15:35', 'EU unveils 22nd sanctions'],
  ['20:00', 'Brentford 4-0 Everton'],
  ['20:41', 'Iran flogs singer Ahmadi'],
  ['21:00', 'Nasdaq closes +6.5%'],
];

// Big stories left out on purpose, with their real dates (research DATE CHECK).
export const DATECHECK = [
  ['COP31 collapses, no climate deal', 'Sun 22 Nov', 'the longest COP ever'],
  ['Russian warship hit off Libya', 'Sun 22 Nov', "Kyiv's claim is today"],
  ['Don Toliver concert evacuated', 'Sun 22 Nov 22:00', '12,000 out; O2 show moved'],
  ['Liverpool rout United 4-0', 'Sun 22 Nov', "Pochettino's debut"],
  ['Mets agree $450M Skubal deal', 'Sun 22 Nov', 'a record for a pitcher'],
  ["'Molly' Meldrum dies, 83", 'Sun 22 Nov 18:30', 'announced Monday'],
  ['Dymer flats strike', 'Sun 22 Nov', "today's story is the toll"],
  ['Kryvyi Rih mall strike', 'Fri 20 Nov', 'toll reached 16 on Saturday'],
  ['Russian missiles land in Poland', 'Fri 20 Nov', 'today: drone + AWACS'],
  ['Sparta II cargo ship hit', 'Sat 21 Nov', 'Finland summons envoy Monday'],
  ["'Chapo Isidro' captured", 'Fri 20 Nov', 'extradition order is today'],
  ['ICJ: Myanmar guilty of genocide', 'Thu 19 Nov', '14 nations press Monday'],
  ['Riemann proof claim', 'Fri 20 Nov', 'checks done Sat 21 Nov'],
  ['Bayelsa boat capsizes', 'Fri 20 Nov', '29 dead, toll set Sunday'],
];
export const NOTYET = 'Amazon Leo launch, 24 Nov • US data, 25 Nov • Thanksgiving, 26 Nov • EU summit, 26-27 Nov • Spain votes, 29 Nov • "Heal" airs, 29 Nov • OPEC+, 29 Nov • Compass results, 24 Nov';

/* World outline as rough lon/lat polygons, dotted onto the map panel. */
export const LAND = [
  [[-165,68],[-148,70],[-132,69],[-120,71],[-108,68],[-95,69],[-86,66],[-80,62],[-77,58],[-70,54],[-64,49],[-70,44],[-74,40],[-76,35],[-80,31],[-81,25],[-85,29],[-90,29],[-96,28],[-98,24],[-95,18],[-90,14],[-84,10],[-79,9],[-86,13],[-92,15],[-97,17],[-102,19],[-106,23],[-110,24],[-114,29],[-120,34],[-124,40],[-124,47],[-130,54],[-140,60],[-152,60],[-162,62]],
  [[-79,9],[-72,12],[-64,11],[-55,6],[-50,0],[-44,-3],[-35,-8],[-39,-13],[-41,-22],[-48,-27],[-55,-33],[-62,-38],[-65,-42],[-67,-50],[-69,-54],[-71,-50],[-73,-44],[-73,-37],[-71,-30],[-70,-20],[-70,-15],[-75,-10],[-79,-5],[-80,1],[-77,4]],
  [[-17,15],[-10,29],[-6,35],[3,37],[10,37],[20,32],[30,31],[34,28],[36,22],[39,15],[43,12],[48,11],[51,12],[46,5],[41,-2],[40,-12],[38,-20],[35,-27],[30,-32],[24,-34],[18,-33],[14,-25],[12,-15],[13,-5],[9,0],[9,4],[-2,5],[-8,5],[-13,8],[-17,12]],
  [[-9,43],[-2,49],[0,51],[5,53],[8,55],[8,58],[12,56],[18,56],[21,59],[24,59],[28,66],[32,70],[45,68],[60,69],[75,72],[90,74],[105,77],[120,73],[135,72],[150,70],[162,68],[172,66],[178,65],[170,60],[160,58],[156,52],[142,50],[140,42],[135,35],[129,33],[127,38],[122,38],[121,31],[118,25],[110,20],[108,15],[106,9],[103,6],[100,8],[98,13],[94,17],[91,22],[88,22],[86,20],[80,15],[77,8],[73,18],[70,22],[66,25],[61,25],[57,27],[52,28],[50,29],[48,30],[52,25],[55,24],[58,23],[59,22],[55,17],[52,15],[45,13],[43,12],[40,20],[35,28],[34,31],[36,36],[30,36],[27,37],[22,37],[19,40],[15,38],[12,42],[10,44],[8,44],[3,43],[0,40],[-2,37],[-6,36],[-9,37],[-9,43]],
  [[95,5],[100,8],[103,10],[105,9],[107,13],[109,15],[106,20],[110,21],[115,23],[118,25],[121,28],[120,32],[122,31],[118,28],[114,24],[110,20],[106,16],[103,12],[100,7],[97,6],[95,5]],
  [[113,-22],[114,-28],[115,-34],[118,-35],[124,-33],[129,-32],[133,-32],[136,-35],[139,-37],[141,-38],[145,-38],[147,-38],[150,-37],[153,-32],[153,-27],[151,-24],[148,-20],[146,-19],[143,-15],[142,-11],[141,-13],[139,-17],[136,-15],[135,-12],[132,-11],[130,-12],[126,-14],[122,-17],[118,-20],[113,-22]],
  [[130,31],[133,34],[137,35],[140,36],[141,40],[141,44],[142,45],[140,40],[139,37],[135,34],[132,33],[130,31]],
  [[-45,60],[-42,64],[-40,68],[-45,72],[-52,70],[-55,64],[-52,60],[-45,60]],
];

/* Illustrated pins: [story number, lon, lat] — region colour from the story. */
export const PINS = [
  [1, -122.03, 37.35], [2, -3.70, 40.42], [3, -77.46, 37.54], [4, 4.35, 50.85],
  [5, 106.34, -6.20], [6, 34.47, 31.50], [7, -97.74, 30.27], [8, 50.88, 34.64],
  [9, -0.27, 51.49], [10, 0.12, 52.20], [11, 21.01, 52.23], [12, -91.26, 40.83],
  [13, 172.24, -13.66],
];
export const REGION_OF = {};
for (const s of [...LEADS, ...CARDS]) REGION_OF[s.n] = s.region;
for (const r of REST) REGION_OF[r[0]] = r[1];
export const REGION_COUNTS = [
  ['Europe', 11], ['Americas', 10], ['Middle East', 5], ['Asia-Pacific', 4],
  ['Africa', 2], ['Global', 2], ['Oceania', 1],
];
