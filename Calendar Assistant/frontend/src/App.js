import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, Calendar, Bot, User, Loader2, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'requests'
  const [appointmentRequests, setAppointmentRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
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

  // Load appointment requests when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadAppointmentRequests();
    }
  }, [isAuthenticated]);

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

  const loadAppointmentRequests = async () => {
    setLoadingRequests(true);
    try {
      const response = await axios.get('/api/appointment-requests');
      setAppointmentRequests(response.data);
    } catch (error) {
      console.error('Error loading appointment requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await axios.post(`/api/appointment-requests/${requestId}/accept`);
      await loadAppointmentRequests(); // Reload requests
      addMessage('assistant', 'Appointment request accepted and added to your calendar!');
    } catch (error) {
      console.error('Error accepting request:', error);
      addMessage('assistant', 'Sorry, there was an error accepting the appointment request.');
    }
  };

  const handleDeclineRequest = async (requestId) => {
    try {
      await axios.post(`/api/appointment-requests/${requestId}/decline`);
      await loadAppointmentRequests(); // Reload requests
      addMessage('assistant', 'Appointment request declined.');
    } catch (error) {
      console.error('Error declining request:', error);
      addMessage('assistant', 'Sorry, there was an error declining the appointment request.');
    }
  };

  const getSuggestedCommands = () => [
    "Summarize my day",
    "Schedule a 30-minute meeting with John tomorrow at 2 PM",
    "Book a 1-hour lunch with Sarah on Friday",
    "What's on my calendar today?"
  ];

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="status-icon pending" />;
      case 'accepted':
        return <CheckCircle className="status-icon accepted" />;
      case 'declined':
        return <XCircle className="status-icon declined" />;
      default:
        return <AlertCircle className="status-icon" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'accepted':
        return 'Accepted';
      case 'declined':
        return 'Declined';
      default:
        return 'Unknown';
    }
  };

  const pendingRequests = appointmentRequests.filter(req => req.status === 'pending');
  const processedRequests = appointmentRequests.filter(req => req.status !== 'pending');

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

        {/* Tab Navigation */}
        {isAuthenticated && (
          <div className="tab-navigation">
            <button 
              className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              <Bot size={16} />
              Chat Assistant
            </button>
            <button 
              className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
              onClick={() => setActiveTab('requests')}
            >
              <Clock size={16} />
              Appointment Requests
              {pendingRequests.length > 0 && (
                <span className="request-badge">{pendingRequests.length}</span>
              )}
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="content-area">
          {activeTab === 'chat' ? (
            /* Chat Interface */
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
          ) : (
            /* Appointment Requests Interface */
            <div className="requests-container">
              <div className="requests-header">
                <h2>Appointment Requests</h2>
                <button 
                  className="refresh-btn"
                  onClick={loadAppointmentRequests}
                  disabled={loadingRequests}
                >
                  <Loader2 className={loadingRequests ? 'spinner' : ''} />
                  Refresh
                </button>
              </div>

              {loadingRequests ? (
                <div className="loading-requests">
                  <Loader2 className="spinner" />
                  <span>Loading requests...</span>
                </div>
              ) : (
                <>
                  {/* Pending Requests */}
                  {pendingRequests.length > 0 && (
                    <div className="requests-section">
                      <h3>Pending Requests ({pendingRequests.length})</h3>
                      <div className="requests-list">
                        {pendingRequests.map((request) => (
                          <div key={request.id} className="request-card pending">
                            <div className="request-header">
                              <div className="request-info">
                                <h4>{request.requesterName}</h4>
                                <p className="request-contact">via {request.requesterContact}</p>
                              </div>
                              {getStatusIcon(request.status)}
                            </div>
                            <div className="request-details">
                              <p><strong>Date:</strong> {formatDate(request.requestedDate)}</p>
                              <p><strong>Time:</strong> {formatTime(request.requestedTime)}</p>
                              <p><strong>Duration:</strong> {request.duration} minutes</p>
                              {request.description && (
                                <p><strong>Description:</strong> {request.description}</p>
                              )}
                            </div>
                            <div className="request-actions">
                              <button 
                                className="accept-btn"
                                onClick={() => handleAcceptRequest(request.id)}
                              >
                                <CheckCircle size={16} />
                                Accept
                              </button>
                              <button 
                                className="decline-btn"
                                onClick={() => handleDeclineRequest(request.id)}
                              >
                                <XCircle size={16} />
                                Decline
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Processed Requests */}
                  {processedRequests.length > 0 && (
                    <div className="requests-section">
                      <h3>Processed Requests ({processedRequests.length})</h3>
                      <div className="requests-list">
                        {processedRequests.map((request) => (
                          <div key={request.id} className={`request-card ${request.status}`}>
                            <div className="request-header">
                              <div className="request-info">
                                <h4>{request.requesterName}</h4>
                                <p className="request-contact">via {request.requesterContact}</p>
                              </div>
                              {getStatusIcon(request.status)}
                            </div>
                            <div className="request-details">
                              <p><strong>Date:</strong> {formatDate(request.requestedDate)}</p>
                              <p><strong>Time:</strong> {formatTime(request.requestedTime)}</p>
                              <p><strong>Duration:</strong> {request.duration} minutes</p>
                              <p><strong>Status:</strong> {getStatusText(request.status)}</p>
                              {request.description && (
                                <p><strong>Description:</strong> {request.description}</p>
                              )}
                              {request.calendarEventLink && (
                                <a 
                                  href={request.calendarEventLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="calendar-link"
                                >
                                  View in Calendar
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {appointmentRequests.length === 0 && (
                    <div className="no-requests">
                      <Clock size={48} />
                      <h3>No appointment requests yet</h3>
                      <p>Appointment requests from your Telegram bot will appear here.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Input (only show in chat tab) */}
        {activeTab === 'chat' && (
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
        )}
      </div>
    </div>
  );
}

export default App; 