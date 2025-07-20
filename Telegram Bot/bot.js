const TelegramBot = require('node-telegram-bot-api');
const GoogleCalendarService = require('./calendar');
const moment = require('moment');
const axios = require('axios');
require('dotenv').config();

// Lấy token từ biến môi trường
const token = process.env.TELEGRAM_BOT_TOKEN;

// Kiểm tra token
if (!token || token === 'YOUR_BOT_TOKEN') {
    console.error('❌ Lỗi: Vui lòng cập nhật TELEGRAM_BOT_TOKEN trong file .env');
    console.log('📝 Hướng dẫn:');
    console.log('1. Tạo bot mới tại https://t.me/botfather');
    console.log('2. Copy token và thay thế YOUR_BOT_TOKEN trong file .env');
    process.exit(1);
}

// Tạo bot instance
const bot = new TelegramBot(token, { polling: true });

// Khởi tạo Google Calendar service
const calendarService = new GoogleCalendarService();

// Calendar Assistant API URL
const CALENDAR_ASSISTANT_API = 'http://localhost:3001';

console.log('🤖 Telegram Bot đang khởi động...');

// Xử lý khi có tin nhắn đến
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text;
    const userName = msg.from.first_name || 'User';

    console.log(`📨 Nhận tin nhắn từ ${userName}: ${messageText}`);

    try {
        // Xử lý các lệnh đặc biệt
        if (messageText.startsWith('/')) {
            await handleCommands(msg);
        } else {
            // Xử lý tin nhắn thông thường
            await handleRegularMessage(msg);
        }
    } catch (error) {
        console.error('❌ Lỗi xử lý tin nhắn:', error);
        await bot.sendMessage(chatId, '❌ Có lỗi xảy ra, vui lòng thử lại sau.');
    }
});

// Xử lý callback queries (khi user click button)
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
        console.error('❌ Lỗi xử lý callback query:', error);
        await bot.answerCallbackQuery(query.id, { text: '❌ Có lỗi xảy ra, vui lòng thử lại.' });
    }
});

// Xử lý các lệnh
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
        case '/lịch':
            await suggestAppointments(chatId, userName);
            break;
        
        case '/today':
        case '/hôm nay':
            await showTodaySchedule(chatId);
            break;
        
        case '/tomorrow':
        case '/ngày mai':
            await showTomorrowSchedule(chatId);
            break;
        
        default:
            await bot.sendMessage(chatId, `Xin chào ${userName}! 👋\n\nGõ /help để xem các lệnh có sẵn.`);
    }
}

// Xử lý tin nhắn thông thường
async function handleRegularMessage(msg) {
    const chatId = msg.chat.id;
    const messageText = msg.text;
    const userName = msg.from.first_name || 'User';

    // Kiểm tra nếu tin nhắn có từ khóa liên quan đến lịch hẹn
    const appointmentKeywords = ['hẹn', 'meeting', 'lịch', 'schedule', 'gặp', 'appointment'];
    const hasAppointmentKeyword = appointmentKeywords.some(keyword => 
        messageText.toLowerCase().includes(keyword)
    );

    if (hasAppointmentKeyword) {
        await suggestAppointments(chatId, userName);
    } else {
        // Trả lời mặc định
        const response = `Hello ${userName}! 👋\n\nTôi có thể giúp bạn:\n• Gợi ý lịch hẹn (/schedule)\n• Xem lịch hôm nay (/today)\n• Xem lịch ngày mai (/tomorrow)\n\nGõ /help để xem tất cả lệnh.`;
        await bot.sendMessage(chatId, response);
    }
}

// Gửi tin nhắn chào mừng
async function sendWelcomeMessage(chatId, userName) {
    const welcomeText = `🎉 Chào mừng ${userName}!\n\nTôi là trợ lý lịch hẹn thông minh của bạn. Tôi có thể:\n\n📅 Gợi ý lịch hẹn dựa trên lịch rảnh\n📋 Xem lịch làm việc\n⏰ Tạo cuộc hẹn mới\n🕐 Tự động buffer 15 phút trước và sau mỗi cuộc hẹn\n\n⏰ *Thời gian làm việc:* 8:00 - 18:00 (Thứ 2 - Thứ 6)\n🕐 *Buffer:* 15 phút trước và sau mỗi cuộc hẹn\n\nGõ /help để xem tất cả tính năng!`;
    await bot.sendMessage(chatId, welcomeText, { parse_mode: 'Markdown' });
}

