# AI Meeting Notes Summarizer

Transform your messy meeting notes into structured, shareable outputs with AI-powered summarization.

## 🚀 Features

- **AI-Powered Summarization**: Uses Hugging Face's BART model for intelligent text summarization
- **Structured Output**: Generates summary, action items, SOP checks, and probing questions
- **Real-time Validation**: 1000 character limit with visual feedback and progress tracking
- **History Management**: Automatically saves and retrieves your last 10 meeting notes
- **Copy to Clipboard**: Easy export of formatted results
- **Error Handling**: Comprehensive error messages and fallback modes
- **Demo Mode**: Works without API keys for testing

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **AI Service**: Hugging Face Inference API
- **Deployment**: Vercel-ready

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (free tier)
- Hugging Face account (free tier)

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

# Hugging Face Configuration
HUGGINGFACE_API_KEY=your_huggingface_api_key_here
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

Visit [http://localhost:3000](http://localhost:3000) to see your app!

## 🔧 API Configuration

### Hugging Face Setup (Free)

1. Go to [huggingface.co](https://huggingface.co) and create an account
2. Navigate to **Settings** → **Access Tokens**
3. Create a new token with **Read** permissions
4. Add the token to your `.env.local` file

### Supabase Setup (Free)

1. Create a project at [supabase.com](https://supabase.com)
2. Get your API keys from **Settings** → **API**
3. Run the SQL schema from `supabase-schema.sql`
4. Configure your environment variables

## 📖 Usage Guide

### Basic Workflow

1. **Enter Meeting Notes**: Paste your raw meeting notes into the text area
2. **Validate Input**: The system validates length (10-1000 characters) in real-time
3. **Process**: Click "Summarize Notes" to generate structured output
4. **Review Results**: Get summary, action items, SOP checks, and probing questions
5. **Export**: Use "Copy to Clipboard" to share results
6. **Save**: Notes are automatically saved to your history

### Input Validation

- **Minimum**: 10 characters
- **Maximum**: 1000 characters
- **Real-time feedback**: Character count and progress bar
- **Visual warnings**: Color-coded alerts for approaching limits

### Output Structure

The AI generates four structured sections:

1. **Summary**: Key points and main topics
2. **Action Items**: Tasks with owners and deadlines
3. **SOP Check**: Standard Operating Procedure compliance
4. **Probing Questions**: Follow-up questions for clarity

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
1. Test with various input lengths
2. Verify character limit enforcement
3. Check error handling with invalid inputs
4. Test copy functionality
5. Verify history loading

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms

The app is compatible with:
- Netlify
- Railway
- Render
- Any Node.js hosting platform

## 📊 Performance

- **Free Tier Limits**: 
  - Supabase: 500MB database, 50K API requests/month
  - Hugging Face: Free inference API
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
- Check your Hugging Face API key
- Verify the key has read permissions
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

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- [Hugging Face](https://huggingface.co) for the AI models
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
