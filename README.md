# AI Development Team Meeting Summarizer

Transform your development team meeting notes into actionable intelligence with AI-powered analysis. Designed specifically for product managers to quickly share key decisions, action items, and blockers with their development teams.

## 🚀 Features

- **🧠 AI-Powered Analysis**: Uses Anthropic's Claude 3 Haiku model for intelligent meeting analysis
- **📊 Structured Action Items**: Generates specific tasks with owners, deadlines, and success criteria
- **💡 Key Decisions & Progress**: Captures important decisions with rationale and tracks progress updates
- **🚧 Blockers & Next Steps**: Identifies current blockers and upcoming roadmap items
- **⚠️ Risk Assessment**: Identifies potential risks with impact/probability analysis and mitigation strategies
- **🔔 Follow-up Tracking**: Creates actionable reminders with due dates and owners
- **📈 Meeting Quality Metrics**: Provides 1-10 scoring across preparation, participation, and decision-making
- **❓ Open Questions**: Generates probing questions that identify missing critical information
- **📱 Beautiful UI**: Color-coded sections with priority badges and progress indicators
- **📋 Enhanced Export**: Comprehensive clipboard export with structured data
- **🔄 History Management**: Automatically saves and retrieves your last 10 meeting notes
- **✅ Real-time Validation**: 1000 character limit with visual feedback and progress tracking
- **🛡️ Error Handling**: Comprehensive error messages and fallback modes
- **🎭 Demo Mode**: Works without API keys for testing with realistic sample data

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **AI Service**: Anthropic Claude 3 Haiku API
- **Deployment**: Vercel-ready

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (free tier)
- Anthropic account with Claude API access (trial credits available)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd prodaimvp
npm install
```

### 2. Environment Setup

```bash
# Copy the environment template
cp env.template .env.local

# Edit .env.local with your API keys
nano .env.local
```

### 3. Configure API Keys

Edit `.env.local` with your credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Claude Configuration
ANTHROPIC_API_KEY=your_claude_api_key_here
CLAUDE_SUMMARY_MODEL=claude-3-haiku-20240307
```

### 4. Database Setup

Follow the detailed instructions in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) to:
- Create a Supabase project
- Run the database schema
- Configure Row Level Security

### 5. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your app! The dev server runs on port 3000 by default; if it is already in use, Next.js automatically tries the next available port (3001+).

## 🔧 API Configuration

### Claude (Anthropic) Setup

