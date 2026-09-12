import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faComments, 
  faFolderOpen, 
  faPodcast, 
  faChartLine, 
  faRightFromBracket, 
  faUserCircle
} from '@fortawesome/free-solid-svg-icons';

const Navbar = ({ 
  activeTab, 
  setActiveTab, 
  currentUser, 
  onSignOut, 
  savedFilesCount = 0, 
  selectedFilesCount = 0 
}) => {
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="navbar-container">
      <div className="navbar-content">
        {/* Brand identity */}
        <div className="navbar-brand" onClick={() => setActiveTab('chat')}>
          <div className="brand-logo-badge">
            <span className="brand-icon">⚡</span>
          </div>
          <div className="brand-text">
            <div className="brand-title-row">
              <span className="brand-name">LogBot</span>
              <span className="brand-badge-ai">AI</span>
            </div>
            <span className="brand-tagline">Intelligence & Docs</span>
          </div>
          <div className="system-status-pill">
            <span className="status-dot"></span>
            <span className="status-text">System Online</span>
          </div>
        </div>

        {/* Center Tab Navigation */}
        <nav className="nav-tabs" aria-label="Main application tabs">
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
            aria-pressed={activeTab === 'chat'}
          >
            <FontAwesomeIcon icon={faComments} className="tab-icon" />
            <span>AI Chat</span>
            {selectedFilesCount > 0 && (
              <span className="tab-badge lime">{selectedFilesCount}</span>
            )}
          </button>

          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'documents' ? 'active' : ''}`}
            onClick={() => setActiveTab('documents')}
            aria-pressed={activeTab === 'documents'}
          >
            <FontAwesomeIcon icon={faFolderOpen} className="tab-icon" />
            <span>Knowledge Base</span>
            {savedFilesCount > 0 && (
              <span className="tab-badge slate">{savedFilesCount}</span>
            )}
          </button>

          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'podcast' ? 'active' : ''}`}
            onClick={() => setActiveTab('podcast')}
            aria-pressed={activeTab === 'podcast'}
          >
            <FontAwesomeIcon icon={faPodcast} className="tab-icon" />
            <span>Podcast Studio</span>
          </button>

          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'operations' ? 'active' : ''}`}
            onClick={() => setActiveTab('operations')}
            aria-pressed={activeTab === 'operations'}
          >
            <FontAwesomeIcon icon={faChartLine} className="tab-icon" />
            <span>Operations</span>
          </button>
        </nav>

        {/* Right User & Profile Control */}
        <div className="navbar-user-area">
          <div className="user-profile-pill" title={currentUser?.email || 'User'}>
            <div className="user-avatar-circle">
              {currentUser?.displayName ? getInitials(currentUser.displayName) : <FontAwesomeIcon icon={faUserCircle} />}
            </div>
            <div className="user-info-text">
              <span className="user-name">{currentUser?.displayName || 'Active User'}</span>
              <span className="user-subtext">{currentUser?.email || 'Authenticated'}</span>
            </div>
          </div>
          
          <button 
            type="button" 
            className="navbar-signout-btn" 
            onClick={onSignOut}
            title="Sign out of LogBot AI"
          >
            <FontAwesomeIcon icon={faRightFromBracket} />
            <span className="signout-label">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
