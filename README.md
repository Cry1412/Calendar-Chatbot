# AI Scheduling Assistant

An intelligent AI-powered assistant that helps busy professionals manage their Google Calendar through natural language commands and automated scheduling.

## 🚀 Features

### Core Functionality
- **Daily Summary Generation**: Get intelligent, human-like summaries of your daily schedule
- **Natural Language Scheduling**: Schedule meetings using conversational commands
- **Google Calendar Integration**: Seamless connection with your Google Calendar
- **AI-Powered Responses**: Powered by OpenAI GPT for natural conversations

### Key Capabilities
- 📅 **Smart Summaries**: "You have a packed morning with back-to-back meetings, but your afternoon is clear after 2:30 PM for deep work."
- 🗓️ **Natural Scheduling**: "Schedule a 45-minute code review with Maya tomorrow at 11 AM"
- 🤖 **Conversational AI**: Chat naturally with your calendar assistant
- 📱 **Modern UI**: Beautiful, responsive web interface

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js
- **Google Calendar API** for calendar management
- **OpenAI GPT-3.5** for natural language processing
- **Moment.js** for date/time handling

### Frontend
- **React.js** with modern hooks
- **Axios** for API communication
- **Lucide React** for beautiful icons
- **CSS3** with modern animations and responsive design

## 📋 Prerequisites

Before you begin, ensure you have the following:

1. **Node.js** (v14 or higher)
2. **npm** or **yarn**
3. **Google Cloud Console** account
4. **OpenAI API** key

## 🔧 Setup Instructions

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Calendar-Chatbot
```

### 2. Google Calendar API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Calendar API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client IDs**
5. Set up OAuth consent screen:
   - User Type: External
   - App name: "AI Scheduling Assistant"
   - User support email: Your email
   - Developer contact information: Your email
6. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3001/auth/google/callback`
7. Download the credentials and note your **Client ID** and **Client Secret**

### 3. OpenAI API Setup

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an account and get your API key
3. Note your **API Key**

### 4. Environment Configuration

#### Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:
```env
# Google Calendar API Credentials
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback

# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key

# Server Configuration
PORT=3001
NODE_ENV=development

# Session Secret (for OAuth)
SESSION_SECRET=your_random_session_secret_here
```

#### Frontend Setup
```bash
cd frontend
npm install
```

### 5. Running the Application

#### Start the Backend Server
```bash
cd backend
npm start
# or for development with auto-restart
npm run dev
```

The backend will start on `http://localhost:3001`

#### Start the Frontend Application
```bash
cd frontend
npm start
```

The frontend will start on `http://localhost:3000`

## 🎯 Usage Guide

### Getting Started

1. **Open the Application**: Navigate to `http://localhost:3000`
2. **Connect Google Calendar**: Click "Connect Google Calendar" and authorize the application
3. **Start Chatting**: Begin using natural language commands

### Example Commands

#### Daily Summaries
- "Summarize my day"
- "What's on my calendar today?"
- "Give me a summary of today's schedule"

#### Scheduling Meetings
- "Schedule a 30-minute meeting with John tomorrow at 2 PM"
- "Book a 1-hour lunch with Sarah on Friday"
- "Create a 45-minute code review with Maya tomorrow at 11 AM"
- "Schedule a team standup for Monday at 9 AM"

#### General Queries
- "What meetings do I have this week?"
- "When is my next meeting?"
- "How busy is my schedule today?"

### Natural Language Processing

The assistant understands various ways to express the same intent:

**Scheduling Examples:**
- "Schedule a meeting with John"
- "Book an appointment with Sarah"
- "Create an event with the team"
- "Set up a call with Maya"

**Time Expressions:**
- "tomorrow at 3 PM"
- "next Monday at 10 AM"
- "Friday afternoon"
- "in 2 hours"

## 🔒 Security & Privacy

- **OAuth 2.0**: Secure Google Calendar authentication
- **No Data Storage**: Calendar data is not stored locally
- **API Security**: All API keys are stored in environment variables
- **HTTPS Ready**: Configured for production deployment

## 🚀 Production Deployment

### Environment Variables
Update the following for production:
- `GOOGLE_REDIRECT_URI`: Your production domain
- `NODE_ENV`: Set to "production"
- `SESSION_SECRET`: Use a strong, random secret

### Google Cloud Console
1. Update OAuth consent screen for production
2. Add production redirect URIs
3. Configure authorized domains

### Deployment Options
- **Heroku**: Easy deployment with environment variables
- **Vercel**: Great for frontend deployment
- **AWS/GCP**: Full control over infrastructure
- **Docker**: Containerized deployment

## 🐛 Troubleshooting

### Common Issues

**"Not authenticated with Google Calendar"**
- Ensure you've completed the OAuth flow
- Check that your Google Cloud Console credentials are correct
- Verify the redirect URI matches exactly

**"OpenAI API Error"**
- Check your OpenAI API key is valid
- Ensure you have sufficient API credits
- Verify the API key is correctly set in environment variables

**"Port already in use"**
- Change the PORT in your .env file
- Kill any existing processes on the port
- Use `lsof -i :3001` to find conflicting processes

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` in your backend `.env` file.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Calendar API** for calendar integration
- **OpenAI** for natural language processing
- **React.js** community for the amazing framework
- **Lucide** for beautiful icons

## 📞 Support

If you encounter any issues or have questions:

1. Check the troubleshooting section above
2. Review the Google Calendar API documentation
3. Check OpenAI API documentation
4. Open an issue in the repository

---

**Happy Scheduling! 🎉**