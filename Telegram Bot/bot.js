const TelegramBot = require('node-telegram-bot-api');
const GoogleCalendarService = require('./calendar');
const moment = require('moment');
const axios = require('axios');
require('dotenv').config();

// Get token from environment variable
const token = process.env.TELEGRAM_BOT_TOKEN;

// Check token
if (!token || token === 'YOUR_BOT_TOKEN') {
    console.error('❌ Error: Please update TELEGRAM_BOT_TOKEN in the .env file');
    console.log('📝 Instructions:');
    console.log('1. Create a new bot at https://t.me/botfather');
    console.log('2. Copy the token and replace YOUR_BOT_TOKEN in the .env file');
    process.exit(1);
}

// Create bot instance
const bot = new TelegramBot(token, { polling: true });

// Initialize Google Calendar service
const calendarService = new GoogleCalendarService();

// Calendar Assistant API URL
const CALENDAR_ASSISTANT_API = 'http://localhost:3001';

console.log('🤖 Telegram Bot is starting...');

// Handle incoming messages
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text;
    const userName = msg.from.first_name || 'User';

    console.log(`📨 Received message from ${userName}: ${messageText}`);

    try {
        // Handle special commands
        if (messageText.startsWith('/')) {
            await handleCommands(msg);
        } else {
            // Handle regular messages
            await handleRegularMessage(msg);
        }
    } catch (error) {
        console.error('❌ Error processing message:', error);
        await bot.sendMessage(chatId, '❌ An error occurred, please try again later.');
    }
});

// Handle callback queries (when user clicks a button)
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    const userName = query.from.first_name || 'User';

    try {
        if (data.startsWith('schedule_')) {
            await handleScheduleSelection(query);
        } else if (data.startsWith('confirm_')) {
            await handleAppointmentConfirmation(query);
        } else if (data === 'cancel') {
            await bot.editMessageText(
                '❌ Đã hủy yêu cầu đặt lịch hẹn.',
                { chat_id: chatId, message_id: query.message.message_id }
            );
        }
    } catch (error) {
        console.error('❌ Error processing callback query:', error);
        await bot.answerCallbackQuery(query.id, { text: '❌ An error occurred, please try again.' });
    }
});

// Handle commands
async function handleCommands(msg) {
    const chatId = msg.chat.id;
    const messageText = msg.text.toLowerCase();
    const userName = msg.from.first_name || 'User';

    switch (messageText) {
        case '/start':
            await sendWelcomeMessage(chatId, userName);
            break;
        
        case '/help':
            await sendHelpMessage(chatId);
            break;
        
        case '/schedule':
        case '/calendar':
            await suggestAppointments(chatId, userName);
            break;
        
        case '/today':
        case '/today':
            await showTodaySchedule(chatId);
            break;
        
        case '/tomorrow':
            await showTomorrowSchedule(chatId);
            break;
        
        default:
            await bot.sendMessage(chatId, `Hello ${userName}! 👋\n\nType /help to see available commands.`);
    }
}

// Handle regular messages
async function handleRegularMessage(msg) {
    const chatId = msg.chat.id;
    const messageText = msg.text;
    const userName = msg.from.first_name || 'User';

    // Check if the message contains keywords related to appointments
    const appointmentKeywords = ['appointment', 'meeting', 'schedule', 'appointment', 'appointment'];
    const hasAppointmentKeyword = appointmentKeywords.some(keyword => 
        messageText.toLowerCase().includes(keyword)
    );

    if (hasAppointmentKeyword) {
        await suggestAppointments(chatId, userName);
    } else {
        // Default response
        const response = `Hello ${userName}! 👋\n\nI can help you:\n• Suggest appointments (/schedule)\n• Show today's schedule (/today)\n• Show tomorrow's schedule (/tomorrow)\n\nType /help to see all commands.`;
        await bot.sendMessage(chatId, response);
    }
}

// Send welcome message
async function sendWelcomeMessage(chatId, userName) {
    const welcomeText = `🎉 Welcome ${userName}!\n\nI'm your smart appointment assistant. I can:\n\n📅 Suggest appointments based on free time\n📋 Show work schedule\n⏰ Create new appointments\n🕐 Automatically add 15-minute buffer before and after each appointment\n\n⏰ *Working hours:* 8:00 - 18:00 (Monday - Friday)\n🕐 *Buffer:* 15 minutes before and after each appointment\n\nType /help to see all features!`;
    await bot.sendMessage(chatId, welcomeText, { parse_mode: 'Markdown' });
}

