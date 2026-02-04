const normalizeCityName = (name) => {
  return (name || '').toLowerCase()
    .replace(/\s+(mkt|market)\s*$/i, '')
    .replace(/\b(ft\.?|fort)\b/g, 'fort')
    .replace(/\b(st\.?|saint)\b/g, 'saint')
    .replace(/\b(mt\.?|mount)\b/g, 'mount')
    .replace(/[^a-z0-9]/g, '');
};

const tests = [
    { kma: 'Lexington Mkt', city: 'Lexington', expect: true },
    { kma: 'Columbus Mkt', city: 'Columbus', expect: true },
    { kma: 'Ft Wayne Mkt', city: 'Fort Wayne', expect: true },
    { kma: 'Ft. Wayne Mkt', city: 'Fort Wayne', expect: true },
    { kma: 'St. Louis Mkt', city: 'Saint Louis', expect: true },
    { kma: 'St Louis Mkt', city: 'Saint Louis', expect: true },
    { kma: 'Birmingham Mkt', city: 'Birmingham', expect: true },
];

tests.forEach(t => {
    const kup = normalizeCityName(t.kma);
    const cup = normalizeCityName(t.city);
    const match = kup === cup;
    console.log(`| ${t.kma} (${kup}) | ${t.city} (${cup}) | Matched: ${match} | Expected: ${t.expect} |`);
});
