import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, Calendar, Bot, User, Loader2 } from 'lucide-react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Check URL parameters for auth status
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get('auth');
    
    if (authStatus === 'success') {
      setIsAuthenticated(true);
      addMessage('assistant', 'Great! You\'re now connected to Google Calendar. How can I help you today?');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (authStatus === 'error') {
      addMessage('assistant', 'Sorry, there was an issue connecting to Google Calendar. Please try again.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const addMessage = (sender, content) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      sender,
      content,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const connectGoogleCalendar = async () => {
    setIsConnecting(true);
    try {
      const response = await axios.get('/auth/google');
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error('Error connecting to Google Calendar:', error);
      addMessage('assistant', 'Sorry, there was an issue connecting to Google Calendar. Please try again.');
      setIsConnecting(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    addMessage('user', userMessage);
    setIsLoading(true);

    try {
      const response = await axios.post('/api/assistant', {
        message: userMessage
      });

      addMessage('assistant', response.data.response);
    } catch (error) {
      console.error('Error sending message:', error);
      
      if (error.response?.status === 401) {
        addMessage('assistant', 'Please connect your Google Calendar first to use this feature.');
        setIsAuthenticated(false);
      } else {
        addMessage('assistant', 'Sorry, I\'m having trouble processing your request right now. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getSuggestedCommands = () => [
    "Summarize my day",
    "Schedule a 30-minute meeting with John tomorrow at 2 PM",
    "Book a 1-hour lunch with Sarah on Friday",
    "What's on my calendar today?"
  ];

  return (
    <div className="app">
      <div className="chat-container">
        {/* Header */}
        <div className="header">
          <div className="header-content">
            <div className="logo">
              <Calendar className="logo-icon" />
              <h1>AI Scheduling Assistant</h1>
            </div>
            {!isAuthenticated && (
              <button 
                className="connect-btn"
                onClick={connectGoogleCalendar}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="spinner" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Calendar />
                    Connect Google Calendar
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="messages-container">
          {messages.length === 0 && !isAuthenticated && (
            <div className="welcome-message">
              <div className="welcome-icon">
                <Bot />
              </div>
              <h2>Welcome to AI Scheduling Assistant</h2>
              <p>Connect your Google Calendar to get started with intelligent scheduling and daily summaries.</p>
              <button 
                className="connect-btn-large"
                onClick={connectGoogleCalendar}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="spinner" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Calendar />
                    Connect Google Calendar
                  </>
                )}
              </button>
            </div>
          )}

          {messages.length === 0 && isAuthenticated && (
            <div className="welcome-message">
              <div className="welcome-icon">
                <Bot />
              </div>
              <h2>How can I help you today?</h2>
              <p>Try asking me to summarize your day or schedule a meeting.</p>
              <div className="suggestions">
                {getSuggestedCommands().map((command, index) => (
                  <button
                    key={index}
                    className="suggestion-btn"
                    onClick={() => setInputMessage(command)}
                  >
                    {command}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.sender === 'user' ? 'user-message' : 'assistant-message'}`}
            >
              <div className="message-avatar">
                {message.sender === 'user' ? <User size={20} /> : <Bot size={20} />}
              </div>
              <div className="message-content">
                <div className="message-text">{message.content}</div>
                <div className="message-time">{message.timestamp}</div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="message assistant-message">
              <div className="message-avatar">
                <Bot size={20} />
              </div>
              <div className="message-content">
                <div className="loading-indicator">
                  <Loader2 className="spinner" />
                  <span>Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="input-container">
          <div className="input-wrapper">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isAuthenticated ? "Ask me to summarize your day or schedule a meeting..." : "Connect your calendar first..."}
              disabled={!isAuthenticated || isLoading}
              rows={1}
              className="message-input"
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading || !isAuthenticated}
              className="send-btn"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App; 