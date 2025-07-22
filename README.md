# AI Scheduling Assistant with Telegram Integration

A comprehensive scheduling system that combines a web-based AI assistant with a Telegram bot for seamless appointment management. The system integrates Google Calendar, OpenAI GPT-3.5, and provides both web and Telegram interfaces for appointment scheduling.

## 🏗️ Architectural Overview

### System Architecture

The application follows a **microservices-inspired architecture** with three main components:

1. **Calendar Assistant Backend** (Node.js/Express)
   - Handles Google Calendar integration via OAuth2
   - Processes natural language requests using OpenAI GPT-3.5
   - Manages appointment requests with SQLite database
   - Provides RESTful API endpoints

2. **Calendar Assistant Frontend** (React.js)
   - Modern, responsive web interface
   - Real-time chat with AI assistant
   - Appointment request management dashboard
   - Google Calendar authentication flow

3. **Telegram Bot** (Node.js)
   - Provides mobile-first appointment scheduling
   - Integrates with Calendar Assistant backend
   - Supports both Vietnamese and English commands
   - Interactive inline keyboards for appointment selection

### Key Architectural Decisions

**Why this architecture?**

- **Separation of Concerns**: Each component has a specific responsibility, making the system modular and maintainable
- **Scalability**: Components can be deployed independently and scaled based on demand
- **User Experience**: Multiple interfaces (web + Telegram) provide flexibility for different user preferences
- **Data Persistence**: SQLite database ensures appointment requests survive server restarts
- **Real-time Integration**: Telegram bot communicates with web backend for unified appointment management

**Technology Choices:**

- **Node.js/Express**: Fast, event-driven backend with excellent async support
- **React.js**: Component-based frontend with modern hooks and state management
- **SQLite**: Lightweight, serverless database perfect for this use case
- **Google Calendar API**: Industry-standard calendar integration
- **OpenAI GPT-3.5**: Advanced natural language processing for conversational AI
- **Telegram Bot API**: Robust messaging platform with rich interactive features

## 📋 Prerequisites

Before you begin, ensure you have the following:

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Google Cloud Console** account
- **OpenAI API** account
- **Telegram Bot** (via @BotFather)

## 🔧 Setup Instructions

### Step 1: Clone and Navigate

```bash
git clone <repository-url>
cd Calendar-Chatbot
```

### Step 2: Google Calendar API Setup

1. **Create Google Cloud Project**
   ```bash
   # Go to https://console.cloud.google.com/
   # Create a new project or select existing one
   ```

2. **Enable Google Calendar API**
   ```bash
   # In Google Cloud Console:
   # APIs & Services > Library > Search "Google Calendar API" > Enable
   ```

3. **Create OAuth 2.0 Credentials**
   ```bash
   # APIs & Services > Credentials > Create Credentials > OAuth 2.0 Client IDs
   # Application type: Web application
   # Authorized redirect URIs: http://localhost:3001/auth/google/callback
   ```

4. **Configure OAuth Consent Screen**
   ```bash
   # User Type: External
   # App name: "AI Scheduling Assistant"
   # User support email: Your email
   # Developer contact: Your email
   ```

5. **Download Credentials**
   ```bash
   # Download the JSON file and note your Client ID and Client Secret
   ```

### Step 3: OpenAI API Setup

1. **Get OpenAI API Key**
   ```bash
   # Go to https://platform.openai.com/
   # Create account and navigate to API Keys
   # Create new secret key
   ```

### Step 4: Telegram Bot Setup

1. **Create Telegram Bot**
   ```bash
   # Message @BotFather on Telegram
   # Send: /newbot
   # Follow instructions to create bot
   # Save the bot token
   ```

### Step 5: Environment Configuration

#### Calendar Assistant Backend

```bash
cd "Calendar Assistant/backend"
npm install
```

Create `.env` file:
```env
# Google Calendar API Credentials
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback

# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here

# Server Configuration
PORT=3001
NODE_ENV=development

# Session Secret (generate random string)
SESSION_SECRET=your_random_session_secret_here
```

#### Calendar Assistant Frontend

```bash
cd "Calendar Assistant/frontend"
npm install
```

#### Telegram Bot

```bash
cd "Telegram Bot"
npm install
```

Create `.env` file:
```env
# Telegram Bot Token
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# Google Calendar API Credentials (for calendar service)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALENDAR_ID=primary

# Calendar Assistant API URL
CALENDAR_ASSISTANT_API_URL=http://localhost:3001
```

## 🚀 Running the Application

### Option 1: Using the Start Script (Recommended)

```bash
# From the root directory
node start.js
```

This will start all three components:
- Backend server on port 3001
- Frontend on port 3000
- Telegram bot

### Option 2: Manual Startup

#### Start Backend Server
```bash
cd "Calendar Assistant/backend"
npm start
# Server runs on http://localhost:3001
```

#### Start Frontend Application
```bash
cd "Calendar Assistant/frontend"
npm start
# Frontend runs on http://localhost:3000
```

#### Start Telegram Bot
```bash
cd "Telegram Bot"
npm start
# Bot starts polling for messages
```

## 🧪 Testing the Application

### 1. Test Backend API

```bash
# Health check
curl http://localhost:3001/api/health

# Expected response: {"status":"OK","message":"AI Scheduling Assistant is running"}
```

### 2. Test Frontend

