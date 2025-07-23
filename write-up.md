# Project Write-up

## Assumptions Made
- Users have access to a Google account and can authenticate via OAuth2 for calendar integration.
- The Telegram bot will be used primarily by external users to request meetings, while the web interface is for internal/admin users to manage and confirm/deny requests.
- The server, frontend, and Telegram bot are all running on localhost during development, and network access between them is available.
- All appointment requests are for the primary Google Calendar and are managed by a single admin account.
- Users will interact with the system in English.

## Challenges Faced and Solutions
- **Google Calendar OAuth Integration:** Handling OAuth2 flow and securely storing tokens was complex. This was solved by using the `googleapis` library and persisting tokens in a local SQLite database.
- **Cross-Platform Sync:** Ensuring real-time synchronization between Telegram bot requests and the web dashboard was challenging. This was addressed by centralizing appointment requests in the backend database and exposing REST APIs for both the bot and web app.
- **Time Zone and Buffer Management:** Managing chatbot lack of real-time awareness and ensuring buffer periods around meetings required careful use of the `moment` library and consistent formatting across all components.

## Limitations and Future Improvements
- **Single Admin/Calendar:** Currently, the system supports only one Google Calendar/admin. With more time, I would add multi-user and multi-calendar support for broader applicability.
- **Manual Token Management:** The Telegram bot requires a refresh token in the `.env` file. Automating this process or providing a user-friendly authentication flow for the bot would improve usability.
- **Scalability:** The backend is designed for local or small-scale use. For production, I would refactor for cloud deployment, add authentication/authorization, and improve error monitoring.
- **Notification System:** Currently, Telegram users are not notified when their request is accepted/declined. Adding push notifications or direct messages would enhance the user experience.
- **Keyword-Based Prompt Handling:** The system currently relies on keyword matching to interpret user input rather than passing free-form prompts directly to the chatbot for contextual understanding. Enabling full natural language processing would allow more flexible and intelligent handling of user requests.
- **Advanced NLP:** While GPT-3.5 is powerful, edge cases in natural language understanding may still occur. Fine-tuning prompts or adding fallback logic could improve reliability.

## Bonus Feature: External User Booking via Telegram Bot
**Feature Overview:**
- External users can message the Telegram bot to request a meeting by selecting from suggested available time slots.
- The bot sends the appointment request to the backend, where it appears in the web dashboard for admin review.
- The admin (web user) can accept or decline the request. Upon acceptance, the event is added to the Google Calendar; upon decline, the request is marked as declined.
- This enables seamless cross-platform scheduling, allowing external users to initiate meetings without direct access to the web app or calendar.

**Implementation Details:**
- The Telegram bot uses inline keyboards to present available slots, and appointment requests are sent to the backend via REST API.
- The backend stores requests in the database and exposes them to the web dashboard.
- Admins can manage requests in real time, and all actions are synchronized across platforms.