// List of major freight hubs and industrial centers for smart prioritization
// Based on verified freight volume and DAT market data

// Grouped by State for efficient querying
export const MAJOR_HUBS_BY_STATE: Record<string, string[]> = {
  AL: ["birmingham", "mobile", "huntsville", "montgomery", "tuscaloosa", "decatur", "dothan", "auburn", "opelika", "bessemer"],
  AZ: ["phoenix", "tucson", "mesa", "chandler", "glendale", "scottsdale", "gilbert", "tempe", "yuma", "nogales"],
  AR: ["little rock", "fort smith", "fayetteville", "springdale", "jonesboro", "north little rock", "conway", "rogers", "texarkana", "west memphis", "mansfield", "russellville"],
  CA: ["los angeles", "long beach", "oakland", "san diego", "san francisco", "sacramento", "fresno", "stockton", "san bernardino", "riverside", "ontario", "fontana", "bakersfield", "hayward", "compton", "torrance", "chino"],
  CO: ["denver", "colorado springs", "aurora", "fort collins", "lakewood", "thornton", "pueblo", "arvada", "grand junction", "greeley"],
  CT: ["bridgeport", "new haven", "hartford", "stamford", "waterbury", "norwalk", "danbury", "new britain", "bristol", "meriden"],
  DE: ["wilmington", "dover", "newark", "middletown", "smyrna", "milford", "seaford", "georgetown", "elsmere", "new castle"],
  FL: ["jacksonville", "miami", "tampa", "orlando", "st. petersburg", "hialeah", "tallahassee", "fort lauderdale", "port st. lucie", "cape coral", "doral", "medley", "lakeland"],
  GA: ["atlanta", "savannah", "columbus", "augusta", "macon", "forest park", "mcdonough", "norcross", "marietta", "valdosta", "dalton", "gainesville", "pooler", "garden city", "tifton"],
  ID: ["boise", "meridian", "nampa", "idaho falls", "pocatello", "caldwell", "twin falls", "coeur d'alene", "lewiston", "post falls"],
  IL: ["chicago", "joliet", "naperville", "rockford", "elgin", "peoria", "champaign", "bloomington", "decatur", "elk grove village", "bolingbrook"],
  IN: ["indianapolis", "fort wayne", "evansville", "south bend", "carmel", "fishers", "bloomington", "hammond", "gary", "lafayette", "elkhart", "kokomo"],
  IA: ["des moines", "cedar rapids", "davenport", "sioux city", "iowa city", "waterloo", "ames", "council bluffs", "dubuque", "ankeny"],
  KS: ["wichita", "overland park", "kansas city", "olathe", "topeka", "lawrence", "shawnee", "manhattan", "lenexa", "salina"],
  KY: ["louisville", "lexington", "bowling green", "owensboro", "covington", "florence", "georgetown", "hopkinsville", "richmond", "elizabethtown", "erlanger"],
  LA: ["new orleans", "baton rouge", "shreveport", "lafayette", "lake charles", "bossier city", "kenner", "monroe", "alexandria", "houma"],
  ME: ["portland", "lewiston", "bangor", "south portland", "auburn", "biddeford", "sanford", "augusta", "saco", "westbrook"],
  MD: ["baltimore", "frederick", "rockville", "gaithersburg", "bowie", "hagerstown", "annapolis", "salisbury", "laurel", "greenbelt", "jessup"],
  MA: ["boston", "worcester", "springfield", "lowell", "cambridge", "brockton", "new bedford", "fall river", "quincy", "lynn"],
  MI: ["detroit", "grand rapids", "warren", "sterling heights", "ann arbor", "lansing", "flint", "dearborn", "livonia", "troy", "romulus"],
  MN: ["minneapolis", "st. paul", "rochester", "duluth", "bloomington", "brooklyn park", "plymouth", "st. cloud", "eagan", "woodbury", "anoka"],
  MS: ["jackson", "gulfport", "southaven", "hattiesburg", "biloxi", "meridian", "tupelo", "olive branch", "greenville", "horn lake"],
  MO: ["kansas city", "st. louis", "springfield", "columbia", "independence", "lee's summit", "o'fallon", "st. joseph", "st. charles", "joplin"],
  MT: ["billings", "missoula", "great falls", "bozeman", "butte", "helena", "kalispell", "havre", "anaconda", "miles city"],
  NE: ["omaha", "lincoln", "bellevue", "grand island", "kearney", "fremont", "hastings", "norfolk", "north platte", "columbus"],
  NV: ["las vegas", "henderson", "reno", "north las vegas", "sparks", "carson city", "fernley", "elko", "mesquite", "boulder city"],
  NH: ["manchester", "nashua", "concord", "derry", "dover", "rochester", "salem", "merrimack", "hudson", "keene"],
  NJ: ["newark", "jersey city", "paterson", "elizabeth", "edison", "woodbridge", "lakewood", "toms river", "hamilton", "trenton", "kearny", "secaucus"],
  NM: ["albuquerque", "las cruces", "rio rancho", "santa fe", "roswell", "farmington", "clovis", "hobbs", "alamogordo", "carlsbad"],
  NY: ["new york", "buffalo", "rochester", "yonkers", "syracuse", "albany", "new rochelle", "mount vernon", "schenectady", "utica", "cheektowaga"],
  NC: ["charlotte", "raleigh", "greensboro", "durham", "winston-salem", "fayetteville", "cary", "wilmington", "high point", "concord", "gastonia", "seaboard", "riegelwood"],
  ND: ["fargo", "bismarck", "grand forks", "minot", "west fargo", "williston", "dickinson", "mandan", "jamestown", "wahpeton"],
  OH: ["columbus", "cleveland", "cincinnati", "toledo", "akron", "dayton", "parma", "canton", "youngstown", "lorain", "obetz"],
  OK: ["oklahoma city", "tulsa", "norman", "broken arrow", "lawton", "edmond", "moore", "midwest city", "enid", "stillwater"],
  OR: ["portland", "salem", "eugene", "gresham", "hillsboro", "beaverton", "bend", "medford", "springfield", "corvallis"],
  PA: ["philadelphia", "pittsburgh", "allentown", "erie", "reading", "scranton", "bethlehem", "lancaster", "harrisburg", "altoona", "carlisle", "king of prussia", "oxford", "delano"],
  RI: ["providence", "warwick", "cranston", "pawtucket", "east providence", "woonsocket", "coventry", "cumberland", "north providence", "south kingstown"],
  SC: ["charleston", "columbia", "north charleston", "mount pleasant", "rock hill", "greenville", "summerville", "goose creek", "spartanburg", "florence", "greer", "newberry"],
  SD: ["sioux falls", "rapid city", "aberdeen", "brookings", "watertown", "mitchell", "yankton", "pierre", "huron", "spearfish"],
  TN: ["nashville", "memphis", "knoxville", "chattanooga", "clarksville", "murfreesboro", "franklin", "jackson", "johnson city", "bartlett", "sweetwater", "bulls gap"],
  TX: ["houston", "san antonio", "dallas", "austin", "fort worth", "el paso", "arlington", "corpus christi", "plano", "laredo", "irving", "garland", "grand prairie", "mckinney", "frisco", "brownsville", "pasadena", "killeen", "mcallen", "mesquite", "midland", "waco", "carrollton", "denton", "abilene", "odessa", "beaumont"],
  UT: ["salt lake city", "west valley city", "provo", "west jordan", "orem", "sandy", "ogden", "st. george", "layton", "millcreek"],
  VT: ["burlington", "south burlington", "rutland", "barre", "montpelier", "winooski", "st. albans", "newport", "vergennes", "essex junction"],
  VA: ["virginia beach", "norfolk", "chesapeake", "richmond", "newport news", "alexandria", "hampton", "roanoke", "portsmouth", "suffolk", "lynchburg"],
  WA: ["seattle", "spokane", "tacoma", "vancouver", "bellevue", "kent", "everett", "renton", "yakima", "federal way", "sumner", "fife"],
  WV: ["charleston", "huntington", "morgantown", "parkersburg", "wheeling", "weirton", "fairmont", "martinsburg", "beckley", "clarksburg"],
  WI: ["milwaukee", "madison", "green bay", "kenosha", "racine", "appleton", "waukesha", "eau claire", "oshkosh", "janesville"],
  WY: ["cheyenne", "casper", "laramie", "gillette", "rock springs", "sheridan", "green river", "evanston", "riverton", "jackson"],
  
  // Mapped Canadian Cities
  ON: ["toronto", "ottawa", "hamilton", "kitchener", "london", "oshawa", "windsor", "barrie", "guelph", "kingston", "milton", "thunder bay", "brampton", "mississauga", "vaughan", "markham"],
  QC: ["montreal", "quebec city", "sherbrooke", "laval"],
  BC: ["vancouver", "victoria", "kelowna", "abbotsford", "surrey"],
  AB: ["calgary", "edmonton"],
  MB: ["winnipeg"],
  SK: ["saskatoon", "regina"],
  NS: ["halifax"],
  NB: ["moncton", "saint john"],
  NL: ["st. john's"],
  PE: [],
};

// Flatten values into a single set for O(1) lookups
export const MAJOR_HUBS = new Set(Object.values(MAJOR_HUBS_BY_STATE).flat());

export const FREIGHT_KEYWORDS = [
  'port', 'industrial', 'terminal', 'point', 'city', 'heights', 'park', 'logistics', 'hub'
];

export const DENSE_STATES = new Set([
  'MA', 'CT', 'RI', 'NJ', 'NY', 'PA', 'MD', 'DE', // Northeast
  'FL', 'TX', 'CA', 'IL' // Major freight states
]);
