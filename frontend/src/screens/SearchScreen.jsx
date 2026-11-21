import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  Search, 
  FileText, 
  Layers, 
  Sparkles, 
  Download, 
  Eye, 
  Lock, 
  Unlock, 
  ArrowRight,
  Clock,
  Filter
} from 'lucide-react';

function SearchScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filterDivision, setFilterDivision] = useState('');

  const handleSearch = async (searchQuery) => {
    const q = searchQuery !== undefined ? searchQuery : query;
    if (!q.trim()) return;

    setLoading(true);
    setHasSearched(true);

    try {
      const res = await api.get(`/search?q=${encodeURIComponent(q.trim())}`);
      setResults(res.data.results || []);
    } catch (e) {
      console.error('Search failed:', e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickChip = (term) => {
    setQuery(term);
    handleSearch(term);
  };

  const handleDownload = async (docId, filename) => {
    try {
      const res = await api.get(`/documents/${docId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename || 'document.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert(err.response?.data?.error || 'Download failed. Access denied.');
    }
  };

  const filteredResults = filterDivision 
    ? results.filter(r => r.division?.toLowerCase() === filterDivision.toLowerCase())
    : results;

  return (
    <div className="search-page-container">
      {/* Header Banner */}
      <div className="search-hero">
        <div className="search-hero-badge">
          <Sparkles size={16} />
          <span>OCR & Dynamic Metadata Engine</span>
        </div>
        <h1>Advanced Document Search</h1>
        <p>
          Full-text neural search across document titles, custom dynamic metadata fields, and deep OCR text streams.
        </p>

        {/* Search Input Box */}
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="search-bar-form">
          <div className="search-input-wrapper">
            <Search size={22} className="search-icon-input" />
            <input
              type="text"
              placeholder="Search keyword (e.g. 'Financial', 'Earnings', 'Audit', 'Contract')..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="main-search-input"
              autoFocus
            />
            <button type="submit" className="btn-search-trigger" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {/* Quick Suggestion Chips */}
        <div className="search-chips-row">
          <span className="chips-label">Popular Queries:</span>
          {['Financial', 'Audit', 'Technical', 'Quarterly', 'Confidential', 'Apollo'].map((chip) => (
            <button
              key={chip}
              onClick={() => handleQuickChip(chip)}
              className="search-chip"
              type="button"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Filter by Division in results */}
      {hasSearched && results.length > 0 && (
        <div className="search-filters-bar">
          <div className="search-result-count">
            Found <strong>{filteredResults.length}</strong> matching document{filteredResults.length !== 1 ? 's' : ''} for "{query}"
          </div>
          <div className="filter-division-select">
            <Filter size={14} />
            <select
              value={filterDivision}
              onChange={(e) => setFilterDivision(e.target.value)}
            >
              <option value="">Filter by Division (All)</option>
              <option value="Division A">Division A</option>
              <option value="Division B">Division B</option>
              <option value="Division C">Division C</option>
              <option value="Engineering">Engineering</option>
              <option value="Operations">Operations</option>
            </select>
          </div>
        </div>
      )}

      {/* Results Section */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Scanning dynamic metadata and OCR text indices...</p>
        </div>
      ) : hasSearched && filteredResults.length === 0 ? (
        <div className="empty-state">
          <Search size={48} className="empty-icon" />
          <h3>No matching documents found</h3>
          <p>
            No documents matched "{query}" across title, metadata fields, or OCR extracted content.
          </p>
        </div>
      ) : (
        <div className="search-results-list">
          {filteredResults.map((doc) => {
            const docId = doc.id || doc._id;
            const isSameDivision = user && user.division?.toLowerCase() === doc.division?.toLowerCase();
            const hasAccess = doc.has_access || isSameDivision || user?.role === 'admin';

            return (
              <div key={docId} className="search-result-card">
                <div className="card-main-content">
                  <div className="result-header">
                    <div className="result-title-row">
                      <FileText size={20} className="result-doc-icon" />
                      <h3 className="result-title" onClick={() => navigate(`/documents/${docId}`)}>
                        {doc.title || doc.filename}
                      </h3>
                    </div>
                    <div className="result-badges">
                      <span className="badge division-badge">{doc.division}</span>
                      {doc.metadata?.['Report Type'] && (
                        <span className="badge type-badge">{doc.metadata['Report Type']}</span>
                      )}
                    </div>
                  </div>

                  {/* Match Location Indicators */}
                  <div className="match-locations">
                    <span className="match-label">Matched In:</span>
                    {(doc.matched_in || []).map((loc) => (
                      <span key={loc} className="match-tag">
                        {loc.startsWith('metadata.') ? `Metadata: ${loc.replace('metadata.', '')}` : loc === 'ocr_text' ? 'OCR Extracted Text' : loc}
                      </span>
                    ))}
                  </div>

                  {/* Highlighted OCR Snippet */}
                  {doc.ocr_snippet && (
                    <div className="ocr-match-box">
                      <span className="ocr-match-title">OCR Text Match Snippet:</span>
                      <p className="ocr-snippet-highlight">{doc.ocr_snippet}</p>
                    </div>
                  )}

                  {/* Matched metadata fields */}
                  {doc.metadata_matches && Object.keys(doc.metadata_matches).length > 0 && (
                    <div className="meta-matches-box">
                      {Object.entries(doc.metadata_matches).map(([k, v]) => (
                        <span key={k} className="meta-match-pill">
                          <strong>{k}:</strong> {String(v)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right side actions */}
                <div className="result-actions-col">
                  <div className="access-status-indicator">
                    {hasAccess ? (
                      <span className="status-granted">
                        <Unlock size={14} /> Access Allowed
                      </span>
                    ) : (
                      <span className="status-locked">
                        <Lock size={14} /> Division Locked
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => navigate(`/documents/${docId}`)}
                    className="btn-secondary"
                  >
                    <Eye size={16} /> Details
                  </button>

                  {hasAccess ? (
                    <button
                      onClick={() => handleDownload(docId, doc.filename)}
                      className="btn-primary"
                    >
                      <Download size={16} /> Download
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate(`/documents/${docId}`)}
                      className="btn-warning"
                    >
                      <Lock size={16} /> Request
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SearchScreen;