// Gửi tin nhắn trợ giúp
async function sendHelpMessage(chatId) {
    const helpText = `📋 **Các lệnh có sẵn:**\n\n` +
        `🔹 /start - Khởi động bot\n` +
        `🔹 /help - Hiển thị trợ giúp\n` +
        `🔹 /schedule - Gợi ý lịch hẹn\n` +
        `🔹 /today - Xem lịch hôm nay\n` +
        `🔹 /tomorrow - Xem lịch ngày mai\n\n` +
        `💡 **Mẹo:** Gõ từ khóa "hẹn", "meeting", "lịch" để được gợi ý lịch hẹn tự động!`;
    
    await bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
}

// Gợi ý lịch hẹn
async function suggestAppointments(chatId, userName) {
    if (!calendarService.isConfigured()) {
        await bot.sendMessage(chatId, 
            '❌ Google Calendar chưa được cấu hình.\n\n' +
            'Vui lòng cập nhật thông tin Google Calendar trong file .env'
        );
        return;
    }

    try {
        await bot.sendMessage(chatId, '⏳ Đang kiểm tra lịch rảnh...');
        
        const suggestions = await calendarService.suggestAppointments(60, 7); // 60 phút, 7 ngày
        
        if (Object.keys(suggestions).length === 0) {
            await bot.sendMessage(chatId, 
                '😔 Không tìm thấy lịch rảnh trong 7 ngày tới.\n' +
                'Vui lòng thử lại sau hoặc liên hệ trực tiếp.'
            );
            return;
        }

        let response = `📅 **Gợi ý lịch hẹn cho ${userName}:**\n\n`;
        response += `⏰ *Thời gian làm việc:* 8:00 - 18:00 (Thứ 2 - Thứ 6)\n`;
        response += `🕐 *Buffer:* 15 phút trước và sau mỗi cuộc hẹn\n\n`;
        
        // Tạo inline keyboard cho từng ngày
        const keyboard = [];
        
        Object.keys(suggestions).forEach(date => {
            const dayName = moment(date).format('dddd, DD/MM/YYYY');
            const times = suggestions[date].slice(0, 5); // Chỉ hiển thị 5 slot đầu tiên
            
            response += `📆 **${dayName}**\n`;
            times.forEach(time => {
                response += `⏰ ${time}\n`;
            });
            response += '\n';

            // Tạo buttons cho từng time slot
            times.forEach(time => {
                const callbackData = `schedule_${date}_${time}`;
                keyboard.push([{
                    text: `${dayName} - ${time}`,
                    callback_data: callbackData
                }]);
            });
        });

        response += `💡 *Chọn thời gian phù hợp từ các nút bên dưới để đặt lịch hẹn!*\n\n`;
        response += `ℹ️ *Lưu ý:* Mỗi slot đã bao gồm buffer 15 phút để đảm bảo không trùng lịch.`;
        
        const replyMarkup = {
            inline_keyboard: keyboard
        };
        
        await bot.sendMessage(chatId, response, { 
            parse_mode: 'Markdown',
            reply_markup: replyMarkup
        });
        
    } catch (error) {
        console.error('❌ Lỗi khi gợi ý lịch hẹn:', error);
        await bot.sendMessage(chatId, 
            '❌ Không thể kiểm tra lịch rảnh lúc này.\n' +
            'Vui lòng thử lại sau hoặc liên hệ trực tiếp.'
        );
    }
}

