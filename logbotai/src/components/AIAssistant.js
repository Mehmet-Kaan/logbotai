import React, { useState } from "react";

const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(true); // Toggle for chatbox
  const [messages, setMessages] = useState([
    { type: "user", text: "Hello, Assistant!" },
    { type: "ai", text: "Hi there! How can I assist you today?" },
  ]);
  const [input, setInput] = useState("");

  const handleSendMessage = () => {
    if (input.trim()) {
      setMessages([...messages, { type: "user", text: input }]);
      setMessages((prevMessages) => [
        ...prevMessages,
        { type: "ai", text: "I'm here to help!" },
      ]);
      setInput(""); // Clear input field
    }
  };

  const handleInputChange = (e) => setInput(e.target.value);

  const toggleChatbox = () => setIsOpen(!isOpen); // Toggle visibility

  const styles = {
    toggleButton: {
      position: "fixed",
      right: "10px",
      top: "10px",
      backgroundColor: "#ef5e14", // Zello Orange
      color: "#ffffff",
      border: "none",
      borderRadius: "5px",
      padding: "10px",
      fontSize: "14px",
      cursor: "pointer",
      zIndex: 1100,
    },
    container: {
      position: "fixed",
      right: 0,
      top: 0,
      height: "100%",
      width: "300px",
      backgroundColor: "#0f1517", // Zello Gray
      color: "#ffffff",
      display: "flex",
      flexDirection: "column",
      boxShadow: "-3px 0 5px rgba(0, 0, 0, 0.2)",
      zIndex: 1000,
      transition: "transform 0.3s ease-in-out",
      transform: isOpen ? "translateX(0)" : "translateX(100%)",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: "#ef5e14", // Zello Orange
      padding: "10px 15px",
    },
    headerTitle: {
      margin: 0,
      fontSize: "18px",
    },
    closeButton: {
      background: "none",
      border: "none",
      fontSize: "20px",
      color: "#ffffff",
      cursor: "pointer",
    },
    body: {
      flex: 1,
      padding: "10px",
      overflowY: "auto",
      backgroundColor: "#0f1517",
    },
    messages: {
      display: "flex",
      flexDirection: "column",
      gap: "10px",
    },
    message: {
      maxWidth: "80%",
      padding: "10px",
      borderRadius: "5px",
      fontSize: "14px",
    },
    userMessage: {
      alignSelf: "flex-end",
      backgroundColor: "#ffffff",
      color: "#0f1517",
    },
    aiMessage: {
      alignSelf: "flex-start",
      backgroundColor: "#ef5e14",
      color: "#ffffff",
    },
    footer: {
      display: "flex",
      padding: "10px",
      backgroundColor: "#0f1517",
      borderTop: "1px solid #ef5e14",
    },
    input: {
      flex: 1,
      padding: "10px",
      fontSize: "14px",
      border: "none",
      borderRadius: "5px",
    },
    sendButton: {
      backgroundColor: "#ef5e14",
      color: "#ffffff",
      border: "none",
      padding: "10px 15px",
      marginLeft: "5px",
      cursor: "pointer",
      borderRadius: "5px",
    },
  };

  return (
    <>
      {/* Toggle button to show/hide the chatbox */}
      {!isOpen && (
        <button style={styles.toggleButton} onClick={toggleChatbox}>
          Open Chat
        </button>
      )}

      {/* Chatbox container */}
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.headerTitle}>AI Assistant</h2>
          <button style={styles.closeButton} onClick={toggleChatbox}>
            &times;
          </button>
        </div>
        <div style={styles.body}>
          <div style={styles.messages}>
            {messages.map((message, index) => (
              <div
                key={index}
                style={{
                  ...styles.message,
                  ...(message.type === "user"
                    ? styles.userMessage
                    : styles.aiMessage),
                }}
              >
                {message.text}
              </div>
            ))}
          </div>
        </div>
        <div style={styles.footer}>
          <input
            type="text"
            placeholder="Type your message..."
            value={input}
            onChange={handleInputChange}
            style={styles.input}
          />
          <button style={styles.sendButton} onClick={handleSendMessage}>
            Send
          </button>
        </div>
      </div>
    </>
  );
};

export default AIAssistant;