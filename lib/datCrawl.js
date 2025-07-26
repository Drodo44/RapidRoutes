import supabase from '../utils/supabaseClient';
import Papa from 'papaparse';

const randomWeight = () => Math.floor(Math.random() * (48000 - 46750 + 1)) + 46750;

async function getCrawlCities(baseCity, type) {
  const { data } = await supabase.from('cities')
    .select('*').neq('zip', baseCity.zip).ilike('state_or_province', baseCity.state_or_province).limit(10);
  return data || [];
}

async function buildLaneRows(lane) {
  const originCity = { city: lane.origin_city, state_or_province: lane.origin_state, zip: lane.origin_zip };
  const destCity = { city: lane.dest_city, state_or_province: lane.dest_state, zip: lane.dest_zip };
  const crawlOrigins = await getCrawlCities(originCity, 'origin');
  const crawlDests = await getCrawlCities(destCity, 'dest');

  const postings = [];
  const buildPosting = (pickup, delivery, contactMethod) => ({
    'Pickup Earliest*': lane.date, 'Pickup Latest': lane.date,
    'Length (ft)*': lane.length || 48,
    'Weight (lbs)*': lane.randomize_weight ? randomWeight() : lane.weight,
    'Full/Partial*': 'Full', 'Equipment*': lane.equipment || 'FD',
    'Use Private Network*': 'NO', 'Private Network Rate': '',
    'Allow Private Network Booking': 'NO', 'Allow Private Network Bidding': 'NO',
    'Use DAT Loadboard*': 'YES', 'DAT Loadboard Rate': '',
    'Allow DAT Loadboard Booking': 'NO', 'Use Extended Network': 'NO',
    'Contact Method*': contactMethod,
    'Origin City*': pickup.city, 'Origin State*': pickup.state_or_province, 'Origin Postal Code': pickup.zip,
    'Destination City*': delivery.city, 'Destination State*': delivery.state_or_province, 'Destination Postal Code': delivery.zip,
    'Comment': lane.comment || '', 'Commodity': '', 'Reference ID': lane.id || ''
  });

  const allOrigins = [originCity, ...crawlOrigins];
  const allDests = [destCity, ...crawlDests];
  for (let i = 0; i < allOrigins.length; i++) {
    const pickup = allOrigins[i] || originCity;
    const delivery = allDests[i % allDests.length] || destCity;
    postings.push(buildPosting(pickup, delivery, 'Email'));
    postings.push(buildPosting(pickup, delivery, 'Primary Phone'));
  }
  return postings;
}

export async function generateDatCsv() {
  const { data: lanes } = await supabase.from('lanes').select('*').eq('status', 'Active');
  const allRows = [];
  for (const lane of lanes) {
    const rows = await buildLaneRows(lane);
    allRows.push(...rows);
  }
  return Papa.unparse(allRows, { quotes: true });
}
