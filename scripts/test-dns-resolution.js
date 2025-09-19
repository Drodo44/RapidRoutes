// scripts/test-dns-resolution.js
import dns from 'dns';
import { promisify } from 'util';

const lookup = promisify(dns.lookup);
const resolve4 = promisify(dns.resolve4);

async function testDNS() {
  const host = 'fsvxslwyszokanehzrby.supabase.co';
  
  console.log(`Testing DNS resolution for ${host}...`);
  
  try {
    // Try lookup (uses system resolver)
    console.log('\nTrying system DNS lookup...');
    const lookupResult = await lookup(host);
    console.log('Lookup result:', lookupResult);
  } catch (error) {
    console.error('Lookup failed:', error);
  }
  
  try {
    // Try resolve4 (uses DNS servers directly)
    console.log('\nTrying direct DNS resolution...');
    const resolveResult = await resolve4(host);
    console.log('Resolve result:', resolveResult);
  } catch (error) {
    console.error('Resolution failed:', error);
  }
}

testDNS();