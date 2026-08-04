// Golf club reference data — set: Callaway Paradym Ai Smoke driver & irons.
// `standard` = the typical distance this club "should" go for an average
//              amateur (a solid benchmark to hit consistently).
// `pro`      = typical PGA Tour carry distance — the number to aspire to.
// Distances in yards. Clubs listed longest → shortest.
window.GOLF_CLUBS = [
  { id: "driver",   name: "Driver",         short: "Dr",  standard: 230, pro: 282 },
  { id: "fairway",  name: "Fairway Wood",   short: "FW",  standard: 205, pro: 250 },
  { id: "hybrid",   name: "Hybrid",         short: "Hy",  standard: 190, pro: 231 },
  { id: "iron5",    name: "5 Iron",         short: "5i",  standard: 160, pro: 194 },
  { id: "iron6",    name: "6 Iron",         short: "6i",  standard: 150, pro: 183 },
  { id: "iron7",    name: "7 Iron",         short: "7i",  standard: 140, pro: 172 },
  { id: "iron8",    name: "8 Iron",         short: "8i",  standard: 130, pro: 160 },
  { id: "iron9",    name: "9 Iron",         short: "9i",  standard: 120, pro: 148 },
  { id: "pw",       name: "Pitching Wedge", short: "PW",  standard: 110, pro: 136 },
  { id: "sw",       name: "Sand Wedge",     short: "SW",  standard: 80,  pro: 110 },
];

// The equipment these benchmarks assume (shown in the app footer / info).
window.GOLF_SET = "Callaway Paradym Ai Smoke";

// Units: yards. Stored distances are always in yards internally.
window.GOLF_UNIT = "yd";
