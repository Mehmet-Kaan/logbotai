import React, { useState, useRef } from "react";
import axios from "axios";
import "../styles/App.css";
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { GlobalWorkerOptions } from 'pdfjs-dist';

// Set the workerSrc to the local path
GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.min.mjs`;

function App() {
  const [loading, setLoading] = useState(false);
  const [logbotThinking, setLogbotThinking] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [files, setFiles] = useState([]);
  const [filesContents, setFilesContents] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const inputRef = useRef();
  
  const [embedded, setEmbedded] = useState([]);
  const [originalTexts, setOriginalTexts] = useState("");
  
  const apiURL = "https://logbotai-backend.onrender.com/";
  // const apiURL = "http://localhost:8080/";

  const handleDragOver = (event) => {
      event.preventDefault();        
  };

  const handleDrop = (event) => {
      event.preventDefault();

      // Get the dropped files
      const droppedFiles = Array.from(event.dataTransfer.files);

      // Filter only .docx files
      // const docxFiles = droppedFiles.filter(file => file.name.endsWith('.docx'));

      // // Optionally show an alert or message if some files were filtered out
      // if (docxFiles.length < droppedFiles.length) {
      //     alert("Only .docx files are allowed. Other file types have been ignored.");
      // }

      // Set the max number of files to 10
      // const maxFiles = 50;

      // // Check if the number of files exceeds the limit
      // if (docxFiles.length > maxFiles) {
      //     alert(`You can only upload up to ${maxFiles} files. The first ${maxFiles} files will be accepted.`);
      //     // Keep only the first maxFiles files
      //     docxFiles.splice(maxFiles);
      // }

      // Set the filtered .docx files
      setFiles(droppedFiles);

      // Read the contents of all files
      readAllFiles(droppedFiles);
  };

  const handleFileSelection = (event) => {
      // Get the selected files
      let selectedFiles = Array.from(event.target.files);

      // Set the maximum number of files to 10
      const maxFiles = 50;

      // If selected files exceed the limit, trim the list
      if (selectedFiles.length > maxFiles) {
          alert(`You can only select up to ${maxFiles} files. The first ${maxFiles} files will be accepted.`);
          selectedFiles = selectedFiles.slice(0, maxFiles);
      }

      // Filter only .docx files
      // const docxFiles = selectedFiles.filter(file => file.name.endsWith('.docx'));

      // Set the filtered .docx files
      setFiles(selectedFiles);

      // Read the contents of all files
      readAllFiles(selectedFiles);
  };

  const readAllFiles = async (files) => {
      let contentOfFiles = [];

      for (let file of files) {
          const fileExtension = file.name.split('.').pop().toLowerCase();
          let content;
          
          if (fileExtension === "pdf") {
            content = await readPDFFile(file);
          }else(
            content = await readDOCFile(file)
          )
          
          contentOfFiles.push({name:file.name, content:content});
      }
// console.log(contentOfFiles);

      // Ensure the state is updated after all files are read
      setFilesContents(contentOfFiles);
  };

  // Function to read a single file and return its content
  const readDOCFile = (file) => {

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                // Convert the ArrayBuffer to a Uint8Array
                const arrayBuffer = reader.result;
                const result = await mammoth.extractRawText({ arrayBuffer });
                
                // The text is available in result.value
                // console.log(`Read content from ${file.name}:`, result.value);
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
        reader.readAsArrayBuffer(file); // Read as ArrayBuffer for binary files
    });
  };

  const readPDFFile = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const arrayBuffer = reader.result;

                // Load the PDF document from the array buffer
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                let textContent = '';

                // Extract text from each page
                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    const page = await pdf.getPage(pageNum);
                    const text = await page.getTextContent();

                    // Join text items into a single string
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

  const handleUpload = async () => {
    setLoading(true);

    if (filesContents.length === 0) {
        alert("Files are still being read. Please wait.");
        setLoading(false); // Set loading to false if no files are present
        return;
    }

    let allTexts = [];
    for (let file of filesContents) {
          allTexts.push(file.content);
    }
    setOriginalTexts(allTexts);

    try {
        const response = await fetch(apiURL + "textToEmbedd", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                filesContents,
            }),
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.statusText}`);
        }

        const data = await response.json();
        setUploaded(true);
        setEmbedded(data.embedded);
        alert("Your file has been uploaded!");

    } catch (err) {
        console.error("Error uploading files:", err);
    } finally {      
        setLoading(false); // This will always run, regardless of success or error
    }
};

const handleChatSubmit = async (e) => {
  e.preventDefault();  
  if(chatInput){
    setLogbotThinking(true);
    setChatInput("");

    const userMessage = { sender: "Du", message: chatInput };
    setChatHistory([...chatHistory, userMessage]);
  
    try {
      const response = await axios.post(`${apiURL}chat`, {
        question: chatInput,
        storedEmbeddings: embedded,
        originalTexts:originalTexts
      });
  
      const botMessage = { sender: "LogBotAI", message: response.data.answer };
      setChatHistory([...chatHistory, userMessage, botMessage]);
    } catch (err) {
      console.error("Error sending chat message:", err);
    }finally{
      setLogbotThinking(false);
    }
  }
};

  return (
    <div className="App">
      <h1>LogBotAi</h1>

      <>
            {files.length === 0 ? (
                <>
                    {/* File Upload Section */}
                    <div className="file-upload"
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                    >
                        <h2>Upload Documents</h2>
                        <p>Drop PDF or Word documents here or click to select!</p>
                        <input 
                            type="file"
                            multiple
                            accept=".pdf, .docx"
                            onChange={handleFileSelection}
                            hidden
                            ref={inputRef}
                        />
                        <button onClick={() => inputRef.current.click()}>Select files</button>
                    </div>
                </>
            ) : (
                <>
                   {!uploaded ? <h2>Files to upload</h2> : <h2>Uploaded files</h2>}
                    {files.map((file, idx) => <div key={idx}>{file.name}</div>)}
                    <div className="container">
                      {!uploaded ? 
                      (
                        <>
                          <button disabled={loading} onClick={() => setFiles([])}>Cancel</button>
                          <button disabled={loading} onClick={handleUpload}> {loading ? <div className="lds-ellipsis"><div></div><div></div><div></div><div></div></div> : <>Upload</> }</button>
                        </>
                      ) :
                      (
                        <>
                          <button className="resetBtn" onClick={() => {
                            setFiles([]);
                            setEmbedded([]);
                            setOriginalTexts("");
                            setChatHistory([]);
                            setUploaded(false);
                            }}>Reset</button>
                        </>
                      ) 
                    }
                    </div>
                </>
            )}
        </>
            {uploaded &&
            (
              <>
              {/* Chatbot Section */}
              <div className="chatbot">
                <h2>Chat with LogBotAi</h2>
                <div className="chat-window">
                  {chatHistory.map((chat, index) => (
                    <div key={index} className={`chat-message ${chat.sender}`}>
                      <strong>{chat.sender}: </strong> {chat.message}
                    </div>
                  ))}
                </div>

                <form onSubmit={handleChatSubmit}>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask a question..."
                  />
                  <button disabled={logbotThinking} type="submit">{logbotThinking ? <div className="lds-ellipsis"><div></div><div></div><div></div><div></div></div> : <>Send</> }</button>
                </form>
              </div>
              </>
            )
            }
    </div>
  );
}

export default App;