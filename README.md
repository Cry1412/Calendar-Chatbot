# AI Software Engineer Take-Home Assessment: The AI Scheduling Assistant

As the next step in our process, this take-home assessment is designed to give you an opportunity to showcase your skills on a practical, real-world problem. Our goal is to see how you approach building a product that combines software engineering best practices with modern AI capabilities.

You are encouraged to use modern AI-powered development tools (e.g., Claude, Cursor, v0.dev) to assist you. The goal is to see how you leverage these tools to build effectively. However, **we do not accept solutions built on no-code/low-code platforms like Zapier or n8n**. The final submission must be your own code.

We respect your time and have designed this test to be completed within **3–5 hours**. Please don't feel the need to over-engineer your solution; we are most interested in your thought process, code quality, and ability to deliver a functional proof-of-concept. The bonus section is entirely optional.

Good luck, and we look forward to seeing what you build!

---

## Getting Started

1. **Fork the Repository**  
   Start by forking this repository.

2. **Work on Your Fork**  
   Do all your work in your forked repository. Please commit your changes regularly to show your development process.


---

## 1. The Challenge: Build an AI Scheduling Assistant

Your task is to build an AI-powered assistant that helps a busy professional manage their Google Calendar.


### Part 1: The Personal AI Calendar Assistant (Web App)

A web app with a chatbot-style interface where users can securely access, view, and manage their calendar

#### Core Requirements

**Backend Server:**
- Build a simple backend server using the language and framework of your choice (e.g., Ruby on Rails/Python/FastAPI, Node.js/Express, Go).
- Integrate with Google Calendar to fetch and create events.
- Integrate with an LLM of your choice (e.g., via OpenAI, Google AI, Anthropic, or a local model).
- Provide core assistant logic via an API for the frontend. Document your API design choices in your `README.md`.

**Required Features:**
- **Daily Summary Generation:** Fetch all events for the current day and use the LLM to generate a concise, human-like summary of the schedule. A simple list of events is not enough. For example:  
  > "You have a packed morning with back-to-back meetings, but your afternoon is clear after 2:30 PM for deep work."
- **Natural Language Scheduling:** Process commands like:  
  > "Schedule a 45-minute code review with Maya tomorrow at 11 AM"  

- Extract intent, title, attendees, date, time, duration, and create the corresponding event in Google Calendar.

- Feel free to create your unqiue AI personalities.

**Frontend Interface:**
- Create a single-page web application.
- Include a text input for commands (e.g., "summarize my day", "schedule a meeting...") and a display area for assistant responses.
- This is your chance to get creative, surprise us with your design!

---

### Part 2: The Public Meeting Booker (Telegram Bot)

A Telegram bot that allows **external people** to book meetings without seeing the professional’s private schedule.

#### Core Requirements

**Telegram Bot Integration:**
- Create a simple Telegram bot that can respond to user messages.

**Privacy-Preserving Logic:**
- Suggest available meeting times without revealing details of existing appointments.
- Assume the professional's working hours are **Monday to Friday, 9:00 AM to 5:00 PM** in their local timezone.
- Enforce a 15-minute buffer before and after any existing meeting.

**Booking Workflow::**
- Allow an external user to message the bot to book a meeting.

---

### Part 3: Bonus Feature (Optional)

If you have time and inspiration, add one feature you believe would improve the product. This is your chance to demonstrate **creativity and product sense**. In your `write-up.md`, explain why you chose this feature and how it adds value.


---

## 2. Deliverables

Please submit a link to a **single public GitHub repository** containing the following:

- **Source Code:** All backend and frontend code for all parts of the project.
- **README.md:**  
  - Brief overview of your architectural choices and why you made them.
  - Clear, step-by-step setup instructions (including installing dependencies and configuring environment variables such as Google API credentials, LLM API key, Telegram Bot token).
  - Instructions on how to run and test all parts of the application.
- **write-up.md:**  
  - Any assumptions you made.
  - Challenges you faced and how you overcame them.
  - Limitations of your current solution and how you would improve it with more time.
  - If you did the bonus, a section explaining your chosen feature.

---

## 3. FAQ

**1. What is the policy about using AI in this test?**  
AI usage is encouraged! This is an *“open book”* assessment. Feel free to use the same tools you’d rely on in a real job, including Google, StackOverflow, and AI assistants.

**2. Are there any specific requirements for the API implementation, such as response time constraints or throughput targets?**  
We’re more interested in your improvement process and thought process than in hitting specific performance metrics.

**3. Should I consider common security issues like DoS or other attacks?**  
No need to worry about these in general. The focus is on the software itself.

**4. Do I have to pay out of pocket for LLM API usage?**  
No! There are plenty of free options available online. If you can’t find one, just request an API key from me:


---

If you have any questions, please reach out to me: **isaac@project65.co**