1. Go to [console.anthropic.com](https://console.anthropic.com) and create an account
2. Enable billing (trial credits are available for new users)
3. Generate an API key under **API Keys**
4. Add the key to your `.env.local` file as `ANTHROPIC_API_KEY`
5. Optional: change `CLAUDE_SUMMARY_MODEL` if you want to use a different Claude variant

### Supabase Setup (Free)

1. Create a project at [supabase.com](https://supabase.com)
2. Get your API keys from **Settings** → **API**
3. Run the SQL schema from `supabase-schema.sql`
4. Configure your environment variables

## 📖 Usage Guide

### Basic Workflow

1. **Enter Meeting Notes**: Paste your development team meeting notes into the text area
2. **Validate Input**: The system validates length (10-1000 characters) in real-time
3. **Process**: Click "Analyze Meeting Notes" to generate structured output
4. **Review Results**: Get key decisions, action items, blockers, and next steps
5. **Export**: Use "Copy Full Report" to share results with your team
6. **Save**: Notes are automatically saved to your history

### Input Validation

- **Minimum**: 10 characters
- **Maximum**: 1000 characters
- **Real-time feedback**: Character count and progress bar
- **Visual warnings**: Color-coded alerts for approaching limits

### Output Structure

The AI generates a comprehensive **Development Team Meeting Report** with a condensed, multi-column layout optimized for product managers:

1. **💡 Key Decisions & Progress**: 
   - Important decisions made with rationale and impact
   - Progress updates on completed work
   - Clear ownership and deadlines for decisions

2. **✅ Action Items with Ownership**: Specific tasks with:
   - Clear ownership assignment
   - Realistic deadlines
   - Priority levels (high/medium/low)
   - Success criteria for completion

3. **🚧 Blockers & Next Steps**:
   - Current blockers preventing progress
   - Upcoming roadmap items and milestones
   - Clear visibility into what's coming next

4. **❓ Open Questions**: Context-aware questions that identify missing information

5. **⚠️ Risk Assessment**: Identified risks with:
   - Impact and probability analysis
   - Specific mitigation strategies
   - Risk ownership assignment

6. **🔔 Follow-up Reminders**: Trackable actions with:
   - Due dates and owners
   - Action types (follow-up/escalation/review/decision)

7. **📈 Meeting Quality Analysis**: 1-10 scoring across:
   - Meeting preparation
   - Team participation
   - Decision-making clarity
   - Action item clarity
   - Follow-through planning

### Copy Export Structure

The "Copy Full Report" button exports a plain-text summary that mirrors the on-screen structure:

```
MEETING INTELLIGENCE REPORT
Meeting Type: Development Team Meeting

SUMMARY POINTS:
- Key discussion highlight 1
- Key discussion highlight 2

KEY DECISIONS & PROGRESS:
Decisions Made:
- Decision: Implement microservices architecture
  Rationale: Better scalability | Impact: HIGH | Owner: Tech Lead | Deadline: Q2 2024
Progress Updates:
- ✓ User authentication completed
- ✓ Database optimization finished

ACTION ITEMS WITH OWNERSHIP:
- Complete user authentication testing
  Owner: John Smith | Deadline: Next Friday | Priority: HIGH | Success: All test cases pass

BLOCKERS & NEXT STEPS:
Current Blockers:
- ⚠️ Database connection timeout
- ⚠️ Third-party API rate limits
Upcoming Items:
- → User dashboard redesign
- → Advanced analytics features

OPEN QUESTIONS:
- What is the timeline for resolving payment issues?
- Who will communicate the cashback policy changes?
```

Each section falls back to `- None` when empty so downstream workflows see consistent headers.

## 🗄️ Database Schema

The app uses two main tables:

### `meetings`
- `id`: UUID primary key
- `title`: Meeting title (first 50 chars of input)
- `raw_notes`: Original meeting notes
- `created_at`: Timestamp

### `meeting_outputs`
- `id`: UUID primary key
- `meeting_id`: Foreign key to meetings
- `summary`: JSON array of summary points
- `action_items`: JSON array of action items
- `sop_gaps`: JSON array of SOP check results
- `probing_questions`: JSON array of questions

## 🎨 Customization

### Styling
- Modify `app/globals.css` for custom styles
- Update `tailwind.config.js` for theme changes
- Component styles use Tailwind utility classes

### AI Processing
- Edit `lib/ai.ts` to modify prompts
- Adjust extraction patterns for action items
- Customize SOP check criteria

### Database
- Modify `lib/supabase.ts` for different data structures
- Update schema in `supabase-schema.sql`
- Adjust RLS policies for security

## 🚨 Error Handling

The app handles various error scenarios:

- **API Failures**: Graceful fallback to demo mode
- **Rate Limits**: User-friendly error messages
- **Database Errors**: Connection and query failures
- **Validation Errors**: Real-time input validation
- **Network Issues**: Timeout and connectivity problems

## 🧪 Testing

### Demo Mode
The app works without API keys in demo mode:
- Generates sample outputs
- Simulates processing delays
- Shows all UI functionality

### Manual Testing
1. Test across meeting types to confirm the condensed layout wraps correctly
2. Validate character limit enforcement
3. Check error handling with invalid inputs and API failures
4. Test copy-to-clipboard output in a plain-text editor
5. Verify history loading (Supabase enabled) or demo mode fallback

## 🚀 Deployment

### Branch Strategy

This project uses a **two-branch deployment strategy**:

- **`main` branch** → Production deployment (`https://prodaimvp.vercel.app`)
- **`staging` branch** → Preview deployment (unique URL per deployment)

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. **Automatic deployments**:
   - Push to `main` → Production deployment
   - Push to `staging` → Preview deployment with unique URL
   - Push to any feature branch → Preview deployment

### Development Workflow

#### For Staging/UAT Testing:
```bash
# Work on staging branch
git checkout staging
# ... make changes ...
git add .
git commit -m "Your changes"
git push origin staging
# → Vercel automatically creates a preview deployment
```

#### For Production Release:
```bash
# Merge staging to main
git checkout main
git merge staging
git push origin main
# → Vercel deploys to production
```

#### For Feature Development:
```bash
# Create feature branch from staging
git checkout staging
git checkout -b feature/your-feature-name
# ... make changes ...
git push origin feature/your-feature-name
# → Create PR: feature/your-feature-name → staging
```

### Deployment URLs

- **Production**: `https://prodaimvp.vercel.app` (main branch)
- **Staging**: `https://prodaimvp-git-staging-[hash].vercel.app` (staging branch)
- **Feature Previews**: `https://prodaimvp-git-[branch-name]-[hash].vercel.app`

### Finding Preview URLs

1. **Vercel Dashboard**: Visit [vercel.com/dashboard](https://vercel.com/dashboard) → Your Project → Deployments
2. **GitHub**: Check deployment status checks on your commits
3. **Email Notifications**: Vercel sends preview URLs via email (if configured)

### Other Platforms

The app is compatible with:
- Netlify
- Railway
- Render
- Any Node.js hosting platform

## 📊 Performance

- **Free Tier Limits**: 
  - Supabase: 500MB database, 50K API requests/month
  - Anthropic: Usage billed per token; trial credits cover initial testing
- **Optimizations**: 
  - Automatic cleanup (last 10 notes only)
  - Efficient database queries
  - Client-side validation

## 🔒 Security

- **Row Level Security**: Enabled on all tables
- **API Key Protection**: Server-side only
- **Input Sanitization**: Client and server validation
- **Rate Limiting**: Built-in API protections

## 🐛 Troubleshooting

### Common Issues

**"AI service not configured"**
- Check your Anthropic API key
- Confirm billing/credits are active on your Anthropic account
- Ensure no extra spaces in `.env.local`

**"Failed to load history"**
- Verify Supabase configuration
- Check database schema is applied
- Confirm RLS policies are set

**"Permission denied"**
- Verify service role key is correct
- Check RLS policies in Supabase
- Ensure tables exist and are accessible

### Debug Mode

Enable debug logging by adding to `.env.local`:
```env
DEBUG=true
```

## 🤝 Contributing

### Development Process

1. **Fork the repository** (if contributing externally)
2. **Create a feature branch** from `staging`:
   ```bash
   git checkout staging
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** and test locally
4. **Test on staging** before production:
   ```bash
   git checkout staging
   git merge feature/your-feature-name
   git push origin staging
   # Test on Vercel preview URL
   ```
5. **Submit a pull request**:
   - Feature branch → `staging` (for testing)
   - `staging` → `main` (for production release)

### Branch Guidelines

- **`main`**: Production-ready code only
- **`staging`**: Integration branch for testing
- **`feature/*`**: Individual feature development
- **`hotfix/*`**: Emergency production fixes (merge directly to main)

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- [Anthropic](https://www.anthropic.com) for Claude models
- [Supabase](https://supabase.com) for the database platform
- [Next.js](https://nextjs.org) for the framework
- [Tailwind CSS](https://tailwindcss.com) for styling

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the Supabase setup guide
3. Open an issue on GitHub
4. Check the demo mode for testing

---

**Happy Meeting Summarizing! 🎉**
