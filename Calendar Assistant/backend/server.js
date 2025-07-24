const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { google } = require('googleapis');
const OpenAI = require('openai');
const moment = require('moment');
const Database = require('./database');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database
const db = new Database();

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
    
    // Store tokens in database
    await db.saveUserTokens('default', tokens);
    
    res.redirect('http://localhost:3000?auth=success');
  } catch (error) {
    console.error('Error getting tokens:', error);
    res.redirect('http://localhost:3000?auth=error');
  }
});

// Helper function to set credentials
async function setUserCredentials(userId = 'default') {
  try {
    const tokens = await db.getUserTokens(userId);
  if (tokens) {
    oauth2Client.setCredentials(tokens);
    return true;
  }
  return false;
  } catch (error) {
    console.error('Error setting user credentials:', error);
    return false;
  }
}

// API Routes
app.post('/api/assistant', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!(await setUserCredentials())) {
      return res.status(401).json({ error: 'Not authenticated with Google Calendar' });
    }

    // Use OpenAI to classify the intent of the message
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that classifies user intents into categories: 'summarize', 'schedule', or 'general'."
        },
        {
          role: "user",
          content: `Classify the following message: ${message}`
        }
      ],
      max_tokens: 10,
      temperature: 0.3,
    });

    const intent = completion.choices[0].message.content.trim().toLowerCase();
    
    // Process the message based on the classified intent
    console.log('Intent:', intent);
    console.log("fefefefefef");
    if (intent.includes('summarize')) {
      const summary = await generateDailySummary();
      res.json({ response: summary });
    } else if (intent.includes('schedule')) {
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

// Appointment Request Management APIs
app.post('/api/appointment-requests', async (req, res) => {
  try {
    const { 
      requesterName, 
      requesterContact, 
      requestedDate, 
      requestedTime, 
      duration, 
      description,
      telegramChatId 
    } = req.body;

    // Validate required fields
    if (!requesterName || !requestedDate || !requestedTime || !duration) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create new appointment request in database
    const request = await db.createAppointmentRequest({
      requesterName,
      requesterContact,
      requestedDate,
      requestedTime,
      duration,
      description,
      telegramChatId
    });

    console.log('📅 New appointment request received:', request);

    res.json({ 
      success: true, 
      requestId: request.id,
      message: 'Appointment request submitted successfully' 
    });

  } catch (error) {
    console.error('Error creating appointment request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all appointment requests
app.get('/api/appointment-requests', async (req, res) => {
  try {
    const requests = await db.getAllAppointmentRequests();
    res.json(requests);
  } catch (error) {
    console.error('Error fetching appointment requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Accept appointment request
app.post('/api/appointment-requests/:id/accept', async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    const request = await db.getAppointmentRequestById(requestId);

    if (!request) {
      return res.status(404).json({ error: 'Appointment request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request has already been processed' });
    }

    // Check if user is authenticated with Google Calendar
    if (!(await setUserCredentials())) {
      return res.status(401).json({ error: 'Not authenticated with Google Calendar' });
    }

    // Create the event in Google Calendar
    const startDateTime = moment(`${request.requestedDate} ${request.requestedTime}`, 'YYYY-MM-DD HH:mm');
    const endDateTime = moment(startDateTime).add(request.duration, 'minutes');

    const event = {
      summary: `Meeting with ${request.requesterName}`,
      description: request.description || `Appointment request from ${request.requesterContact}`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'America/New_York',
      },
    };

    const calendarResponse = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      sendUpdates: 'all',
    });

    // Update request status in database
    await db.updateAppointmentRequestStatus(
      requestId, 
      'accepted', 
      calendarResponse.data.id, 
      calendarResponse.data.htmlLink
    );

    console.log('✅ Appointment request accepted and added to calendar:', request);

    res.json({ 
      success: true, 
      message: 'Appointment accepted and added to calendar',
      calendarEventLink: calendarResponse.data.htmlLink
    });

  } catch (error) {
    console.error('Error accepting appointment request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Decline appointment request
app.post('/api/appointment-requests/:id/decline', async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    const request = await db.getAppointmentRequestById(requestId);

    if (!request) {
      return res.status(404).json({ error: 'Appointment request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request has already been processed' });
    }

    // Update request status in database
    await db.updateAppointmentRequestStatus(requestId, 'declined');

    console.log('❌ Appointment request declined:', request);

    res.json({ 
      success: true, 
      message: 'Appointment request declined' 
    });

  } catch (error) {
    console.error('Error declining appointment request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get appointment request by ID
app.get('/api/appointment-requests/:id', async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    const request = await db.getAppointmentRequestById(requestId);

    if (!request) {
      return res.status(404).json({ error: 'Appointment request not found' });
    }

    res.json(request);
  } catch (error) {
    console.error('Error fetching appointment request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate daily summary
async function generateDailySummary() {
  try {
    const today = moment().startOf('day');
    const tomorrow = moment().endOf('day');
    const todayString = moment().format('MMMM Do, YYYY');
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: today.toISOString(),
      timeMax: tomorrow.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    
    if (events.length === 0) {
      return `Today is ${todayString}. You have no events scheduled for today. It's a great day for focused work!`;
    }

    // Format events for OpenAI
    const eventsText = events.map(event => {
      const start = moment(event.start.dateTime || event.start.date);
      const end = moment(event.end.dateTime || event.end.date);
      const duration = moment.duration(end.diff(start)).asMinutes();
      
      return `- ${start.format('h:mm A')} to ${end.format('h:mm A')}: ${event.summary} (${Math.round(duration)} minutes)`;
    }).join('\n');

    const prompt = `Today is ${todayString}.
Based on the following calendar events for today, provide a concise, human-like summary of the schedule. Focus on patterns, busy periods, and free time:
\n${eventsText}\n\nPlease provide a natural summary that highlights:\n- Busy periods and back-to-back meetings\n- Available time for deep work\n- Any notable gaps or transitions\n- Overall schedule flow\n\nKeep it conversational and helpful.`;

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
    const todayString = moment().format('MMMM Do, YYYY');
    // Use OpenAI to extract event details
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Today is ${todayString}. Extract calendar event details from the user's message. Return a JSON object with the following structure:\n{\n  \"title\": \"Event title\",\n  \"date\": \"YYYY-MM-DD\",\n  \"time\": \"HH:MM\",\n  \"duration\": minutes,\n  \"attendees\": [\"email1@example.com\", \"email2@example.com\"],\n  \"description\": \"Event description if provided\"\n}\n\nIf date/time is relative (e.g., \"tomorrow\", \"next week\"), calculate the actual date. If no specific time is given, use 9:00 AM as default. Duration should be in minutes.`
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

    return `✅ Successfully scheduled \"${eventData.title}\" for ${startDateTime.format('dddd, MMMM Do [at] h:mm A')}. The event has been added to your calendar.`;
    
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
const server = app.listen(PORT, () => {
  console.log(`🚀 AI Scheduling Assistant backend running on port ${PORT}`);
  console.log(`📅 Google Calendar integration ready`);
  console.log(`🤖 OpenAI integration ready`);
  console.log(`📋 Appointment request management ready`);
  console.log(`💾 Database storage ready`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    db.close();
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    db.close();
    process.exit(0);
  });
}); 