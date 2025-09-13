// 🔍 DATABASE CONNECTION DIAGNOSTIC
// Test if Supabase connection is working properly

import dotenv from 'dotenv';
dotenv.config();

import { adminSupabase } from './utils/supabaseClient.js';

async function testDatabaseConnection() {
    console.log('🔍 DATABASE CONNECTION DIAGNOSTIC');
    console.log('Environment variables loaded:');
    console.log('  SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING');
    console.log('  SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING');
    console.log('  NODE_ENV:', process.env.NODE_ENV);
    
    try {
        console.log('\n🧪 Testing basic city query...');
        
        const { data, error } = await adminSupabase
            .from('cities')
            .select('city, state_or_province, zip')
            .eq('city', 'Cincinnati')
            .eq('state_or_province', 'OH')
            .limit(5);
            
        if (error) {
            console.log('❌ Database query failed:', error);
            return false;
        }
        
        console.log('✅ Database query successful:');
        console.log('  Results found:', data?.length || 0);
        
        if (data && data.length > 0) {
            console.log('  Sample result:', data[0]);
            return true;
        } else {
            console.log('  No Cincinnati, OH found in database');
            
            // Try a broader search
            console.log('\n🔍 Trying broader city search...');
            const { data: allData, error: allError } = await adminSupabase
                .from('cities')
                .select('city, state_or_province')
                .limit(10);
                
            if (allError) {
                console.log('❌ Broader search failed:', allError);
                return false;
            }
            
            console.log('✅ Database has cities:');
            allData?.forEach(city => {
                console.log(`    ${city.city}, ${city.state_or_province}`);
            });
            
            return data && data.length > 0;
        }
        
    } catch (error) {
        console.log('💥 Database connection crashed:', error.message);
        return false;
    }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
    testDatabaseConnection()
        .then(success => {
            if (success) {
                console.log('\n✅ Database connection working');
                process.exit(0);
            } else {
                console.log('\n❌ Database connection broken');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('Database test crashed:', error);
            process.exit(1);
        });
}