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
      body: JSON.stringify({ input: testInput, meetingType: 'daily-standup' }),
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
    console.log(`- Meeting Type: ${result.meetingType || 'unknown'}`);
    console.log(`- Key Discussion Points: ${result.keyDiscussionPoints ? result.keyDiscussionPoints.length : 0}`);
    console.log(`- Action Items: ${result.nextSteps ? result.nextSteps.length : 0}`);
    console.log(`- SOP Checks: 0 (removed from core features)`);
    console.log(`- Open Questions: ${result.openQuestions ? result.openQuestions.length : 0}`);
    console.log(`- Risk Assessment: ${result.riskAssessment ? result.riskAssessment.length : 0}`);
    console.log(`- Follow-up Reminders: ${result.followUpReminders ? result.followUpReminders.length : 0}`);
    console.log(`- Meeting Quality Score: ${result.meetingQuality ? result.meetingQuality.overallScore : 'N/A'}/10`);
    
    console.log('\n📝 Sample output:');
    if (result.keyDiscussionPoints && result.keyDiscussionPoints.length > 0) {
      console.log('Key Discussion Point:', result.keyDiscussionPoints[0]);
    }
    if (result.nextSteps && result.nextSteps.length > 0) {
      const action = result.nextSteps[0];
      console.log('Action Item:', action.task);
      console.log('  Owner:', action.owner);
      console.log('  Priority:', action.priority);
      console.log('  Deadline:', action.deadline || 'TBD');
    }
    // SOP Checks removed from core features
    if (result.openQuestions && result.openQuestions.length > 0) {
      console.log('Open Question:', result.openQuestions[0]);
    }
    if (result.riskAssessment && result.riskAssessment.length > 0) {
      const risk = result.riskAssessment[0];
      console.log('Risk:', risk.risk);
      console.log('  Impact:', risk.impact, '| Probability:', risk.probability);
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
