import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPodcast,
  faDownload,
  faMicrophone,
  faHeadphones,
  faFileLines,
  faVolumeHigh,
  faWandMagicSparkles,
  faCheckCircle,
  faArrowRight
} from '@fortawesome/free-solid-svg-icons';

const VOICES = [
  { id: 'alloy', name: 'Alloy', tone: 'Balanced, clear & expressive', gender: 'Neutral' },
  { id: 'echo', name: 'Echo', tone: 'Resonant, crisp & authoritative', gender: 'Male' },
  { id: 'fable', name: 'Fable', tone: 'British accent, warm & narrative', gender: 'Expressive' },
  { id: 'onyx', name: 'Onyx', tone: 'Deep, steady & professional', gender: 'Male' },
  { id: 'nova', name: 'Nova', tone: 'Friendly, engaging & upbeat', gender: 'Female' },
  { id: 'shimmer', name: 'Shimmer', tone: 'Clear, gentle & articulate', gender: 'Female' }
];

const PodcastStudio = ({
  selectedFiles = [],
  selectedPodcastFile,
  setSelectedPodcastFile,
  presenterVoice,
  setPresenterVoice,
  guestVoice,
  setGuestVoice,
  generatePodcast,
  generatingPodcast,
  usersPodcast,
  setActiveTab
}) => {
  return (
    <div className="podcast-studio-container">
      {/* Studio Banner */}
      <div className="studio-header-card">
        <div className="studio-header-left">
          <div className="studio-icon-badge">
            <FontAwesomeIcon icon={faPodcast} />
          </div>
          <div>
            <h2 className="studio-title">AI Podcast Studio</h2>
            <p className="studio-subtitle">
              Transform your documents into a professional, two-host dialogue podcast using natural conversational AI.
            </p>
          </div>
        </div>

        <div className="studio-stats-pill">
          <span className="live-tag">● Studio Mode</span>
        </div>
      </div>

      <div className="studio-workspace-grid">
        {/* Left Column: Configuration Controls */}
        <div className="studio-config-column">
          {/* Step 1: Source Document Selection */}
          <div className="studio-section-card">
            <div className="card-step-header">
              <span className="step-number">1</span>
              <div>
                <h3 className="card-step-title">Select Source Document</h3>
                <p className="card-step-subtitle">Choose the text or document your hosts will discuss.</p>
              </div>
            </div>

            {selectedFiles.length === 0 ? (
              <div className="no-selection-banner">
                <p>No documents are currently selected.</p>
                <button 
                  type="button" 
                  className="link-tab-btn" 
                  onClick={() => setActiveTab('documents')}
                >
                  Select from Knowledge Base <FontAwesomeIcon icon={faArrowRight} />
                </button>
              </div>
            ) : (
              <div className="source-doc-chips">
                {selectedFiles.map((file, idx) => {
                  const isChosen = selectedPodcastFile?.name === file.name;
                  return (
                    <div
                      key={idx}
                      className={`source-chip ${isChosen ? 'selected' : ''}`}
                      onClick={() => setSelectedPodcastFile(file)}
                    >
                      <FontAwesomeIcon icon={faFileLines} className="chip-icon" />
                      <div className="chip-info">
                        <span className="chip-name">{file.name}</span>
                        <span className="chip-status">
                          {isChosen ? 'Ready for episode' : 'Click to select'}
                        </span>
                      </div>
                      {isChosen && <FontAwesomeIcon icon={faCheckCircle} className="chip-check" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 2: Voice Persona Customization */}
          <div className="studio-section-card">
            <div className="card-step-header">
              <span className="step-number">2</span>
              <div>
                <h3 className="card-step-title">Host Persona & Voice Casting</h3>
                <p className="card-step-subtitle">Pair complementary voices for engaging dialogue.</p>
              </div>
            </div>

            <div className="voice-pairing-grid">
              {/* Presenter Voice */}
              <div className="voice-role-box">
                <div className="role-title-row">
                  <FontAwesomeIcon icon={faMicrophone} className="role-icon presenter" />
                  <div>
                    <h4 className="role-title">Lead Host (Presenter)</h4>
                    <span className="role-desc">Guides the conversation & introduces topics</span>
                  </div>
                </div>

                <div className="voice-select-wrapper">
                  <select 
                    className="custom-voice-select" 
                    value={presenterVoice} 
                    onChange={(e) => setPresenterVoice(e.target.value)}
                  >
                    {VOICES.map((voice) => (
                      <option 
                        key={voice.id} 
                        value={voice.id} 
                        disabled={guestVoice === voice.id}
                      >
                        {voice.name} ({voice.tone})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Guest Voice */}
              <div className="voice-role-box">
                <div className="role-title-row">
                  <FontAwesomeIcon icon={faHeadphones} className="role-icon guest" />
                  <div>
                    <h4 className="role-title">Co-Host / Guest Expert</h4>
                    <span className="role-desc">Provides analytical insights & answers questions</span>
                  </div>
                </div>

                <div className="voice-select-wrapper">
                  <select 
                    className="custom-voice-select" 
                    value={guestVoice} 
                    onChange={(e) => setGuestVoice(e.target.value)}
                  >
                    {VOICES.map((voice) => (
                      <option 
                        key={voice.id} 
                        value={voice.id} 
                        disabled={presenterVoice === voice.id}
                      >
                        {voice.name} ({voice.tone})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Generation CTA button */}
            <div className="generate-cta-row">
              <button
                type="button"
                className="studio-generate-btn"
                disabled={!selectedPodcastFile || generatingPodcast}
                onClick={generatePodcast}
              >
                {generatingPodcast ? (
                  <>
                    <div className="lds-ellipsis"><div></div><div></div><div></div><div></div></div>
                    <span>Synthesizing Studio Dialogue...</span>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faWandMagicSparkles} />
                    <span>Generate Podcast Episode</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Audio Output & Player */}
        <div className="studio-player-column">
          <div className="player-deck-card">
            <div className="deck-top-bar">
              <div className="deck-title-area">
                <span className="deck-tag">Broadcast Output</span>
                <h3 className="deck-title">
                  {usersPodcast ? usersPodcast.title || 'Generated Episode' : 'Awaiting Episode Generation'}
                </h3>
              </div>
              <div className="deck-icon-badge">
                <FontAwesomeIcon icon={faVolumeHigh} />
              </div>
            </div>

            {usersPodcast ? (
              <div className="active-player-content">
                {/* Visual Audio Waveform Simulation */}
                <div className="audio-visualizer-bars">
                  {[45, 60, 25, 80, 55, 95, 70, 40, 85, 60, 30, 75, 90, 50, 65, 80, 45, 70, 85, 40, 60, 90, 75, 50].map((h, i) => (
                    <div 
                      key={i} 
                      className="waveform-bar" 
                      style={{ height: `${h}%`, animationDelay: `${i * 0.05}s` }} 
                    />
                  ))}
                </div>

                <div className="audio-controls-wrap">
                  <audio controls className="studio-native-audio">
                    <source src={usersPodcast.podcastBase64} type="audio/mpeg" />
                    Your browser does not support audio playback.
                  </audio>
                </div>

                <div className="player-actions-row">
                  <a
                    href={usersPodcast.podcastBase64}
                    download={usersPodcast.title ? `${usersPodcast.title}.mp3` : 'logbot-podcast.mp3'}
                    className="download-episode-btn"
                  >
                    <FontAwesomeIcon icon={faDownload} />
                    <span>Download MP3 Audio</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="player-empty-state">
                <div className="player-empty-icon">
                  <FontAwesomeIcon icon={faPodcast} />
                </div>
                <h4>Ready to Produce</h4>
                <p>
                  Choose a document from the left panel and click <strong>Generate Podcast Episode</strong>. The AI will synthesize an engaging two-host dialogue in seconds.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PodcastStudio;
