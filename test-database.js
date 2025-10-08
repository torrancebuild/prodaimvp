// Test database functionality
const { saveNote, getNotes } = require('./lib/supabase.ts');

async function testDatabase() {
  console.log('Testing database functionality...');
  
  try {
    // Test saving a note
    console.log('1. Testing saveNote...');
    await saveNote(
      'Test Meeting',
      'This is a test meeting note for database verification.',
      JSON.stringify({
        summaryPoints: ['Test summary point'],
        actionItems: [{
          task: 'Test action item',
          owner: 'Test Owner',
          deadline: 'Next week',
          priority: 'medium',
          successCriteria: 'Task completion'
        }],
        openQuestions: ['Test question'],
        meetingType: 'development-team-meeting',
        developmentTeamSections: {
          keyDecisionsAndProgress: { decisions: [], progressUpdates: [] },
          actionItemsAndOwnership: [],
          blockersAndNextSteps: { currentBlockers: [], upcomingItems: [] }
        }
      })
    );
    console.log('✅ saveNote completed');
    
    // Test getting notes
    console.log('2. Testing getNotes...');
    const notes = await getNotes();
    console.log('✅ getNotes completed');
    console.log('Retrieved notes:', notes.length);
    
    if (notes.length > 0) {
      console.log('Sample note:', JSON.stringify(notes[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.log('This is expected if Supabase is not configured (demo mode)');
  }
}

testDatabase();
