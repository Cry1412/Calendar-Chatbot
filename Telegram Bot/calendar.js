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

            // Sử dụng refresh token để lấy access token
            oauth2Client.setCredentials({
                refresh_token: process.env.GOOGLE_REFRESH_TOKEN
            });

            this.calendar = google.calendar({ version: 'v3', auth: oauth2Client });
            console.log('✅ Google Calendar API đã được khởi tạo');
        } catch (error) {
            console.error('❌ Lỗi khởi tạo Google Calendar:', error.message);
        }
    }

    // Kiểm tra lịch rảnh trong khoảng thời gian
    async getFreeSlots(startDate, endDate, durationMinutes = 60) {
        if (!this.calendar) {
            throw new Error('Google Calendar chưa được khởi tạo');
        }

        try {
            // Lấy tất cả sự kiện trong khoảng thời gian
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

    // Tìm các khoảng thời gian rảnh
    findFreeSlots(startDate, endDate, events, durationMinutes) {
        const freeSlots = [];
        let currentTime = moment(startDate);
        const endMoment = moment(endDate);

        // Chỉ xem xét thời gian làm việc (8h-18h)
        const workStartHour = 9;
        const workEndHour = 17;
        
        // Buffer 15 phút trước và sau mỗi cuộc hẹn
        const bufferMinutes = 15;

        while (currentTime.isBefore(endMoment)) {
            // Bỏ qua cuối tuần
            if (currentTime.day() === 0 || currentTime.day() === 6) {
                currentTime.add(1, 'day').hour(workStartHour).minute(0);
                continue;
            }

            // Bỏ qua ngoài giờ làm việc
            if (currentTime.hour() < workStartHour || currentTime.hour() >= workEndHour) {
                currentTime.add(1, 'hour');
                continue;
            }

            const slotEnd = moment(currentTime).add(durationMinutes, 'minutes');
            
            // Kiểm tra xem khoảng thời gian này có bị trùng với sự kiện nào không
            // Bao gồm buffer 15 phút trước và sau mỗi cuộc hẹn
            const isConflict = events.some(event => {
                const eventStart = moment(event.start.dateTime || event.start.date);
                const eventEnd = moment(event.end.dateTime || event.end.date);
                
                // Thêm buffer trước và sau cuộc hẹn
                const eventStartWithBuffer = moment(eventStart).subtract(bufferMinutes, 'minutes');
                const eventEndWithBuffer = moment(eventEnd).add(bufferMinutes, 'minutes');
                
                // Kiểm tra xem slot hiện tại có trùng với cuộc hẹn (bao gồm buffer) không
                return (currentTime.isBefore(eventEndWithBuffer) && slotEnd.isAfter(eventStartWithBuffer));
            });

            if (!isConflict && slotEnd.isBefore(endMoment)) {
                freeSlots.push({
                    start: currentTime.clone(),
                    end: slotEnd.clone(),
                    duration: durationMinutes
                });
            }

            currentTime.add(30, 'minutes'); // Kiểm tra mỗi 30 phút
        }

        return freeSlots;
    }

    // Gợi ý lịch hẹn
    async suggestAppointments(durationMinutes = 60, daysAhead = 7) {
        const startDate = moment().startOf('day');
        const endDate = moment().add(daysAhead, 'days').endOf('day');
        
        const freeSlots = await this.getFreeSlots(startDate.toDate(), endDate.toDate(), durationMinutes);
        
        // Nhóm theo ngày
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

    // Tạo sự kiện mới
    async createEvent(summary, startTime, endTime, description = '') {
        if (!this.calendar) {
            throw new Error('Google Calendar chưa được khởi tạo');
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

            console.log('✅ Đã tạo sự kiện:', response.data.htmlLink);
            return response.data;
        } catch (error) {
            console.error('❌ Lỗi khi tạo sự kiện:', error.message);
            throw error;
        }
    }

    // Kiểm tra xem Google Calendar có được cấu hình không
    isConfigured() {
        return !!(process.env.GOOGLE_CLIENT_ID && 
                 process.env.GOOGLE_CLIENT_SECRET && 
                 process.env.GOOGLE_REFRESH_TOKEN);
    }
}

module.exports = GoogleCalendarService; 