// Send help message
async function sendHelpMessage(chatId) {
    const helpText = `📋 **Available commands:**\n\n` +
        `🔹 /start - Start the bot\n` +
        `🔹 /help - Show help\n` +
        `🔹 /schedule - Suggest appointments\n` +
        `🔹 /today - Show today's schedule\n` +
        `🔹 /tomorrow - Show tomorrow's schedule\n\n` +
        `💡 **Tip:** Type keywords like "appointment", "meeting", "schedule" to automatically suggest appointments!`;
    
    await bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
}

// Suggest appointments
async function suggestAppointments(chatId, userName) {
    if (!calendarService.isConfigured()) {
        await bot.sendMessage(chatId, 
            '❌ Google Calendar is not configured.\n\n' +
            'Please update Google Calendar information in the .env file'
        );
        return;
    }

    try {
        await bot.sendMessage(chatId, '⏳ Checking free time...');
        
        const suggestions = await calendarService.suggestAppointments(60, 7); // 60 phút, 7 ngày
        
        if (Object.keys(suggestions).length === 0) {
            await bot.sendMessage(chatId, 
                '😔 No free time found in the next 7 days.\n' +
                'Please try again later or contact directly.'
            );
            return;
        }

        let response = `📅 **Suggested appointments for ${userName}:**\n\n`;
        response += `⏰ *Working hours:* 8:00 - 18:00 (Monday - Friday)\n`;
        response += `🕐 *Buffer:* 15 minutes before and after each appointment\n\n`;
        
        // Create inline keyboard for each day
        const keyboard = [];
        
        Object.keys(suggestions).forEach(date => {
            const dayName = moment(date).format('dddd, DD/MM/YYYY');
            const times = suggestions[date].slice(0, 5); // Show only the first 5 slots
            
            response += `📆 **${dayName}**\n`;
            times.forEach(time => {
                response += `⏰ ${time}\n`;
            });
            response += '\n';

            // Create buttons for each time slot
            times.forEach(time => {
                const callbackData = `schedule_${date}_${time}`;
                keyboard.push([{
                    text: `${dayName} - ${time}`,
                    callback_data: callbackData
                }]);
            });
        });

        response += `💡 *Select a suitable time from the buttons below to schedule an appointment!*\n\n`;
        response += `ℹ️ *Note:* Each slot includes a 15-minute buffer to ensure no conflicts.`;
        
        const replyMarkup = {
            inline_keyboard: keyboard
        };
        
        await bot.sendMessage(chatId, response, { 
            parse_mode: 'Markdown',
            reply_markup: replyMarkup
        });
        
    } catch (error) {
        console.error('❌ Error suggesting appointments:', error);
        await bot.sendMessage(chatId, 
            '❌ Unable to check free time at the moment.\n' +
            'Please try again later or contact directly.'
        );
    }
}

// Handle when user selects a time
async function handleScheduleSelection(query) {
    const chatId = query.message.chat.id;
    const userName = query.from.first_name || 'User';
    const data = query.data;
    
    // Parse data: schedule_YYYY-MM-DD_HH:mm
    const parts = data.split('_');
    const date = parts[1];
    const time = parts[2];
    
    const formattedDate = moment(date).format('dddd, DD/MM/YYYY');
    const formattedTime = moment(`2000-01-01T${time}`).format('h:mm A');
    
    const confirmationText = `📅 **Confirm appointment:**\n\n` +
        `👤 **Requester:** ${userName}\n` +
        `📆 **Date:** ${formattedDate}\n` +
        `⏰ **Time:** ${formattedTime}\n` +
        `⏱️ **Duration:** 60 minutes\n\n` +
        `Do you want to send this appointment request?`;
    
    const keyboard = {
        inline_keyboard: [
            [
                {
                    text: '✅ Confirm',
                    callback_data: `confirm_${date}_${time}_${userName}`
                },
                {
                    text: '❌ Cancel',
                    callback_data: 'cancel'
                }
            ]
        ]
    };
    
    await bot.editMessageText(confirmationText, {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: keyboard
    });
    
    await bot.answerCallbackQuery(query.id);
}

