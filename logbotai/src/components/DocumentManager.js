import React, { useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCloudArrowUp,
  faFilePdf,
  faFileWord,
  faTrashCan,
  faCheck,
  faFloppyDisk,
  faArrowsRotate,
  faComments,
  faCircleCheck,
  faDatabase,
  faLayerGroup,
  faShieldHalved
} from '@fortawesome/free-solid-svg-icons';

const DocumentManager = ({
  usersData,
  files,
  uploaded,
  loading,
  saving,
  readingFiles,
  selectedFiles,
  handleCheck,
  handleDragOver,
  handleDrop,
  handleFileSelection,
  handleUpload,
  handleClearUploadedFiles,
  saveFilesToFirestore,
  handleDeleteSavedDocument,
  setActiveTab,
  onResetFiles
}) => {
  const fileInputRef = useRef(null);

  const isSelected = (file) => selectedFiles?.some((f) => f.name === file.name);

  const getFileIcon = (fileName) => {
    if (fileName.toLowerCase().endsWith('.pdf')) {
      return <FontAwesomeIcon icon={faFilePdf} className="doc-icon-pdf" />;
    }
    return <FontAwesomeIcon icon={faFileWord} className="doc-icon-word" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="doc-manager-container">
      {/* Top Header & Overview */}
      <div className="doc-manager-header">
        <div>
          <h2 className="section-title">Knowledge Base & Ingestion</h2>
          <p className="section-subtitle">
            Upload Word (.docx) and PDF documents to generate high-dimensional vector embeddings for AI retrieval.
          </p>
        </div>

        {selectedFiles.length > 0 && (
          <button 
            type="button"
            className="action-btn-primary" 
            onClick={() => setActiveTab('chat')}
          >
            <FontAwesomeIcon icon={faComments} />
            <span>Chat with {selectedFiles.length} Selected</span>
          </button>
        )}
      </div>

      <div className="doc-manager-grid">
        {/* Left Side: Upload & Staging Zone */}
        <div className="doc-upload-column">
          <div 
            className="upload-dropzone-card"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file"
              multiple
              accept=".pdf, .docx"
              onChange={handleFileSelection}
              hidden
              ref={fileInputRef}
            />
            
            <div className="dropzone-icon-circle">
              <FontAwesomeIcon icon={faCloudArrowUp} />
            </div>

            <h3 className="dropzone-heading">Drop documents here or browse</h3>
            <p className="dropzone-desc">
              Supports PDF and Word (.docx) up to 20MB. Up to 10 files per ingestion batch.
            </p>

            <div className="dropzone-badges">
              <span className="format-tag pdf">PDF Documents</span>
              <span className="format-tag docx">Word Documents</span>
              <span className="format-tag secure">
                <FontAwesomeIcon icon={faShieldHalved} /> Local Embeddings
              </span>
            </div>

            <button 
              type="button" 
              className="dropzone-browse-btn"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Select Files
            </button>
          </div>

          {/* Staging / Processing Area */}
          {files.length > 0 && (
            <div className="staging-card">
              <div className="staging-card-header">
                <div>
                  <h4 className="staging-card-title">
                    {uploaded ? 'Processed Files' : 'Staged Files for Embedding'}
                  </h4>
                  <span className="staging-card-count">{files.length} document(s)</span>
                </div>

                {uploaded && (
                  <span className="status-pill active">
                    <FontAwesomeIcon icon={faCircleCheck} /> Embedded
                  </span>
                )}
              </div>

              <div className="staged-files-list">
                {files.map((file, idx) => (
                  <div key={idx} className="staged-file-item">
                    <div className="staged-file-left">
                      {getFileIcon(file.name)}
                      <span className="staged-file-name" title={file.name}>{file.name}</span>
                    </div>
                    {file.size && (
                      <span className="staged-file-size">{formatFileSize(file.size)}</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="staging-actions-bar">
                {!uploaded ? (
                  <>
                    <button 
                      type="button"
                      className="staging-btn cancel"
                      disabled={loading || readingFiles}
                      onClick={onResetFiles}
                    >
                      Cancel
                    </button>
                    <button 
                      type="button"
                      className="staging-btn primary"
                      disabled={loading || readingFiles}
                      onClick={handleUpload}
                    >
                      {loading ? (
                        <div className="lds-ellipsis"><div></div><div></div><div></div><div></div></div>
                      ) : readingFiles ? (
                        'Reading Content...'
                      ) : (
                        'Generate Embeddings'
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      type="button"
                      className="staging-btn primary"
                      disabled={saving}
                      onClick={saveFilesToFirestore}
                    >
                      <FontAwesomeIcon icon={faFloppyDisk} />
                      <span>{saving ? 'Saving to Database...' : 'Save to Knowledge Base'}</span>
                    </button>
                    <button 
                      type="button"
                      className="staging-btn secondary"
                      onClick={handleClearUploadedFiles}
                      title="Clear staged files"
                    >
                      <FontAwesomeIcon icon={faArrowsRotate} /> Reset
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Saved Knowledge Library */}
        <div className="doc-library-column">
          <div className="library-card">
            <div className="library-header">
              <div className="library-title-area">
                <div className="library-icon-box">
                  <FontAwesomeIcon icon={faDatabase} />
                </div>
                <div>
                  <h3 className="library-title">Saved Knowledge Library</h3>
                  <p className="library-subtitle">
                    Select documents to ground AI questions or generate podcasts.
                  </p>
                </div>
              </div>

              <div className="library-stats-pill">
                <span>{usersData?.length || 0} Documents</span>
              </div>
            </div>

            {/* Document list */}
            {(!usersData || usersData.length === 0) ? (
              <div className="empty-library-state">
                <div className="empty-library-icon">
                  <FontAwesomeIcon icon={faLayerGroup} />
                </div>
                <h4>No saved documents yet</h4>
                <p>
                  Upload your PDF or Word documents using the uploader on the left, generate embeddings, and save them here.
                </p>
              </div>
            ) : (
              <div className="library-items-grid">
                {usersData.map((doc, idx) => {
                  const active = isSelected(doc);
                  return (
                    <div 
                      key={idx} 
                      className={`library-item-card ${active ? 'selected' : ''}`}
                      onClick={() => handleCheck(doc)}
                    >
                      <div className="library-item-top">
                        <div className="item-icon-wrapper">
                          {getFileIcon(doc.name)}
                        </div>
                        <div className="item-meta-info">
                          <h4 className="item-name" title={doc.name}>{doc.name}</h4>
                          <div className="item-tags-row">
                            {doc.uploadDate && (
                              <span className="item-tag date">
                                {doc.uploadDate.toLocaleDateString()}
                              </span>
                            )}
                            <span className="item-tag vectors">
                              <FontAwesomeIcon icon={faCircleCheck} /> Embeddings Ready
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="library-item-bottom" onClick={(e) => e.stopPropagation()}>
                        <label className={`selection-pill-label ${active ? 'active' : ''}`}>
                          <input 
                            type="checkbox"
                            checked={active}
                            onChange={() => handleCheck(doc)}
                          />
                          <span className="custom-check-box">
                            {active && <FontAwesomeIcon icon={faCheck} />}
                          </span>
                          <span>{active ? 'Active in Chat' : 'Select for Chat'}</span>
                        </label>

                        <button 
                          type="button"
                          className="item-delete-btn"
                          title="Delete from knowledge base"
                          onClick={() => handleDeleteSavedDocument(doc)}
                        >
                          <FontAwesomeIcon icon={faTrashCan} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentManager;