// Xử lý khi user chọn thời gian
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
    
    const confirmationText = `📅 **Xác nhận lịch hẹn:**\n\n` +
        `👤 **Người đặt:** ${userName}\n` +
        `📆 **Ngày:** ${formattedDate}\n` +
        `⏰ **Thời gian:** ${formattedTime}\n` +
        `⏱️ **Thời lượng:** 60 phút\n\n` +
        `Bạn có muốn gửi yêu cầu đặt lịch hẹn này không?`;
    
    const keyboard = {
        inline_keyboard: [
            [
                {
                    text: '✅ Xác nhận',
                    callback_data: `confirm_${date}_${time}_${userName}`
                },
                {
                    text: '❌ Hủy',
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

// Xử lý xác nhận đặt lịch hẹn
async function handleAppointmentConfirmation(query) {
    const chatId = query.message.chat.id;
    const data = query.data;
    
    // Parse data: confirm_YYYY-MM-DD_HH:mm_UserName
    const parts = data.split('_');
    const date = parts[1];
    const time = parts[2];
    const userName = parts.slice(3).join('_'); // Handle names with spaces
    
    try {
        // Gửi yêu cầu đến Calendar Assistant
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
            const successText = `✅ **Yêu cầu đặt lịch hẹn đã được gửi thành công!**\n\n` +
                `📅 **Chi tiết:**\n` +
                `👤 Người đặt: ${userName}\n` +
                `📆 Ngày: ${moment(date).format('dddd, DD/MM/YYYY')}\n` +
                `⏰ Thời gian: ${moment(`2000-01-01T${time}`).format('h:mm A')}\n` +
                `⏱️ Thời lượng: 60 phút\n\n` +
                `📋 Yêu cầu của bạn đã được gửi đến quản trị viên để xem xét.\n` +
                `Bạn sẽ nhận được thông báo khi yêu cầu được xử lý.`;
            
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
        
        const errorText = `❌ **Không thể gửi yêu cầu đặt lịch hẹn**\n\n` +
            `Có lỗi xảy ra khi gửi yêu cầu của bạn.\n` +
            `Vui lòng thử lại sau hoặc liên hệ trực tiếp.`;
        
        await bot.editMessageText(errorText, {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: 'Markdown'
        });
    }
    
    await bot.answerCallbackQuery(query.id);
}

// Hiển thị lịch hôm nay
async function showTodaySchedule(chatId) {
    if (!calendarService.isConfigured()) {
        await bot.sendMessage(chatId, '❌ Google Calendar chưa được cấu hình.');
        return;
    }

    try {
        const today = moment().startOf('day');
        const tomorrow = moment().endOf('day');
        
        const freeSlots = await calendarService.getFreeSlots(today.toDate(), tomorrow.toDate(), 60);
        
        if (freeSlots.length === 0) {
            await bot.sendMessage(chatId, '😔 Hôm nay không có lịch rảnh.');
        } else {
            let response = `📅 **Lịch rảnh hôm nay:**\n\n`;
            response += `⏰ *Thời gian làm việc:* 8:00 - 18:00\n`;
            response += `🕐 *Buffer:* 15 phút trước và sau mỗi cuộc hẹn\n\n`;
            
            freeSlots.forEach(slot => {
                response += `⏰ ${slot.start.format('HH:mm')} - ${slot.end.format('HH:mm')}\n`;
            });
            
            response += `\nℹ️ *Lưu ý:* Các slot đã bao gồm buffer 15 phút.`;
            await bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
        }
    } catch (error) {
        await bot.sendMessage(chatId, '❌ Không thể lấy lịch hôm nay.');
    }
}

// Hiển thị lịch ngày mai
async function showTomorrowSchedule(chatId) {
    if (!calendarService.isConfigured()) {
        await bot.sendMessage(chatId, '❌ Google Calendar chưa được cấu hình.');
        return;
    }

    try {
        const tomorrow = moment().add(1, 'day').startOf('day');
        const dayAfterTomorrow = moment().add(1, 'day').endOf('day');
        
        const freeSlots = await calendarService.getFreeSlots(tomorrow.toDate(), dayAfterTomorrow.toDate(), 60);
        
        if (freeSlots.length === 0) {
            await bot.sendMessage(chatId, '😔 Ngày mai không có lịch rảnh.');
        } else {
            let response = `📅 **Lịch rảnh ngày mai:**\n\n`;
            response += `⏰ *Thời gian làm việc:* 8:00 - 18:00\n`;
            response += `🕐 *Buffer:* 15 phút trước và sau mỗi cuộc hẹn\n\n`;
            
            freeSlots.forEach(slot => {
                response += `⏰ ${slot.start.format('HH:mm')} - ${slot.end.format('HH:mm')}\n`;
            });
            
            response += `\nℹ️ *Lưu ý:* Các slot đã bao gồm buffer 15 phút.`;
            await bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
        }
    } catch (error) {
        await bot.sendMessage(chatId, '❌ Không thể lấy lịch ngày mai.');
    }
}

// Xử lý lỗi
bot.on('error', (error) => {
    console.error('❌ Lỗi bot:', error);
});

// Xử lý khi bot khởi động thành công
bot.on('polling_error', (error) => {
    console.error('❌ Lỗi polling:', error);
});

console.log('✅ Bot đã sẵn sàng! Gửi tin nhắn để test.');
console.log('💡 Nhấn Ctrl+C để dừng bot'); 