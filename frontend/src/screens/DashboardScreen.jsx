import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  FileText, 
  Upload, 
  Filter, 
  Lock, 
  Unlock, 
  Download, 
  ExternalLink, 
  Sparkles, 
  Eye, 
  Plus, 
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  X
} from 'lucide-react';

function DashboardScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState([]);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [selectedDivision, setSelectedDivision] = useState(user?.division || '');
  const [selectedReportType, setSelectedReportType] = useState('');
  const [filterQuery, setFilterQuery] = useState('');

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [dynamicFormValues, setDynamicFormValues] = useState({});
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Request Access modal state
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [targetDoc, setTargetDoc] = useState(null);
  const [requestReason, setRequestReason] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestMsg, setRequestMsg] = useState('');

  useEffect(() => {
    fetchMetadataFields();
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [selectedDivision, selectedReportType, user]);

  const fetchMetadataFields = async () => {
    try {
      const res = await api.get('/metadata/fields');
      setFields(res.data.fields || []);
    } catch (e) {
      console.warn('Could not fetch metadata fields:', e);
    }
  };

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedDivision) params['Division'] = selectedDivision;
      if (selectedReportType) params['Report Type'] = selectedReportType;

      const res = await api.get('/documents', { params });
      setDocuments(res.data.documents || []);
    } catch (e) {
      console.error('Failed to fetch documents:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUpload = () => {
    setUploadError('');
    setUploadFile(null);
    setUploadTitle('');
    // Pre-populate division to user's division (RBAC restriction)
    const initialValues = {
      Division: user?.division || 'Division A',
      'Report Type': 'Financial'
    };
    setDynamicFormValues(initialValues);
    setIsUploadOpen(true);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select a document file.');
      return;
    }
    setUploadLoading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('title', uploadTitle || uploadFile.name);
      
      // Ensure Division is locked to user division if not admin
      const submissionMetadata = {
        ...dynamicFormValues,
        Division: user?.role === 'admin' ? (dynamicFormValues.Division || user.division) : user.division
      };
      
      formData.append('metadata', JSON.stringify(submissionMetadata));

      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setIsUploadOpen(false);
      fetchDocuments();
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Failed to upload document.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDownload = async (docId, filename) => {
    try {
      const response = await api.get(`/documents/${docId}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
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

  const handleOpenRequest = (doc) => {
    setTargetDoc(doc);
    setRequestReason(`Cross-division analysis required for ${user?.division || 'my division'}`);
    setRequestMsg('');
    setIsRequestModalOpen(true);
  };

  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!targetDoc) return;
    setRequestLoading(true);

    try {
      const res = await api.post('/access/request', {
        doc_id: targetDoc.id || targetDoc._id,
        reason: requestReason
      });
      setRequestMsg(res.data.message || 'Request submitted successfully!');
      setTimeout(() => {
        setIsRequestModalOpen(false);
        fetchDocuments();
      }, 1200);
    } catch (err) {
      setRequestMsg(err.response?.data?.error || 'Failed to send access request.');
    } finally {
      setRequestLoading(false);
    }
  };

  // Extract available report types from dynamic field definitions
  const reportTypeField = fields.find(f => f.name === 'Report Type');
  const reportTypeOptions = reportTypeField?.options || ['Financial', 'Technical', 'Audit', 'HR', 'Quarterly'];

  const filteredDocs = documents.filter(doc => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    const titleMatch = doc.title?.toLowerCase().includes(q) || doc.filename?.toLowerCase().includes(q);
    const divMatch = doc.division?.toLowerCase().includes(q);
    const metaMatch = Object.values(doc.metadata || {}).some(v => String(v).toLowerCase().includes(q));
    return titleMatch || divMatch || metaMatch;
  });

  return (
    <div className="dashboard-container">
      {/* Top Banner / Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Document Hub</h1>
          <p className="page-subtitle">
            Secure division-isolated repository powered by OCR and customizable metadata
          </p>
        </div>
        <button onClick={handleOpenUpload} className="btn-primary">
          <Upload size={18} />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Filter and Control Bar */}
      <div className="filter-card">
        <div className="filter-row">
          <div className="filter-item">
            <label>
              <Filter size={14} />
              <span>Division Isolation:</span>
            </label>
            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="select-input"
            >
              <option value="">All Divisions</option>
              <option value="Division A">Division A</option>
              <option value="Division B">Division B</option>
              <option value="Division C">Division C</option>
              <option value="Engineering">Engineering</option>
              <option value="Operations">Operations</option>
            </select>
          </div>

          <div className="filter-item">
            <label>Report Type:</label>
            <select
              value={selectedReportType}
              onChange={(e) => setSelectedReportType(e.target.value)}
              className="select-input"
            >
              <option value="">All Report Types</option>
              {reportTypeOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="filter-item search-box">
            <input
              type="text"
              placeholder="Quick filter by title or metadata..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {/* User Active Division Notice */}
        {user && (
          <div className="active-division-notice">
            <span>Logged in as <strong>{user.username}</strong> in <strong>{user.division}</strong>. Documents outside your division require access approval before download.</span>
          </div>
        )}
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading documents from GridFS...</p>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="empty-state">
          <FileText size={48} className="empty-icon" />
          <h3>No documents found</h3>
          <p>Try adjusting your division and metadata filters or upload a new document.</p>
          <button onClick={handleOpenUpload} className="btn-secondary">Upload a Document</button>
        </div>
      ) : (
        <div className="documents-grid">
          {filteredDocs.map((doc) => {
            const docId = doc.id || doc._id;
            const isSameDivision = user && user.division?.toLowerCase() === doc.division?.toLowerCase();
            const hasAccess = doc.has_access || isSameDivision || user?.role === 'admin';
            const isPending = doc.access_status === 'pending';

            return (
              <div key={docId} className="document-card">
                <div className="card-top">
                  <div className="doc-icon-wrapper">
                    <FileText size={24} className="doc-icon" />
                  </div>
                  <div className="badges-group">
                    <span className="badge division-badge">{doc.division}</span>
                    {doc.metadata?.['Report Type'] && (
                      <span className="badge type-badge">{doc.metadata['Report Type']}</span>
                    )}
                  </div>
                </div>

                <h3 className="doc-title" title={doc.title || doc.filename}>
                  {doc.title || doc.filename}
                </h3>
                <p className="doc-filename">{doc.filename}</p>

                {/* Metadata summary */}
                <div className="doc-meta-pills">
                  {Object.entries(doc.metadata || {})
                    .filter(([k]) => k !== 'Division' && k !== 'Report Type' && k !== 'title')
                    .slice(0, 3)
                    .map(([k, v]) => (
                      <span key={k} className="meta-pill">
                        <strong>{k}:</strong> {String(v)}
                      </span>
                    ))}
                </div>

                {/* OCR text snippet preview */}
                {doc.ocr_text && (
                  <div className="ocr-snippet-box">
                    <span className="ocr-label">OCR Text Preview:</span>
                    <p className="ocr-text-preview">{doc.ocr_text.slice(0, 90)}...</p>
                  </div>
                )}

                {/* Card Footer with Access Control Status and Actions */}
                <div className="card-footer">
                  <div className="access-indicator">
                    {hasAccess ? (
                      <span className="status-granted">
                        <Unlock size={14} />
                        <span>Access Granted</span>
                      </span>
                    ) : isPending ? (
                      <span className="status-pending">
                        <Clock size={14} />
                        <span>Approval Pending</span>
                      </span>
                    ) : (
                      <span className="status-locked">
                        <Lock size={14} />
                        <span>Division Locked</span>
                      </span>
                    )}
                  </div>

                  <div className="action-buttons-group">
                    <button
                      onClick={() => navigate(`/documents/${docId}`)}
                      className="btn-card-action"
                      title="View Details"
                    >
                      <Eye size={16} />
                      <span>Details</span>
                    </button>

                    {hasAccess ? (
                      <button
                        onClick={() => handleDownload(docId, doc.filename)}
                        className="btn-card-action primary"
                        title="Download Document"
                      >
                        <Download size={16} />
                        <span>Download</span>
                      </button>
                    ) : isPending ? (
                      <button className="btn-card-action disabled" disabled>
                        <Clock size={16} />
                        <span>Pending</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenRequest(doc)}
                        className="btn-card-action warning"
                        title="Request Cross-Division Access"
                      >
                        <Lock size={16} />
                        <span>Request</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===================================================================== */}
      {/* UPLOAD DOCUMENT MODAL                                                */}
      {/* ===================================================================== */}
      {isUploadOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Upload Document</h3>
              <button onClick={() => setIsUploadOpen(false)} className="btn-close">
                <X size={20} />
              </button>
            </div>

            {uploadError && <div className="alert-error">{uploadError}</div>}

            <form onSubmit={handleUploadSubmit} className="modal-form">
              <div className="form-group">
                <label>Select Document File (PDF, PNG, JPG)</label>
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  required
                  className="file-input"
                />
              </div>

              <div className="form-group">
                <label>Document Title</label>
                <input
                  type="text"
                  placeholder="e.g. Q4 Financial Audit Report"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Division Isolation (Locked by RBAC)</label>
                <input
                  type="text"
                  value={user?.role === 'admin' ? (dynamicFormValues.Division || user.division) : user?.division}
                  disabled={user?.role !== 'admin'}
                  className="input-disabled"
                />
                <small className="help-text">
                  RBAC rule: Users from {user?.division} can only upload documents to {user?.division}.
                </small>
              </div>

              {/* Dynamic Metadata Inputs from fields collection */}
              <div className="dynamic-fields-section">
                <h4>Dynamic Custom Metadata</h4>
                {fields
                  .filter(f => f.name !== 'Division')
                  .map(f => (
                    <div key={f.name} className="form-group">
                      <label>{f.label || f.name} {f.required && '*'}</label>
                      {f.type === 'select' ? (
                        <select
                          value={dynamicFormValues[f.name] || ''}
                          onChange={(e) => setDynamicFormValues({
                            ...dynamicFormValues,
                            [f.name]: e.target.value
                          })}
                          required={f.required}
                        >
                          <option value="">Select {f.label || f.name}</option>
                          {(f.options || []).map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                          placeholder={`Enter ${f.label || f.name}`}
                          value={dynamicFormValues[f.name] || ''}
                          onChange={(e) => setDynamicFormValues({
                            ...dynamicFormValues,
                            [f.name]: e.target.value
                          })}
                          required={f.required}
                        />
                      )}
                    </div>
                  ))}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={uploadLoading}
                >
                  {uploadLoading ? 'Uploading & Running OCR...' : 'Upload to GridFS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* REQUEST CROSS-DIVISION ACCESS MODAL                                   */}
      {/* ===================================================================== */}
      {isRequestModalOpen && targetDoc && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Request Cross-Division Access</h3>
              <button onClick={() => setIsRequestModalOpen(false)} className="btn-close">
                <X size={20} />
              </button>
            </div>

            {requestMsg && (
              <div className={requestMsg.includes('success') || requestMsg.includes('sent') ? 'alert-success' : 'alert-error'}>
                {requestMsg}
              </div>
            )}

            <form onSubmit={handleSendRequest} className="modal-form">
              <p className="request-modal-desc">
                This document belongs to <strong>{targetDoc.division}</strong>. As a member of <strong>{user?.division}</strong>, you must obtain approval before download.
              </p>

              <div className="form-group">
                <label>Target Document</label>
                <input
                  type="text"
                  value={targetDoc.title || targetDoc.filename}
                  disabled
                  className="input-disabled"
                />
              </div>

              <div className="form-group">
                <label>Reason for Access Request</label>
                <textarea
                  rows="3"
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="Provide justification for cross-division access..."
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={requestLoading}
                >
                  {requestLoading ? 'Sending Request...' : 'Send Access Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardScreen;
