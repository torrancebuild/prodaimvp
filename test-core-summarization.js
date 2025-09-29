#!/usr/bin/env node

/**
 * Core Summarization Test Script
 * Tests the essential features: understanding input, proper formatting, and concise next steps
 */

const testCases = [
  {
    name: "Basic Understanding & Context Retention",
    input: "Team discussed Q4 roadmap. Sarah raised concerns about timeline feasibility. We agreed to push launch from Dec 15 to Jan 30. Mike will coordinate with engineering. Need to update stakeholders by Friday.",
    meetingType: "general",
    expectedQuality: {
      keyPoints: "Should capture main decisions without losing context",
      nextSteps: "Should have clear ownership and deadlines",
      formatting: "Proper sentence case, clear punctuation"
    }
  },
  {
    name: "Complex Multi-Topic Input",
    input: "standup meeting. john finished api integration yesterday, no blockers. sarah working on ui components, blocked on design approval from marketing team. mike started database migration, estimates 3 days completion. team discussed upcoming demo for client on thursday. sarah needs marketing sign-off by tuesday. mike concerned about server capacity during migration.",
    meetingType: "daily-standup",
    expectedQuality: {
      keyPoints: "Should distinguish completed work, current work, and blockers",
      nextSteps: "Should preserve timelines and dependencies",
      formatting: "Should maintain context about why actions are needed"
    }
  },
  {
    name: "Vague/Incomplete Input",
    input: "quick sync about the thing. some issues came up. need to figure out next steps. bob will handle it.",
    meetingType: "general",
    expectedQuality: {
      keyPoints: "Should acknowledge lack of specificity without making things up",
      nextSteps: "Should reflect actual level of detail available",
      formatting: "Should use TBD for missing information"
    }
  },
  {
    name: "Technical Discussion",
    input: "Bug triage session. Critical issue with payment processing affecting 15% of transactions. Root cause identified as timeout in third-party API calls. Temporary fix deployed, permanent solution requires infrastructure changes. Sarah to investigate API rate limits, Mike to design new retry logic. Timeline: investigation by Wednesday, solution by next Friday.",
    meetingType: "general",
    expectedQuality: {
      keyPoints: "Should capture technical details and business impact",
      nextSteps: "Should have specific technical tasks with clear ownership",
      formatting: "Should maintain technical accuracy"
    }
  },
  {
    name: "Decision-Heavy Meeting",
    input: "Product planning meeting. Decided to pivot from mobile-first to web-first approach based on user feedback. Budget approved for additional frontend developer. Marketing campaign delayed by 2 weeks to align with new timeline. Next review scheduled for next Tuesday.",
    meetingType: "general",
    expectedQuality: {
      keyPoints: "Should capture key decisions and rationale",
      nextSteps: "Should reflect approved actions and timeline changes",
      formatting: "Should be clear about what was decided vs. what needs to be done"
    }
  }
];

async function testSummarization() {
  console.log("🧪 Core Summarization Test Suite");
  console.log("================================\n");

  for (const testCase of testCases) {
    console.log(`📋 Test: ${testCase.name}`);
    console.log(`Input: "${testCase.input}"`);
    console.log(`Meeting Type: ${testCase.meetingType}`);
    console.log("\nExpected Quality:");
    Object.entries(testCase.expectedQuality).forEach(([key, value]) => {
      console.log(`  • ${key}: ${value}`);
    });
    console.log("\n" + "─".repeat(50));

    try {
      const response = await fetch('http://localhost:3000/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: testCase.input,
          meetingType: testCase.meetingType
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      console.log("✅ API Response Received");
      console.log("\n📊 Key Discussion Points:");
      result.keyDiscussionPoints?.forEach((point, index) => {
        console.log(`  ${index + 1}. ${point}`);
      });

      console.log("\n🎯 Next Steps:");
      result.nextSteps?.forEach((step, index) => {
        console.log(`  ${index + 1}. ${step.task}`);
        console.log(`     Owner: ${step.owner}`);
        console.log(`     Deadline: ${step.deadline || 'TBD'}`);
        console.log(`     Priority: ${step.priority || 'N/A'}`);
        if (step.successCriteria) {
          console.log(`     Success: ${step.successCriteria}`);
        }
        console.log("");
      });

      // Quality Assessment
      console.log("🔍 Quality Assessment:");
      assessQuality(result, testCase);

    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }

    console.log("\n" + "=".repeat(60) + "\n");
  }
}

function assessQuality(result, testCase) {
  const issues = [];
  
  // Check key discussion points
  if (!result.keyDiscussionPoints || result.keyDiscussionPoints.length === 0) {
    issues.push("❌ No key discussion points generated");
  } else {
    result.keyDiscussionPoints.forEach((point, index) => {
      // Check sentence case
      if (point[0] !== point[0].toUpperCase()) {
        issues.push(`❌ Key point ${index + 1} doesn't start with capital letter: "${point}"`);
      }
      // Check punctuation
      if (!point.endsWith('.') && !point.endsWith('!') && !point.endsWith('?')) {
        issues.push(`❌ Key point ${index + 1} missing punctuation: "${point}"`);
      }
      // Check for hallucination (basic check)
      if (point.toLowerCase().includes('tbd') && !testCase.input.toLowerCase().includes('tbd')) {
        issues.push(`⚠️  Key point ${index + 1} uses TBD but input didn't mention it: "${point}"`);
      }
    });
  }

  // Check next steps
  if (!result.nextSteps || result.nextSteps.length === 0) {
    issues.push("❌ No next steps generated");
  } else {
    result.nextSteps.forEach((step, index) => {
      // Check for clear ownership
      if (!step.owner || step.owner === 'TBD' || step.owner.toLowerCase().includes('team')) {
        issues.push(`⚠️  Next step ${index + 1} has unclear ownership: "${step.owner}"`);
      }
      // Check for actionable language
      const actionWords = ['review', 'complete', 'send', 'update', 'create', 'fix', 'investigate', 'coordinate'];
      const hasAction = actionWords.some(word => step.task.toLowerCase().includes(word));
      if (!hasAction) {
        issues.push(`⚠️  Next step ${index + 1} may not be actionable: "${step.task}"`);
      }
    });
  }

  // Check formatting consistency
  if (result.keyDiscussionPoints && result.keyDiscussionPoints.length > 0) {
    const firstPoint = result.keyDiscussionPoints[0];
    const hasConsistentCase = result.keyDiscussionPoints.every(point => 
      point[0] === point[0].toUpperCase()
    );
    if (!hasConsistentCase) {
      issues.push("❌ Inconsistent sentence case in key points");
    }
  }

  if (issues.length === 0) {
    console.log("✅ All quality checks passed!");
  } else {
    issues.forEach(issue => console.log(issue));
  }
}

// Run the tests
testSummarization().catch(console.error);
