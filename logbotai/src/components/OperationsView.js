import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDatabase,
  faComments,
  faPodcast,
  faArrowsRotate,
  faClock,
  faBolt,
  faCheckCircle,
  faCircleQuestion,
  faWandMagicSparkles,
  faArrowRight
} from '@fortawesome/free-solid-svg-icons';
import apiClient from './api';

const OperationsView = ({ usersData = [], selectedFiles = [], setActiveTab, onSelectPrompt }) => {
  const [questionsHistory, setQuestionsHistory] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const fetchQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const response = await apiClient.get('/questionsAsked');
      if (Array.isArray(response.data)) {
        setQuestionsHistory(response.data);
      } else if (response.data && typeof response.data === 'object') {
        const values = Object.values(response.data);
        setQuestionsHistory(values);
      }
    } catch (err) {
      console.log('Operations question history info:', err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const totalDocuments = usersData.length;
  const activeSelected = selectedFiles.length;

  return (
    <div className="operations-container">
      {/* Header */}
      <div className="operations-header">
        <div>
          <h2 className="operations-title">Operations & Knowledge Telemetry</h2>
          <p className="operations-subtitle">
            Real-time activity overview, document vectorization index, and retrieval query history.
          </p>
        </div>

        <div className="telemetry-pill">
          <span className="telemetry-dot"></span>
          <span>Pipeline Active</span>
        </div>
      </div>

      {/* Metric Cards (Operations Triptych) */}
      <div className="metrics-grid">
        {/* Card 1: Saved Documents */}
        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-label">Knowledge Base</span>
            <span className="metric-icon-bubble purple">
              <FontAwesomeIcon icon={faDatabase} />
            </span>
          </div>
          <div className="metric-value-row">
            <span className="metric-number">{totalDocuments}</span>
            <span className="metric-unit">Documents</span>
          </div>
          <div className="metric-card-footer">
            <span className="metric-sub-tag lime">
              <FontAwesomeIcon icon={faCheckCircle} /> {activeSelected} in Active Context
            </span>
          </div>
        </div>

        {/* Card 2: AI Retreival Pipeline */}
        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-label">Retrieval Engine</span>
            <span className="metric-icon-bubble lime">
              <FontAwesomeIcon icon={faBolt} />
            </span>
          </div>
          <div className="metric-value-row">
            <span className="metric-number">Vector</span>
            <span className="metric-unit">RAG</span>
          </div>
          <div className="metric-card-footer">
            <span className="metric-sub-tag purple">HuggingFace Embeddings</span>
          </div>
        </div>

        {/* Card 3: Model Pipeline */}
        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-label">LLM Orchestration</span>
            <span className="metric-icon-bubble indigo">
              <FontAwesomeIcon icon={faComments} />
            </span>
          </div>
          <div className="metric-value-row">
            <span className="metric-number">GPT-4o</span>
            <span className="metric-unit">Mini</span>
          </div>
          <div className="metric-card-footer">
            <span className="metric-sub-tag slate">OpenAI & Groq Engine</span>
          </div>
        </div>

        {/* Card 4: Audio Generation */}
        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-label">Podcast Synthesis</span>
            <span className="metric-icon-bubble amber">
              <FontAwesomeIcon icon={faPodcast} />
            </span>
          </div>
          <div className="metric-value-row">
            <span className="metric-number">6</span>
            <span className="metric-unit">Voices</span>
          </div>
          <div className="metric-card-footer">
            <span className="metric-sub-tag lime">Dual-Host TTS</span>
          </div>
        </div>
      </div>

      {/* Main Operations Split: Activity Timeline & Recent Queries */}
      <div className="operations-split-grid">
        {/* Left: Interactive Activity Timeline */}
        <div className="operations-card timeline-card">
          <div className="operations-card-header">
            <div className="card-heading-group">
              <h3 className="card-heading">Query & Retrieval Timeline</h3>
              <p className="card-subheading">System volume and contextual vector lookups.</p>
            </div>
            <span className="time-badge">24h Telemetry</span>
          </div>

          <div className="timeline-chart-area">
            <div className="timeline-axis-labels">
              <span>06 AM</span>
              <span>12 PM</span>
              <span>06 PM</span>
              <span>12 AM</span>
            </div>

            <div className="timeline-bars-row">
              {[22, 38, 52, 60, 48, 42, 35, 55, 68, 72, 64, 85, 96, 88, 75, 60, 68, 80, 88, 92, 70, 60, 45, 30].map((h, i) => (
                <div key={i} className="timeline-bar-col">
                  <div 
                    className={`bar-fill ${i === 12 ? 'peak' : i > 10 && i < 18 ? 'active' : ''}`}
                    style={{ height: `${h}%` }}
                    title={`Activity index: ${h}%`}
                  />
                </div>
              ))}
            </div>

            <div className="timeline-legend">
              <span className="legend-item"><span className="legend-dot start"></span> Base Activity</span>
              <span className="legend-item"><span className="legend-dot active"></span> Context Query</span>
              <span className="legend-item"><span className="legend-dot peak"></span> Peak Load</span>
            </div>
          </div>

          {/* Quick Automation Actions (from task-engine.md) */}
          <div className="quick-automations-strip">
            <h4 className="automations-title">Suggested Quick Actions</h4>
            <div className="automation-chips-row">
              <button 
                type="button" 
                className="action-chip"
                onClick={() => {
                  onSelectPrompt('Summarize key points and conclusions across all active documents.');
                  setActiveTab('chat');
                }}
              >
                <FontAwesomeIcon icon={faWandMagicSparkles} /> Summarize Active Documents
              </button>

              <button 
                type="button" 
                className="action-chip"
                onClick={() => {
                  onSelectPrompt('Highlight any discrepancies or conflicting points between the files.');
                  setActiveTab('chat');
                }}
              >
                <FontAwesomeIcon icon={faWandMagicSparkles} /> Compare & Detect Conflicts
              </button>

              <button 
                type="button" 
                className="action-chip"
                onClick={() => setActiveTab('podcast')}
              >
                <FontAwesomeIcon icon={faPodcast} /> Create Podcast Episode
              </button>
            </div>
          </div>
        </div>

        {/* Right: Question History Card */}
        <div className="operations-card history-card">
          <div className="operations-card-header">
            <div className="card-heading-group">
              <h3 className="card-heading">Recent Inquiries</h3>
              <p className="card-subheading">Historical queries recorded in the telemetry log.</p>
            </div>
            <button 
              type="button" 
              className="refresh-history-btn" 
              onClick={fetchQuestions}
              disabled={loadingQuestions}
              title="Refresh queries"
            >
              <FontAwesomeIcon icon={faArrowsRotate} className={loadingQuestions ? 'fa-spin' : ''} />
            </button>
          </div>

          <div className="questions-history-list">
            {questionsHistory.length === 0 ? (
              <div className="empty-history-state">
                <FontAwesomeIcon icon={faCircleQuestion} />
                <p>No queries logged yet. Ask questions in the AI Chat tab to populate telemetry.</p>
              </div>
            ) : (
              questionsHistory.slice(0, 8).map((q, idx) => {
                const questionText = typeof q === 'string' ? q : q.question || q.text || JSON.stringify(q);
                return (
                  <div 
                    key={idx} 
                    className="question-history-item"
                    onClick={() => {
                      onSelectPrompt(questionText);
                      setActiveTab('chat');
                    }}
                  >
                    <div className="q-icon-wrap">
                      <FontAwesomeIcon icon={faClock} />
                    </div>
                    <div className="q-content">
                      <span className="q-text">{questionText}</span>
                      <span className="q-action-hint">Run again <FontAwesomeIcon icon={faArrowRight} /></span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationsView;