1. **Open Browser**: Navigate to `http://localhost:3000`
2. **Connect Google Calendar**: Click "Connect Google Calendar" and complete OAuth flow
3. **Test Chat Interface**: Try these commands:
   - "Summarize my day"
   - "Schedule a meeting with John tomorrow at 2 PM"
   - "What meetings do I have this week?"

### 3. Test Telegram Bot

1. **Find Your Bot**: Search for your bot on Telegram
2. **Start Bot**: Send `/start`
3. **Test Commands**:
   - `/help` - View available commands
   - `/schedule` - Get appointment suggestions
   - `/today` - View today's schedule
   - `/tomorrow` - View tomorrow's schedule

### 4. Test Appointment Request Flow

#### Via Telegram Bot:
1. Send `/schedule` to get appointment suggestions
2. Select a time slot from the inline keyboard
3. Confirm the appointment request
4. Check the web interface for the pending request

#### Via Web Interface:
1. Go to the "Requests" tab
2. Accept or decline the request
3. Verify the appointment appears in Google Calendar (if accepted)

### 5. Test Database Functionality

```bash
cd "Calendar Assistant/backend"

# View database statistics
node db-manager.js stats

# Create database backup
node db-manager.js backup

# Test database operations
node test-db.js
```

### 6. Test Integration Points

#### Calendar Integration:
- Verify appointments created via web interface appear in Google Calendar
- Check that calendar events have proper links and descriptions

#### Telegram-Web Integration:
- Create appointment request via Telegram
- Verify it appears in web interface
- Accept/decline in web interface
- Verify Telegram notification (if implemented)

### Log Monitoring

- **Backend logs**: Check console output for API requests and errors
- **Frontend logs**: Browser developer tools console
- **Telegram logs**: Console output for bot interactions

## 🚀 Production Deployment

### Environment Variables for Production

```env
NODE_ENV=production
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/google/callback
SESSION_SECRET=strong_random_secret_here
```

## 📝 API Documentation

### Backend Endpoints

- `GET /api/health` - Health check
- `POST /api/assistant` - Chat with AI assistant
- `GET /api/appointment-requests` - Get all requests
- `POST /api/appointment-requests` - Create new request
- `POST /api/appointment-requests/:id/accept` - Accept request
- `POST /api/appointment-requests/:id/decline` - Decline request

### Telegram Bot Commands

- `/start` - Initialize bot
- `/help` - Show available commands
- `/schedule` - Get appointment suggestions
- `/today` - Show today's schedule
- `/tomorrow` - Show tomorrow's schedule

---

## 🧑‍💻 How to Use All Features

### 1. Web Chat Assistant
- **Access**: Open your browser and go to `http://localhost:3000`.
- **Connect Google Calendar**: Click "Connect Google Calendar" and complete the OAuth flow.
- **Chat**: Type natural language commands in the chat box, such as:
  - "Summarize my day"
  - "Schedule a meeting with John tomorrow at 2 PM"
  - "What meetings do I have this week?"
- **AI Responses**: The assistant will reply with summaries, scheduling options, or general information based on your input.

### 2. Daily Summary
- **Command**: In the web chat, type "Summarize my day" or "What's on my calendar today?"
- **Result**: The assistant will generate a human-like summary of your schedule for the day, highlighting busy periods and free time.

### 3. Natural Language Scheduling
- **Command**: In the web chat, type scheduling requests such as:
  - "Book a 1-hour lunch with Sarah on Friday"
  - "Create a 45-minute code review with Maya tomorrow at 11 AM"
- **Result**: The assistant will parse your request, suggest available times, and create events in your Google Calendar.

### 4. Appointment Requests (Web Interface)
- **View Requests**: Go to the "Requests" tab in the web app to see all pending, accepted, and declined appointment requests.
- **Accept/Decline**: Click the "Accept" or "Decline" button for each request.
  - **Accept**: The event is added to your Google Calendar, and the requester is notified (if using Telegram).
  - **Decline**: The requester is notified that their request was declined (if using Telegram).
- **Scroll**: Use the scroll bar to view all requests if the list is long.

### 5. Telegram Bot Usage
- **Start**: Open Telegram, search for your bot, and send `/start`.
- **Help**: Send `/help` to see all available commands.
- **Get Suggestions**: Send `/schedule` to receive a list of available appointment slots.
- **Book Appointment**:
  - Select a time slot from the inline keyboard.
  - Confirm your choice to send an appointment request.
  - You will receive a confirmation message.
- **View Today's Schedule**: Send `/today` to see your free slots for today.
- **View Tomorrow's Schedule**: Send `/tomorrow` to see your free slots for tomorrow.

### 6. Cross-Platform Appointment Flow
- **From Telegram to Web**:
  - Book an appointment via the Telegram bot.
  - The request appears instantly in the web interface under "Requests".
  - The admin can accept or decline the request on the website.
  - The Telegram user receives a notification about the decision.
- **From Web to Calendar**:
  - Accepting a request on the web adds the event to Google Calendar.
  - Declining a request notifies the requester (if they used Telegram).

### 7. Database and Admin Tools
- **View Stats**: Run `node db-manager.js stats` in the backend directory to see appointment statistics.
- **Backup Database**: Run `node db-manager.js backup` to create a backup of the database.

---

**Tip:** You can use both the web interface and Telegram bot interchangeably for scheduling and managing appointments. All actions are synchronized in real time!