// Handle appointment confirmation
async function handleAppointmentConfirmation(query) {
    const chatId = query.message.chat.id;
    const data = query.data;
    
    // Parse data: confirm_YYYY-MM-DD_HH:mm_UserName
    const parts = data.split('_');
    const date = parts[1];
    const time = parts[2];
    const userName = parts.slice(3).join('_'); // Handle names with spaces
    
    try {
        // Send request to Calendar Assistant
        const appointmentRequest = {
            requesterName: userName,
            requesterContact: 'Telegram',
            requestedDate: date,
            requestedTime: time,
            duration: 60,
            description: `Appointment request from Telegram user: ${userName}`,
            telegramChatId: chatId.toString()
        };
        
        const response = await axios.post(`${CALENDAR_ASSISTANT_API}/api/appointment-requests`, appointmentRequest);
        
        if (response.data.success) {
            const successText = `✅ **Appointment request sent successfully!**\n\n` +
                `📅 **Details:**\n` +
                `👤 Requester: ${userName}\n` +
                `📆 Date: ${moment(date).format('dddd, DD/MM/YYYY')}\n` +
                `⏰ Time: ${moment(`2000-01-01T${time}`).format('h:mm A')}\n` +
                `⏱️ Duration: 60 minutes\n\n` +
                `Your request has been sent to the administrator for review.\n` +
                `You will receive a notification when your request is processed.`;
            
            await bot.editMessageText(successText, {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: 'Markdown'
            });
            
            console.log(`📅 Appointment request sent to Calendar Assistant:`, appointmentRequest);
        } else {
            throw new Error('Failed to send appointment request');
        }
        
    } catch (error) {
        console.error('❌ Error sending appointment request:', error);
        
        const errorText = `❌ **Unable to send appointment request**\n\n` +
            `An error occurred while sending your request.\n` +
            `Please try again later or contact directly.`;
        
        await bot.editMessageText(errorText, {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: 'Markdown'
        });
    }
    
    await bot.answerCallbackQuery(query.id);
}

// Show today's schedule
async function showTodaySchedule(chatId) {
    if (!calendarService.isConfigured()) {
        await bot.sendMessage(chatId, '❌ Google Calendar is not configured.');
        return;
    }

    try {
        const today = moment().startOf('day');
        const tomorrow = moment().endOf('day');
        
        const freeSlots = await calendarService.getFreeSlots(today.toDate(), tomorrow.toDate(), 60);
        
        if (freeSlots.length === 0) {
            await bot.sendMessage(chatId, '😔 Hôm nay không có lịch rảnh.');
        } else {
            let response = `📅 **Free slots today:**\n\n`;
            response += `⏰ *Working hours:* 8:00 - 18:00\n`;
            response += `🕐 *Buffer:* 15 minutes before and after each appointment\n\n`;
            
            freeSlots.forEach(slot => {
                response += `⏰ ${slot.start.format('HH:mm')} - ${slot.end.format('HH:mm')}\n`;
            });
            
            response += `\nℹ️ *Note:* Each slot includes a 15-minute buffer.`;
            await bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
        }
    } catch (error) {
        await bot.sendMessage(chatId, '❌ Unable to get today\'s schedule.');
    }
}

// Show tomorrow's schedule
async function showTomorrowSchedule(chatId) {
    if (!calendarService.isConfigured()) {
        await bot.sendMessage(chatId, '❌ Google Calendar is not configured.');
        return;
    }

    try {
        const tomorrow = moment().add(1, 'day').startOf('day');
        const dayAfterTomorrow = moment().add(1, 'day').endOf('day');
        
        const freeSlots = await calendarService.getFreeSlots(tomorrow.toDate(), dayAfterTomorrow.toDate(), 60);
        
        if (freeSlots.length === 0) {
            await bot.sendMessage(chatId, '😔 No free slots tomorrow.');
        } else {
            let response = `📅 **Free slots tomorrow:**\n\n`;
            response += `⏰ *Working hours:* 8:00 - 18:00\n`;
            response += `🕐 *Buffer:* 15 minutes before and after each appointment\n\n`;
            
            freeSlots.forEach(slot => {
                response += `⏰ ${slot.start.format('HH:mm')} - ${slot.end.format('HH:mm')}\n`;
            });
            
            response += `\nℹ️ *Note:* Each slot includes a 15-minute buffer.`;
            await bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
        }
    } catch (error) {
        await bot.sendMessage(chatId, '❌ Unable to get tomorrow\'s schedule.');
    }
}

// Handle errors
bot.on('error', (error) => {
    console.error('❌ Bot error:', error);
});

// Handle polling errors
bot.on('polling_error', (error) => {
    console.error('❌ Polling error:', error);
});

console.log('✅ Bot is ready! Send a message to test.');
console.log('💡 Press Ctrl+C to stop the bot'); 