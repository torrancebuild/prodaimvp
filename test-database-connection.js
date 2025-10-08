const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read environment variables from .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Testing Database Connection...');
console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Not set');
console.log('Supabase Key:', supabaseKey ? 'Set' : 'Not set');

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
  try {
    console.log('\n1. Testing simple insert...');
    const { data, error } = await supabase
      .from('meetings')
      .insert([{
        title: 'Test Meeting',
        raw_notes: 'Testing database connection and RLS policies'
      }])
      .select();

    if (error) {
      console.log('❌ Insert Error:', error.message);
      console.log('Error code:', error.code);
      console.log('Error details:', error.details);
      console.log('Error hint:', error.hint);
      
      if (error.message.includes('row-level security policy')) {
        console.log('\n🔧 RLS Policy Issue Detected!');
        console.log('The row-level security policies are not properly configured.');
        console.log('Please run the fix-rls-policies.sql script in your Supabase SQL Editor.');
      }
    } else {
      console.log('✅ Insert successful!');
      console.log('Inserted data:', data);
      
      // Clean up test data
      console.log('\n2. Cleaning up test data...');
      const { error: deleteError } = await supabase
        .from('meetings')
        .delete()
        .eq('title', 'Test Meeting');
        
      if (deleteError) {
        console.log('⚠️ Cleanup error:', deleteError.message);
      } else {
        console.log('✅ Test data cleaned up');
      }
    }
  } catch (err) {
    console.log('❌ Unexpected error:', err.message);
  }
}

testDatabase();
