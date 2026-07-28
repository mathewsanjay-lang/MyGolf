// Golf club reference data.
// `pro` = typical PGA Tour carry distance (yards) — the number to aspire to.
// Clubs are listed longest → shortest so charts and lists read naturally.
window.GOLF_CLUBS = [
  { id: "driver",   name: "Driver",         short: "Dr",  pro: 282 },
  { id: "fairway",  name: "Fairway Wood",   short: "FW",  pro: 250 },
  { id: "hybrid",   name: "Hybrid",         short: "Hy",  pro: 231 },
  { id: "iron5",    name: "5 Iron",         short: "5i",  pro: 194 },
  { id: "iron6",    name: "6 Iron",         short: "6i",  pro: 183 },
  { id: "iron7",    name: "7 Iron",         short: "7i",  pro: 172 },
  { id: "iron8",    name: "8 Iron",         short: "8i",  pro: 160 },
  { id: "iron9",    name: "9 Iron",         short: "9i",  pro: 148 },
  { id: "pw",       name: "Pitching Wedge", short: "PW",  pro: 136 },
  { id: "sw",       name: "Sand Wedge",     short: "SW",  pro: 110 },
];

// Units: yards by default. Stored distances are always in yards internally.
window.GOLF_UNIT = "yd";
