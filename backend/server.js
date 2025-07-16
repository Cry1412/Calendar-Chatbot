const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { google } = require('googleapis');
const OpenAI = require('openai');
const moment = require('moment');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Google Calendar setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// In-memory token storage (in production, use a database)
let userTokens = {};

// Google OAuth routes
app.get('/auth/google', (req, res) => {
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
  ];
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
  });
  
  res.json({ authUrl });
});

app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    // Store tokens (in production, save to database)
    userTokens['default'] = tokens;
    
    res.redirect('http://localhost:3000?auth=success');
  } catch (error) {
    console.error('Error getting tokens:', error);
    res.redirect('http://localhost:3000?auth=error');
  }
});

// Helper function to set credentials
function setUserCredentials(userId = 'default') {
  const tokens = userTokens[userId];
  if (tokens) {
    oauth2Client.setCredentials(tokens);
    return true;
  }
  return false;
}

// API Routes
app.post('/api/assistant', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!setUserCredentials()) {
      return res.status(401).json({ error: 'Not authenticated with Google Calendar' });
    }

    // Determine intent and process accordingly
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('summarize') || lowerMessage.includes('summary')) {
      const summary = await generateDailySummary();
      res.json({ response: summary });
    } else if (lowerMessage.includes('schedule') || lowerMessage.includes('book') || lowerMessage.includes('create')) {
      const result = await processSchedulingCommand(message);
      res.json({ response: result });
    } else {
      // General conversation
      const response = await generateGeneralResponse(message);
      res.json({ response });
    }
    
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate daily summary
async function generateDailySummary() {
  try {
    const today = moment().startOf('day');
    const tomorrow = moment().endOf('day');
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: today.toISOString(),
      timeMax: tomorrow.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    
    if (events.length === 0) {
      return "You have no events scheduled for today. It's a great day for focused work!";
    }

    // Format events for OpenAI
    const eventsText = events.map(event => {
      const start = moment(event.start.dateTime || event.start.date);
      const end = moment(event.end.dateTime || event.end.date);
      const duration = moment.duration(end.diff(start)).asMinutes();
      
      return `- ${start.format('h:mm A')} to ${end.format('h:mm A')}: ${event.summary} (${Math.round(duration)} minutes)`;
    }).join('\n');

    const prompt = `Based on the following calendar events for today, provide a concise, human-like summary of the schedule. Focus on patterns, busy periods, and free time:

${eventsText}

Please provide a natural summary that highlights:
- Busy periods and back-to-back meetings
- Available time for deep work
- Any notable gaps or transitions
- Overall schedule flow

Keep it conversational and helpful.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful calendar assistant that provides natural, conversational summaries of daily schedules."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    return completion.choices[0].message.content;
    
  } catch (error) {
    console.error('Error generating summary:', error);
    return "I'm having trouble accessing your calendar right now. Please try again later.";
  }
}

// Process scheduling commands
async function processSchedulingCommand(message) {
  try {
    // Use OpenAI to extract event details
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Extract calendar event details from the user's message. Return a JSON object with the following structure:
{
  "title": "Event title",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "duration": minutes,
  "attendees": ["email1@example.com", "email2@example.com"],
  "description": "Event description if provided"
}

If date/time is relative (e.g., "tomorrow", "next week"), calculate the actual date. If no specific time is given, use 9:00 AM as default. Duration should be in minutes.`
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 300,
      temperature: 0.3,
    });

    const eventData = JSON.parse(completion.choices[0].message.content);
    
    // Calculate start and end times
    const startDateTime = moment(`${eventData.date} ${eventData.time}`, 'YYYY-MM-DD HH:mm');
    const endDateTime = moment(startDateTime).add(eventData.duration, 'minutes');
    
    // Create calendar event
    const event = {
      summary: eventData.title,
      description: eventData.description || '',
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'America/New_York',
      },
    };

    // Add attendees if provided
    if (eventData.attendees && eventData.attendees.length > 0) {
      event.attendees = eventData.attendees.map(email => ({ email }));
    }

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      sendUpdates: 'all',
    });

    return `✅ Successfully scheduled "${eventData.title}" for ${startDateTime.format('dddd, MMMM Do [at] h:mm A')}. The event has been added to your calendar.`;
    
  } catch (error) {
    console.error('Error processing scheduling command:', error);
    return "I'm sorry, I couldn't process that scheduling request. Please try rephrasing it or check your calendar permissions.";
  }
}

// Generate general responses
async function generateGeneralResponse(message) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful calendar assistant. You can help with scheduling, summarizing daily schedules, and general calendar management. Keep responses concise and friendly."
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    return completion.choices[0].message.content;
    
  } catch (error) {
    console.error('Error generating response:', error);
    return "I'm having trouble processing your request right now. Please try again.";
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'AI Scheduling Assistant is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AI Scheduling Assistant backend running on port ${PORT}`);
  console.log(`📅 Google Calendar integration ready`);
  console.log(`🤖 OpenAI integration ready`);
}); 