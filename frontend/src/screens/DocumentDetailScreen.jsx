import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  FileText, 
  Download, 
  Lock, 
  Unlock, 
  ArrowLeft, 
  Clock, 
  Building2, 
  User, 
  Calendar, 
  Layers, 
  Copy, 
  Check, 
  Search,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

function DocumentDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [ocrSearch, setOcrSearch] = useState('');

  // Request access state
  const [requestReason, setRequestReason] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState('');

  useEffect(() => {
    fetchDocumentDetails();
  }, [id, user]);

  const fetchDocumentDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/documents/${id}`);
      setDocument(res.data.document);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load document details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!document) return;
    try {
      const docId = document.id || document._id;
      const res = await api.get(`/documents/${docId}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', document.filename || 'downloaded_document.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert(err.response?.data?.error || 'Download failed. Access denied.');
    }
  };

  const handleRequestAccess = async (e) => {
    e.preventDefault();
    if (!document) return;
    setRequestLoading(true);
    setRequestSuccess('');

    try {
      const docId = document.id || document._id;
      const res = await api.post('/access/request', {
        doc_id: docId,
        reason: requestReason || `Access requested by ${user?.username} from ${user?.division}`
      });
      setRequestSuccess(res.data.message || 'Access request sent successfully!');
      setTimeout(() => {
        fetchDocumentDetails();
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit access request.');
    } finally {
      setRequestLoading(false);
    }
  };

  const copyOcrText = () => {
    if (document?.ocr_text) {
      navigator.clipboard.writeText(document.ocr_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="detail-loading">
        <div className="spinner"></div>
        <p>Retrieving document metadata and OCR data...</p>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="detail-error-container">
        <AlertTriangle size={48} className="error-icon" />
        <h2>Document Not Found</h2>
        <p>{error || 'The requested document does not exist or has been removed.'}</p>
        <button onClick={() => navigate('/')} className="btn-secondary">
          <ArrowLeft size={16} /> Back to Document Hub
        </button>
      </div>
    );
  }

  const isSameDivision = user && user.division?.toLowerCase() === document.division?.toLowerCase();
  const hasAccess = document.has_access || isSameDivision || user?.role === 'admin';
  const isPending = document.access_status === 'pending';

  return (
    <div className="document-detail-container">
      {/* Back button */}
      <button onClick={() => navigate('/')} className="btn-back">
        <ArrowLeft size={18} />
        <span>Back to Document Hub</span>
      </button>

      {/* Main Header Card */}
      <div className="detail-header-card">
        <div className="detail-header-main">
          <div className="detail-icon-box">
            <FileText size={36} className="detail-doc-icon" />
          </div>
          <div className="detail-title-group">
            <div className="detail-badges">
              <span className="badge division-badge">{document.division}</span>
              {document.metadata?.['Report Type'] && (
                <span className="badge type-badge">{document.metadata['Report Type']}</span>
              )}
            </div>
            <h1>{document.title || document.filename}</h1>
            <p className="detail-filename">File: {document.filename}</p>
          </div>
        </div>

        {/* Action button in header */}
        <div className="detail-header-action">
          {hasAccess ? (
            <button onClick={handleDownload} className="btn-primary large">
              <Download size={20} />
              <span>Download File</span>
            </button>
          ) : isPending ? (
            <button className="btn-secondary disabled large" disabled>
              <Clock size={20} />
              <span>Request Pending Review</span>
            </button>
          ) : (
            <button onClick={() => window.scrollTo({ top: 400, behavior: 'smooth' })} className="btn-warning large">
              <Lock size={20} />
              <span>Request Access</span>
            </button>
          )}
        </div>
      </div>

      <div className="detail-content-grid">
        {/* Left Column: Dynamic Metadata & Access Status */}
        <div className="detail-left-col">
          {/* Access Control Status Box */}
          <div className="detail-card access-status-card">
            <h3>Role-Based Access Status</h3>
            <div className="access-status-indicator">
              {hasAccess ? (
                <div className="status-box granted">
                  <Unlock size={20} />
                  <div>
                    <strong>Access Authorized</strong>
                    <p>{isSameDivision ? `You belong to ${user.division}. Downloads permitted.` : 'Cross-division access approved by division approver.'}</p>
                  </div>
                </div>
              ) : isPending ? (
                <div className="status-box pending">
                  <Clock size={20} />
                  <div>
                    <strong>Access Request Pending</strong>
                    <p>Your request has been submitted to {document.division} administrators.</p>
                  </div>
                </div>
              ) : (
                <div className="status-box locked">
                  <Lock size={20} />
                  <div>
                    <strong>Division Isolated (Access Restricted)</strong>
                    <p>You belong to {user?.division || 'another division'}. You must request access to download this document.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Request Form if no access */}
            {!hasAccess && !isPending && (
              <form onSubmit={handleRequestAccess} className="request-access-form">
                <h4>Request Cross-Division Access</h4>
                {requestSuccess && <div className="alert-success">{requestSuccess}</div>}
                <div className="form-group">
                  <label>Justification / Reason</label>
                  <textarea
                    rows="3"
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                    placeholder="Describe why you need access to this division's document..."
                    required
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={requestLoading}>
                  {requestLoading ? 'Submitting Request...' : 'Submit Access Request'}
                </button>
              </form>
            )}
          </div>

          {/* Dynamic Metadata Attributes */}
          <div className="detail-card">
            <h3>Dynamic Custom Metadata</h3>
            <p className="card-sub">Configurable attributes associated with this document record:</p>

            <div className="metadata-table">
              <div className="metadata-row">
                <span className="meta-key">Division</span>
                <span className="meta-val highlighted">{document.division}</span>
              </div>
              <div className="metadata-row">
                <span className="meta-key">File Size</span>
                <span className="meta-val">{(document.file_size / 1024).toFixed(1)} KB</span>
              </div>
              <div className="metadata-row">
                <span className="meta-key">Content Type</span>
                <span className="meta-val">{document.content_type}</span>
              </div>
              <div className="metadata-row">
                <span className="meta-key">Uploaded By</span>
                <span className="meta-val">{document.uploaded_by || 'system'}</span>
              </div>
              <div className="metadata-row">
                <span className="meta-key">Upload Date</span>
                <span className="meta-val">{new Date(document.created_at).toLocaleString()}</span>
              </div>

              {/* Dynamic Key-Value Pairs */}
              {Object.entries(document.metadata || {})
                .filter(([k]) => k !== 'Division' && k !== 'title')
                .map(([k, v]) => (
                  <div key={k} className="metadata-row dynamic">
                    <span className="meta-key">{k}</span>
                    <span className="meta-val">{String(v)}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Right Column: OCR Text Extracted Content */}
        <div className="detail-right-col">
          <div className="detail-card ocr-card">
            <div className="ocr-card-header">
              <div className="ocr-header-left">
                <Layers size={20} className="ocr-icon" />
                <div>
                  <h3>OCR Extracted Contents</h3>
                  <span className="ocr-meta">Optical Character Recognition & Full-Text Stream</span>
                </div>
              </div>
              <button onClick={copyOcrText} className="btn-icon" title="Copy OCR Text">
                {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
              </button>
            </div>

            {/* In-OCR search filter */}
            <div className="ocr-search-bar">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Filter inside extracted OCR text..."
                value={ocrSearch}
                onChange={(e) => setOcrSearch(e.target.value)}
              />
            </div>

            <div className="ocr-text-scrollbox">
              {document.ocr_text ? (
                <pre className="ocr-text-content">
                  {document.ocr_text}
                </pre>
              ) : (
                <p className="ocr-empty-text">
                  No OCR text was extracted for this document.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocumentDetailScreen;
