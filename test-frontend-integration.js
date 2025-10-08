// Test frontend integration
const fetch = require('node-fetch');

async function testFrontendIntegration() {
  console.log('Testing frontend integration...');
  
  const baseUrl = 'http://localhost:3002';
  
  try {
    // Test 1: Check if the main page loads
    console.log('1. Testing main page load...');
    const mainPageResponse = await fetch(`${baseUrl}/`);
    if (mainPageResponse.ok) {
      console.log('✅ Main page loads successfully');
    } else {
      console.log('❌ Main page failed to load:', mainPageResponse.status);
    }
    
    // Test 2: Test API endpoint with various inputs
    console.log('2. Testing API endpoint with different inputs...');
    
    const testCases = [
      {
        name: 'Valid input',
        input: 'Sprint planning meeting: We discussed Q1 features. John will implement auth by Friday. Sarah needs to review DB schema. Mike reported payment integration is blocked.',
        expectedStatus: 200
      },
      {
        name: 'Input too short',
        input: 'Short',
        expectedStatus: 400
      },
      {
        name: 'Input too long',
        input: 'A'.repeat(1001),
        expectedStatus: 400
      },
      {
        name: 'Empty input',
        input: '',
        expectedStatus: 400
      },
      {
        name: 'Non-string input',
        input: 123,
        expectedStatus: 400
      }
    ];
    
    for (const testCase of testCases) {
      try {
        const response = await fetch(`${baseUrl}/api/summarize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ input: testCase.input }),
        });
        
        if (response.status === testCase.expectedStatus) {
          console.log(`✅ ${testCase.name}: Status ${response.status} (expected ${testCase.expectedStatus})`);
        } else {
          console.log(`❌ ${testCase.name}: Status ${response.status} (expected ${testCase.expectedStatus})`);
        }
        
        if (response.ok) {
          const data = await response.json();
          console.log(`   Response structure: ${Object.keys(data).join(', ')}`);
        } else {
          const error = await response.json();
          console.log(`   Error: ${error.error}`);
        }
      } catch (error) {
        console.log(`❌ ${testCase.name}: Request failed - ${error.message}`);
      }
    }
    
    // Test 3: Test response structure
    console.log('3. Testing response structure...');
    const validResponse = await fetch(`${baseUrl}/api/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        input: 'Sprint review meeting: Completed user authentication feature. John will fix the login bug by tomorrow. Sarah needs to update documentation. Next sprint focuses on mobile optimization.' 
      }),
    });
    
    if (validResponse.ok) {
      const data = await validResponse.json();
      const requiredFields = ['summaryPoints', 'actionItems', 'openQuestions', 'meetingType', 'developmentTeamSections'];
      const missingFields = requiredFields.filter(field => !(field in data));
      
      if (missingFields.length === 0) {
        console.log('✅ Response structure is correct');
        console.log(`   Summary points: ${data.summaryPoints.length}`);
        console.log(`   Action items: ${data.actionItems.length}`);
        console.log(`   Open questions: ${data.openQuestions.length}`);
        console.log(`   Meeting type: ${data.meetingType}`);
        console.log(`   Development sections: ${Object.keys(data.developmentTeamSections).join(', ')}`);
      } else {
        console.log(`❌ Missing required fields: ${missingFields.join(', ')}`);
      }
    } else {
      console.log('❌ Valid request failed:', validResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Frontend integration test failed:', error.message);
  }
}

testFrontendIntegration();
