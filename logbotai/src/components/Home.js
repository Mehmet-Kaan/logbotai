import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/home.css';
import { db } from "./firebase.js";
import { 
  collection, 
  addDoc, 
  query, 
  deleteDoc, 
  where, 
  getDocs, 
  setDoc, 
  onSnapshot, 
  serverTimestamp 
} from "firebase/firestore"; 
import { AuthContext } from './AuthProvider.js';
import apiClient from "./api.js";
import getNewID from "./utils.js";
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { GlobalWorkerOptions } from 'pdfjs-dist';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPaperPlane, 
  faArrowsRotate, 
  faQuoteRight, 
  faXmark, 
  faWandMagicSparkles, 
  faUser, 
  faFileLines, 
  faMagnifyingGlass
} from '@fortawesome/free-solid-svg-icons';

import TypingMessage from './TypingMessage.js';
import Navbar from './Navbar.js';
import DocumentManager from './DocumentManager.js';
import PodcastStudio from './PodcastStudio.js';
import OperationsView from './OperationsView.js';

// Worker lockstep
GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.min.mjs`;

const SUGGESTED_PROMPTS = [
  "Summarize the core takeaways and key conclusions.",
  "Extract key metrics, statistics, and actionable points.",
  "What are the main risks, dependencies, or limitations mentioned?",
  "Draft an executive briefing based on these files."
];

const Home = () => {
  const { currentUser } = useContext(AuthContext);
  const [userUid, setUserUid] = useState("");
  const [usersData, setUsersData] = useState([]);
  const [usersPodcast, setUsersPodcast] = useState(null);

  const navigate = useNavigate();

  // Active Workspace Navigation Tab
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'documents' | 'podcast' | 'operations'

  // Loading and feedback states
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logbotThinking, setLogbotThinking] = useState(false);
  const [readingFiles, setReadingFiles] = useState(false);
  const [locatingText, setLocatingText] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  // Files & Embeddings
  const [files, setFiles] = useState([]);
  const [filesContents, setFilesContents] = useState([]);
  const [embedded, setEmbedded] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);

  // Chat conversation
  const [chatInput, setChatInput] = useState("");
  const [conversation, setConversation] = useState([]);
  const [aimodel, setAimodel] = useState("openai");

  // Podcast state
  const [generatingPodcast, setGeneratingPodcast] = useState(false);
  const [selectedPodcastFile, setSelectedPodcastFile] = useState(null);
  const [presenterVoice, setPresenterVoice] = useState("alloy");
  const [guestVoice, setGuestVoice] = useState("nova");

  // Citation & Snippet popup
  const [highlightedText, setHighlightedText] = useState("");
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20MB limit

  // Auth redirect check
  useEffect(() => {
    if (!currentUser) {
      navigate("/signin");
    } else {
      setUserUid(currentUser.uid);
    }
  }, [currentUser, navigate]);

  // Sync documents from Firestore
  useEffect(() => {
    if (userUid) {
      const q = query(collection(db, "users", userUid, "files"));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        let data = snapshot.docs.map((doc) => {
          let docData = doc.data();
          let uploadDate = new Date();
          if (docData.date && docData.date.includes(" - ")) {
            try {
              const [time, date] = docData.date.split(" - ");
              const [hours, minutes] = time.split(":").map(Number);
              const [day, month, year] = date.split("/").map(Number);
              uploadDate = new Date(year, month - 1, day, hours, minutes);
            } catch (e) {
              uploadDate = new Date();
            }
          }

          return { ...docData, id: doc.id, uploadDate };
        });

        // Group chunks by file name
        const groupedFiles = data.reduce((acc, document) => {
          if (!acc[document.name]) {
            acc[document.name] = [];
          }
          acc[document.name].push(document);
          return acc;
        }, {});

        // Reconstruct files
        const reconstructedFiles = Object.values(groupedFiles).map((fileGroup) => {
          fileGroup.sort((a, b) => a.chunkIndex - b.chunkIndex);
          const fullContent = fileGroup.map((chunk) => chunk.content).join('');

          return {
            name: fileGroup[0].name,
            embeddedText: fileGroup.map(chunk => chunk.embeddedText).flat(),
            content: fullContent,
            id: fileGroup[0].id,
            uploadDate: fileGroup[0].uploadDate
          };
        });

        reconstructedFiles.sort((a, b) => b.uploadDate - a.uploadDate);
        setUsersData(reconstructedFiles);
      });

      return unsubscribe;
    }
  }, [userUid]);

  // Auto-scroll chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversation, logbotThinking]);

  // Auto-assign first selected file for podcast if none selected
  useEffect(() => {
    if (selectedFiles.length > 0 && !selectedPodcastFile) {
      setSelectedPodcastFile(selectedFiles[0]);
    }
  }, [selectedFiles, selectedPodcastFile]);

  const getDate = () => {
    const d = new Date();
    return `${d.getHours()}:${d.getMinutes()} - ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  // Drag & drop handlers
  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    let allowedFiles = droppedFiles.filter(file => 
      file.name.endsWith('.docx') || file.name.endsWith('.pdf')
    );

    if (allowedFiles.length < droppedFiles.length) {
      alert("Only .docx and .pdf files are supported.");
    }

    if (allowedFiles.length > 10) {
      alert("You can upload at most 10 files at a time.");
      allowedFiles = allowedFiles.slice(0, 10);
    }

    setFiles(allowedFiles);
    readAllFiles(allowedFiles);
  };

  const handleFileSelection = (event) => {
    let selectedFilesList = Array.from(event.target.files);
    const maxFiles = 10;
    if (selectedFilesList.length > maxFiles) {
      alert(`You can only select up to ${maxFiles} files at once.`);
      selectedFilesList = selectedFilesList.slice(0, maxFiles);
    }

    const allowedFiles = selectedFilesList.filter(file => 
      file.name.endsWith('.docx') || file.name.endsWith('.pdf')
    );

    const uniqueFiles = allowedFiles.filter((file, index, self) => 
      index === self.findIndex((f) => f.name === file.name)
    );

    setFiles(prevFiles => [...prevFiles, ...uniqueFiles]);
    readAllFiles(uniqueFiles);
  };

  const readAllFiles = async (filesToRead) => {
    setReadingFiles(true);
    let contentOfFiles = [];
    let totalSize = 0;

    for (let file of filesToRead) {
      totalSize += file.size;
    }

    if (totalSize > MAX_TOTAL_SIZE) {
      setFiles([]);
      setReadingFiles(false);
      alert("Total file size exceeds 20MB limit. Please select smaller files.");
      return;
    }

    for (let file of filesToRead) {
      const fileExtension = file.name.split('.').pop().toLowerCase();
      let content = "";
      if (fileExtension === "pdf") {
        content = await readPDFFile(file);
      } else {
        content = await readDOCFile(file);
      }
      contentOfFiles.push({ name: file.name, content });
    }

    setFilesContents(contentOfFiles);
    setReadingFiles(false);
  };

  const readDOCFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const arrayBuffer = reader.result;
          const result = await mammoth.extractRawText({ arrayBuffer });
          resolve(result.value);
        } catch (error) {
          console.error("Error processing .docx file:", error);
          reject(error);
        }
      };
      reader.onerror = (error) => {
        console.error("Error reading file:", error);
        reject(error);
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const readPDFFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const arrayBuffer = reader.result;
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          let textContent = '';

          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const text = await page.getTextContent();
            const pageText = text.items.map(item => item.str).join(' ');
            textContent += pageText + '\n';
          }
          resolve(textContent);
        } catch (error) {
          console.error("Error processing PDF file:", error);
          reject(error);
        }
      };
      reader.onerror = (error) => {
        console.error("Error reading file:", error);
        reject(error);
      };
      reader.readAsArrayBuffer(file);
    });
  };

  // Embeddings API call
  const handleUpload = async () => {
    setLoading(true);
    if (filesContents.length === 0) {
      alert("Files are still being processed. Please wait a moment.");
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.post("/huggingfaceEmbedding", {
        filesContents,
      }, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.status === 200) {
        const data = response.data;
        setUploaded(true);

        const seenFiles = new Set();
        const embeddedDataFromAI = [];

        for (const file of data.embedded) {
          const sourceFile = filesContents.find(({ name }) => name === file.name);
          const embeddedFile = { ...file, content: sourceFile?.content || "" };
          if (!seenFiles.has(file.name)) {
            handleCheck(embeddedFile);
            seenFiles.add(file.name);
            embeddedDataFromAI.push(embeddedFile);
          }
        }
        setEmbedded(embeddedDataFromAI);
      } else {
        throw new Error(`Server error: ${response.statusText}`);
      }
    } catch (err) {
      console.error("Error uploading files:", err);
      alert("Failed to generate embeddings. Check network connection.");
    } finally {
      setLoading(false);
    }
  };

  // Chunking for Firestore
  const splitContentIntoChunks = (content) => {
    const chunkSize = 1000000; // 1MB limit
    const chunks = [];
    for (let i = 0; i < content.length; i += chunkSize) {
      chunks.push(content.slice(i, i + chunkSize));
    }
    return chunks;
  };

  // Save to Firestore
  const saveFilesToFirestore = async () => {
    setSaving(true);
    const userFilesCollection = collection(db, "users", userUid, "files");

    const groupedFiles = embedded.reduce((acc, document) => {
      if (!acc[document.name]) {
        acc[document.name] = [];
      }
      acc[document.name].push(document);
      return acc;
    }, {});

    for (const [fileName, fileGroup] of Object.entries(groupedFiles)) {
      const exists = usersData.some((obj) => obj.name === fileName);
      if (!exists) {
        try {
          for (const file of fileGroup) {
            const contentChunks = splitContentIntoChunks(file.content);
            for (let chunkIndex = 0; chunkIndex < contentChunks.length; chunkIndex++) {
              const chunk = contentChunks[chunkIndex];
              const newFile = {
                fileID: getNewID(currentUser?.metadata.lastLoginAt || '1'),
                timestamp: serverTimestamp(),
                date: getDate(),
                uid: userUid,
                name: file.name,
                content: chunk,
                chunkIndex: chunkIndex,
                totalChunks: contentChunks.length,
                embeddedText: file.embeddedText,
              };

              const docRef = await addDoc(userFilesCollection, newFile);
              await setDoc(docRef, newFile);
            }
          }
          handleClearUploadedFiles();
        } catch (error) {
          console.error("Error saving user's files:", error);
        }
      } else {
        alert(`Document "${fileName}" is already saved in your knowledge base.`);
      }
    }
    setSaving(false);
  };

  const handleDeleteSavedDocument = async (file) => {
    setSaving(true);
    const userFilesCollection = collection(db, "users", userUid, "files");

    try {
      const q = query(userFilesCollection, where("name", "==", file.name));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return;
      }

      const deletePromises = querySnapshot.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      setSelectedFiles((prev) => prev.filter((f) => f.name !== file.name));
      if (selectedPodcastFile?.name === file.name) {
        setSelectedPodcastFile(null);
      }
    } catch (error) {
      console.error("Error deleting user file:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCheck = (file) => {
    setSelectedFiles((prev) => {
      const exists = prev.some((f) => f.name === file.name);
      if (exists) {
        const filtered = prev.filter((f) => f.name !== file.name);
        if (selectedPodcastFile?.name === file.name) {
          setSelectedPodcastFile(filtered.length > 0 ? filtered[0] : null);
        }
        return filtered;
      } else {
        const updated = [...prev, file];
        if (!selectedPodcastFile) {
          setSelectedPodcastFile(file);
        }
        return updated;
      }
    });
  };

  const handleClearUploadedFiles = () => {
    const filteredSelected = selectedFiles.filter(
      (selectedFile) => !files.some((file) => file.name === selectedFile.name)
    );
    setSelectedFiles(filteredSelected);
    setFiles([]);
    setEmbedded([]);
    setUploaded(false);
  };

  const handleResetStaged = () => {
    setFiles([]);
    setFilesContents([]);
    setEmbedded([]);
    setUploaded(false);
  };

  // Chat submit
  const handleChatSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const currentPrompt = chatInput.trim();
    setLogbotThinking(true);
    setChatInput("");

    const userMessage = { role: "user", content: currentPrompt };
    setConversation((prev) => [...prev, userMessage]);

    let selectedFilesEmbeddedTexts = [];
    let allTexts = [];

    for (let file of selectedFiles) {
      selectedFilesEmbeddedTexts.push(file.embeddedText || []);
      allTexts.push(file.content || "");
    }

    try {
      const response = await apiClient.post("/chat", {
        question: currentPrompt,
        storedEmbeddings: selectedFilesEmbeddedTexts,
        originalTexts: allTexts,
        model: aimodel,
        temperature: 0.2,
        conversation: conversation,
      });

      const botMessage = { role: "system", content: response.data.answer };
      setConversation((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error("Error sending chat message:", err);
      const errorMessage = { 
        role: "system", 
        content: "I encountered an error connecting to the AI inference engine. Please check backend connectivity or try again." 
      };
      setConversation((prev) => [...prev, errorMessage]);
    } finally {
      setLogbotThinking(false);
    }
  };

  // Citation & snippet retrieval
  const getTheTextSnipp = async (text) => {
    setLogbotThinking(true);
    setLocatingText(true);

    let allTextsFromSelectedFiles = selectedFiles
      .filter(file => file.content)
      .map(file => file.content)
      .join(" ");

    try {
      const response = await apiClient.post("/getTextSnippGroq", {
        model: "openai/gpt-oss-120b",
        textToLocate: text,
        allText: allTextsFromSelectedFiles,
      });

      if (text !== response.data.textSnipp && response.data.textSnipp) {
        setHighlightedText(response.data.textSnipp);
        setIsPopupOpen(true);
      } else {
        setHighlightedText("Could not locate verbatim excerpt in active documents.");
        setIsPopupOpen(true);
      }
    } catch (err) {
      console.error("Error retrieving citation snippet:", err);
      setHighlightedText("Citation locator service unavailable.");
      setIsPopupOpen(true);
    } finally {
      setLogbotThinking(false);
      setLocatingText(false);
    }
  };

  // Podcast generation
  const generatePodcast = async () => {
    if (!selectedPodcastFile) return;
    setLogbotThinking(true);
    setGeneratingPodcast(true);

    let allTextsFromSelectedPodcastFile = selectedPodcastFile.content;
    let titleOfPodcast = `Podcast - ${selectedPodcastFile.name.replace(/\.(pdf|docx)$/i, "")}`;

    try {
      const response = await apiClient.post("/generatePodcast", {
        allText: allTextsFromSelectedPodcastFile,
        title: titleOfPodcast,
        presenterVoice: presenterVoice,
        guestVoice: guestVoice
      });

      setUsersPodcast(response.data);
    } catch (err) {
      console.error("Error generating podcast:", err);
      alert("Failed to synthesize podcast audio.");
    } finally {
      setLogbotThinking(false);
      setGeneratingPodcast(false);
    }
  };

  // Citation Popup Modal
  const HighlightPopup = ({ highlightText, isOpen, onClose }) => {
    if (!isOpen) return null;
    const allTextsFromSelectedFiles = selectedFiles.map(file => file.content).join('\n');

    return (
      <div className="citation-modal-overlay" onClick={onClose}>
        <div className="citation-modal-card" onClick={(e) => e.stopPropagation()}>
          <div className="citation-modal-header">
            <div className="citation-header-title">
              <span className="citation-icon-badge">
                <FontAwesomeIcon icon={faMagnifyingGlass} />
              </span>
              <div>
                <h3>Source Citation Locator</h3>
                <p>Exact passage found in active knowledge files</p>
              </div>
            </div>
            <button className="citation-modal-close" onClick={onClose}>
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>

          <div className="citation-modal-body">
            <div className="citation-highlight-banner">
              <span className="banner-label">Target Text:</span>
              <p className="banner-snippet">"{highlightText}"</p>
            </div>

            <div className="citation-document-view">
              {allTextsFromSelectedFiles.split('\n').filter(p => p.trim()).map((paragraph, idx) => (
                <p key={idx} className="citation-doc-paragraph">
                  {paragraph.includes(highlightText) ? (
                    paragraph.split(highlightText).map((part, partIdx, arr) => (
                      <span key={partIdx}>
                        {part}
                        {partIdx < arr.length - 1 && (
                          <mark className="highlight-phrase">{highlightText}</mark>
                        )}
                      </span>
                    ))
                  ) : (
                    paragraph
                  )}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="logbot-workspace">
      {/* Top Navbar Header */}
      <Navbar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onSignOut={() => navigate('/signOut')}
        savedFilesCount={usersData.length}
        selectedFilesCount={selectedFiles.length}
      />

      {/* Global Status Banner / Loaders */}
      {(readingFiles || locatingText || generatingPodcast || saving) && (
        <div className="global-operation-banner">
          <div className="banner-pill">
            <div className="lds-ripple"><div></div><div></div></div>
            <span>
              {readingFiles && "Extracting document content & layout..."}
              {locatingText && "Cross-referencing citation in vector space..."}
              {generatingPodcast && "Directing multi-voice studio speech synthesis..."}
              {saving && "Synchronizing document vectors to database..."}
            </span>
          </div>
        </div>
      )}

      {/* Citation Popover Modal */}
      <HighlightPopup 
        highlightText={highlightedText} 
        isOpen={isPopupOpen} 
        onClose={() => setIsPopupOpen(false)} 
      />

      {/* Main Workspace Dynamic Views */}
      <main className="workspace-main-stage">
        {/* VIEW 1: AI CHAT */}
        {activeTab === 'chat' && (
          <div className="chat-view-container">
            {/* Top Context & Active Documents Bar */}
            <div className="chat-context-bar">
              <div className="context-left">
                <span className="context-label">Active Grounding:</span>
                {selectedFiles.length === 0 ? (
                  <button 
                    type="button" 
                    className="no-context-chip"
                    onClick={() => setActiveTab('documents')}
                  >
                    <span>No documents selected (General AI mode)</span>
                    <span className="context-add-btn">+ Add Files</span>
                  </button>
                ) : (
                  <div className="context-file-chips">
                    {selectedFiles.map((file, idx) => (
                      <span key={idx} className="active-file-chip">
                        <FontAwesomeIcon icon={faFileLines} />
                        <span className="chip-name" title={file.name}>{file.name}</span>
                        <button 
                          type="button" 
                          className="chip-remove"
                          onClick={() => handleCheck(file)}
                          title="Unlink from chat context"
                        >
                          <FontAwesomeIcon icon={faXmark} />
                        </button>
                      </span>
                    ))}
                    <button 
                      type="button" 
                      className="manage-files-link"
                      onClick={() => setActiveTab('documents')}
                    >
                      Manage ({selectedFiles.length})
                    </button>
                  </div>
                )}
              </div>

              <div className="context-right">
                <div className="model-selector-pill">
                  <span className="selector-label">Model:</span>
                  <select 
                    value={aimodel} 
                    onChange={(e) => setAimodel(e.target.value)}
                    className="model-select"
                  >
                    <option value="openai">OpenAI GPT-4o Mini</option>
                  </select>
                </div>

                {conversation.length > 0 && (
                  <button 
                    type="button"
                    className="clear-chat-pill" 
                    onClick={() => setConversation([])}
                    title="Start clean conversation"
                  >
                    <FontAwesomeIcon icon={faArrowsRotate} />
                    <span>Reset Chat</span>
                  </button>
                )}
              </div>
            </div>

            {/* Chat Stream Messages */}
            <div className="chat-messages-stage">
              {conversation.length === 0 ? (
                <div className="chat-welcome-card">
                  <div className="welcome-avatar-aura">
                    <span className="aura-bot-icon">⚡</span>
                  </div>
                  <h2 className="welcome-title">LogBot AI Intelligence</h2>
                  <p className="welcome-desc">
                    Ask questions, extract facts, or cross-analyze information across your ingested documents. LogBot will cite verbatim references.
                  </p>

                  <div className="suggested-prompts-grid">
                    <span className="suggestions-label">Try starting with:</span>
                    <div className="prompts-row">
                      {SUGGESTED_PROMPTS.map((promptText, idx) => (
                        <button 
                          key={idx} 
                          type="button" 
                          className="prompt-chip-btn"
                          onClick={() => {
                            setChatInput(promptText);
                          }}
                        >
                          <FontAwesomeIcon icon={faWandMagicSparkles} />
                          <span>{promptText}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="messages-flow">
                  {conversation.map((msg, index) => {
                    const isBot = msg.role === "system";
                    return (
                      <div key={index} className={`message-row ${isBot ? 'bot' : 'user'}`}>
                        <div className="message-avatar">
                          {isBot ? (
                            <span className="bot-avatar-badge">AI</span>
                          ) : (
                            <FontAwesomeIcon icon={faUser} />
                          )}
                        </div>

                        <div className="message-bubble-card">
                          <div className="bubble-header">
                            <span className="sender-name">{isBot ? 'LogBot AI' : currentUser?.displayName || 'You'}</span>
                          </div>

                          <div className="bubble-body">
                            {isBot ? (
                              <TypingMessage text={msg.content} speed={12} />
                            ) : (
                              msg.content
                            )}
                          </div>

                          {/* Citation action button */}
                          {isBot && selectedFiles.length > 0 && (
                            <div className="bubble-footer">
                              <button 
                                type="button"
                                className="cite-source-btn"
                                onClick={() => getTheTextSnipp(msg.content)}
                                title="Locate exact passage in source documents"
                              >
                                <FontAwesomeIcon icon={faQuoteRight} />
                                <span>Locate Source Excerpt</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {logbotThinking && (
                    <div className="message-row bot thinking">
                      <div className="message-avatar">
                        <span className="bot-avatar-badge">AI</span>
                      </div>
                      <div className="thinking-bubble">
                        <div className="lds-ellipsis">
                          <div></div><div></div><div></div><div></div>
                        </div>
                        <span className="thinking-label">Synthesizing response from documents...</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Inset Chat Input Bar */}
            <div className="chat-input-deck">
              <form className="chat-input-form" onSubmit={handleChatSubmit}>
                <input
                  type="text"
                  className="tactile-chat-input"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={
                    selectedFiles.length > 0 
                      ? `Ask questions grounded in ${selectedFiles.length} selected document(s)...`
                      : "Type your query or ask LogBot AI anything..."
                  }
                />

                <button 
                  type="submit" 
                  className="chat-send-btn"
                  disabled={!chatInput.trim() || logbotThinking}
                  title="Send message"
                >
                  <FontAwesomeIcon icon={faPaperPlane} />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* VIEW 2: DOCUMENTS & KNOWLEDGE BASE */}
        {activeTab === 'documents' && (
          <DocumentManager 
            usersData={usersData}
            files={files}
            uploaded={uploaded}
            loading={loading}
            saving={saving}
            readingFiles={readingFiles}
            selectedFiles={selectedFiles}
            handleCheck={handleCheck}
            handleDragOver={handleDragOver}
            handleDrop={handleDrop}
            handleFileSelection={handleFileSelection}
            handleUpload={handleUpload}
            handleClearUploadedFiles={handleClearUploadedFiles}
            saveFilesToFirestore={saveFilesToFirestore}
            handleDeleteSavedDocument={handleDeleteSavedDocument}
            setActiveTab={setActiveTab}
            onResetFiles={handleResetStaged}
          />
        )}

        {/* VIEW 3: PODCAST STUDIO */}
        {activeTab === 'podcast' && (
          <PodcastStudio 
            selectedFiles={selectedFiles.length > 0 ? selectedFiles : usersData}
            selectedPodcastFile={selectedPodcastFile}
            setSelectedPodcastFile={setSelectedPodcastFile}
            presenterVoice={presenterVoice}
            setPresenterVoice={setPresenterVoice}
            guestVoice={guestVoice}
            setGuestVoice={setGuestVoice}
            generatePodcast={generatePodcast}
            generatingPodcast={generatingPodcast}
            usersPodcast={usersPodcast}
            setActiveTab={setActiveTab}
          />
        )}

        {/* VIEW 4: OPERATIONS & TELEMETRY */}
        {activeTab === 'operations' && (
          <OperationsView 
            usersData={usersData}
            selectedFiles={selectedFiles}
            setActiveTab={setActiveTab}
            onSelectPrompt={(text) => setChatInput(text)}
          />
        )}
      </main>
    </div>
  );
};

export default Home;
