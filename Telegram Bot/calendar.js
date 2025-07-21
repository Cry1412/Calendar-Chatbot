const { google } = require('googleapis');
const moment = require('moment');
require('dotenv').config();

class GoogleCalendarService {
    constructor() {
        this.calendar = null;
        this.initializeCalendar();
    }

    initializeCalendar() {
        try {
            const oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                process.env.GOOGLE_REDIRECT_URI
            );

            // Use the refresh token to obtain an access token.
            oauth2Client.setCredentials({
                refresh_token: process.env.GOOGLE_REFRESH_TOKEN
            });

            this.calendar = google.calendar({ version: 'v3', auth: oauth2Client });
            console.log('✅ Google Calendar API has been initialized');
        } catch (error) {
            console.error('❌ Google Calendar initialization error:', error.message);
        }
    }

    // Check availability within a specified time range
    async getFreeSlots(startDate, endDate, durationMinutes = 60) {
        if (!this.calendar) {
            throw new Error('Google Calendar has not been initialized yet');
        }

        try {
            // Get all events within a specified time range
            const response = await this.calendar.events.list({
                calendarId: process.env.GOOGLE_CALENDAR_ID,
                timeMin: startDate.toISOString(),
                timeMax: endDate.toISOString(),
                singleEvents: true,
                orderBy: 'startTime'
            });

            const events = response.data.items || [];
            const freeSlots = this.findFreeSlots(startDate, endDate, events, durationMinutes);
            
            return freeSlots;
        } catch (error) {
            console.error('❌ Lỗi khi lấy lịch:', error.message);
            throw error;
        }
    }

    // Find available time slots
    findFreeSlots(startDate, endDate, events, durationMinutes) {
        const freeSlots = [];
        let currentTime = moment(startDate);
        const endMoment = moment(endDate);

        // Only consider working hours (8 AM - 6 PM)
        const workStartHour = 9;
        const workEndHour = 17;
        
        // Add a 15-minute buffer before and after each event
        const bufferMinutes = 15;

        while (currentTime.isBefore(endMoment)) {
            // Skip weekends
            if (currentTime.day() === 0 || currentTime.day() === 6) {
                currentTime.add(1, 'day').hour(workStartHour).minute(0);
                continue;
            }

            // Skip outside working hours
            if (currentTime.hour() < workStartHour || currentTime.hour() >= workEndHour) {
                currentTime.add(1, 'hour');
                continue;
            }

            const slotEnd = moment(currentTime).add(durationMinutes, 'minutes');
            
            // Check if this time slot conflicts with any existing events
            // Including a 15-minute buffer before and after each event
            const isConflict = events.some(event => {
                const eventStart = moment(event.start.dateTime || event.start.date);
                const eventEnd = moment(event.end.dateTime || event.end.date);
                
                // Add a 15-minute buffer before and after each event
                const eventStartWithBuffer = moment(eventStart).subtract(bufferMinutes, 'minutes');
                const eventEndWithBuffer = moment(eventEnd).add(bufferMinutes, 'minutes');
                
                // Check if the current slot conflicts with any existing event (including buffer)
                return (currentTime.isBefore(eventEndWithBuffer) && slotEnd.isAfter(eventStartWithBuffer));
            });

            if (!isConflict && slotEnd.isBefore(endMoment)) {
                freeSlots.push({
                    start: currentTime.clone(),
                    end: slotEnd.clone(),
                    duration: durationMinutes
                });
            }

            currentTime.add(30, 'minutes'); // Check every 30 minutes
        }

        return freeSlots;
    }

    // Suggest appointments
    async suggestAppointments(durationMinutes = 60, daysAhead = 7) {
        const startDate = moment().startOf('day');
        const endDate = moment().add(daysAhead, 'days').endOf('day');
        
        const freeSlots = await this.getFreeSlots(startDate.toDate(), endDate.toDate(), durationMinutes);
        
        // Group by day
        const suggestionsByDay = {};
        freeSlots.forEach(slot => {
            const dayKey = slot.start.format('YYYY-MM-DD');
            const timeSlot = slot.start.format('HH:mm');
            
            if (!suggestionsByDay[dayKey]) {
                suggestionsByDay[dayKey] = [];
            }
            suggestionsByDay[dayKey].push(timeSlot);
        });

        return suggestionsByDay;
    }

    // Create a new event
    async createEvent(summary, startTime, endTime, description = '') {
        if (!this.calendar) {
            throw new Error('Google Calendar has not been initialized yet');
        }

        try {
            const event = {
                summary: summary,
                description: description,
                start: {
                    dateTime: startTime.toISOString(),
                    timeZone: 'Asia/Ho_Chi_Minh',
                },
                end: {
                    dateTime: endTime.toISOString(),
                    timeZone: 'Asia/Ho_Chi_Minh',
                },
            };

            const response = await this.calendar.events.insert({
                calendarId: process.env.GOOGLE_CALENDAR_ID,
                resource: event,
            });

            console.log('✅ Event created:', response.data.htmlLink);
            return response.data;
        } catch (error) {
            console.error('❌ Error creating event:', error.message);
            throw error;
        }
    }

    // Check if Google Calendar is configured
    isConfigured() {
        return !!(process.env.GOOGLE_CLIENT_ID && 
                 process.env.GOOGLE_CLIENT_SECRET && 
                 process.env.GOOGLE_REFRESH_TOKEN);
    }
}

module.exports = GoogleCalendarService; 