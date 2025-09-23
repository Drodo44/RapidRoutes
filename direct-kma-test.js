// direct-kma-test.js
// Test script for KMA lookup endpoint

fetch('https://rapid-routes.vercel.app/api/kma-lookup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    lane_id: "61f287f5-278a-4277-b3fe-9055aad1fec8",
    origin_city: "Riegelwood",
    origin_state: "NC",
    destination_city: "Massillon",
    destination_state: "OH",
    equipment_code: "V"
  })
})
.then(response => {
  console.log('Status:', response.status, response.statusText);
  console.log('Headers:', JSON.stringify(Object.fromEntries([...response.headers]), null, 2));
  return response.text();
})
.then(text => {
  console.log('Body:', text);
  try {
    const json = JSON.parse(text);
    console.log('Parsed JSON:', JSON.stringify(json, null, 2));
  } catch (e) {
    console.log('Not valid JSON');
  }
})
.catch(error => {
  console.error('Error:', error);
});