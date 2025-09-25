const testInput = `Top-up Failures (Debit Cards): Multiple complaints from users unable to complete debit card top-ups (primarily with Bank X and Bank Y). Engineering confirmed payment gateway logs show intermittent declines. Possible acquirer-side issue. Action: Coordinate with gateway provider for root cause; set up incident tracker. Cashback Rewards Confusion: Customers unclear about cashback timing—some expect instant credit. Marketing confirmed T&Cs state "within 5 business days," but visibility in-app is limited`;

async function testProcessingTime() {
  console.log('🧪 Testing API Processing Time...\n');
  console.log('Input text length:', testInput.length, 'characters');
  console.log('Input preview:', testInput.substring(0, 100) + '...\n');
  
  const startTime = Date.now();
  
  try {
    const response = await fetch('http://localhost:3000/api/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: testInput }),
    });

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API Error: ${response.status} - ${errorData.error}`);
    }

    const result = await response.json();
    
    console.log('✅ API Response received successfully!');
    console.log(`⏱️  Processing time: ${processingTime}ms (${(processingTime / 1000).toFixed(2)} seconds)`);
    console.log('\n📊 Response structure:');
    console.log(`- Summary items: ${result.summary ? result.summary.length : 0}`);
    console.log(`- Action items: ${result.actionItems ? result.actionItems.length : 0}`);
    console.log(`- SOP check items: ${result.sopCheck ? result.sopCheck.length : 0}`);
    console.log(`- Probing questions: ${result.probingQuestions ? result.probingQuestions.length : 0}`);
    
    if (result.quality) {
      console.log('\n🎯 Quality scores:');
      console.log(`- Completeness: ${result.quality.completeness}%`);
      console.log(`- Clarity: ${result.quality.clarity}%`);
      console.log(`- Actionability: ${result.quality.actionability}%`);
    }
    
    console.log('\n📝 Sample output:');
    if (result.summary && result.summary.length > 0) {
      console.log('Summary:', result.summary[0]);
    }
    if (result.actionItems && result.actionItems.length > 0) {
      console.log('Action item:', result.actionItems[0]);
    }
    
  } catch (error) {
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    console.error('❌ Error occurred:');
    console.error(error.message);
    console.log(`⏱️  Time until error: ${processingTime}ms`);
  }
}

// Run the test
testProcessingTime();
