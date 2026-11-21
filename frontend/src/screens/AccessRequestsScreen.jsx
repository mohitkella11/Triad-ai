import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  Inbox, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  Building2, 
  User, 
  Download, 
  RefreshCw, 
  Send,
  AlertCircle
} from 'lucide-react';

function AccessRequestsScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('incoming'); // incoming | outgoing
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  useEffect(() => {
    fetchRequests();
  }, [activeTab, user]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/access/requests?type=${activeTab}`);
      setRequests(res.data.requests || []);
    } catch (e) {
      console.error('Failed to fetch requests:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    setActionLoadingId(requestId);
    setFeedbackMsg('');
    try {
      await api.post('/access/approve', { request_id: requestId });
      setFeedbackMsg('Access request approved! Requester now has permission to download.');
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to approve request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (requestId) => {
    setActionLoadingId(requestId);
    setFeedbackMsg('');
    try {
      await api.post('/access/reject', { request_id: requestId });
      setFeedbackMsg('Access request rejected.');
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reject request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDownloadApproved = async (docId, title) => {
    try {
      const res = await api.get(`/documents/${docId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${title || 'document'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert(err.response?.data?.error || 'Download failed.');
    }
  };

  const pendingIncoming = requests.filter(r => r.status === 'pending');

  return (
    <div className="requests-page-container">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Access Requests Inbox</h1>
          <p className="page-subtitle">
            Cross-division governance: review incoming requests or track outgoing access approvals
          </p>
        </div>
        <button onClick={fetchRequests} className="btn-secondary" title="Refresh">
          <RefreshCw size={16} />
          <span>Refresh</span>
        </button>
      </div>

      {feedbackMsg && <div className="alert-success">{feedbackMsg}</div>}

      {/* Tabs */}
      <div className="tab-navigation">
        <button
          onClick={() => setActiveTab('incoming')}
          className={`tab-btn ${activeTab === 'incoming' ? 'active' : ''}`}
        >
          <Inbox size={18} />
          <span>Incoming Requests ({user?.division || 'My Division'})</span>
          {pendingIncoming.length > 0 && activeTab === 'incoming' && (
            <span className="tab-counter">{pendingIncoming.length}</span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('outgoing')}
          className={`tab-btn ${activeTab === 'outgoing' ? 'active' : ''}`}
        >
          <Send size={18} />
          <span>My Outgoing Requests</span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading access requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <Inbox size={48} className="empty-icon" />
          <h3>No {activeTab} requests found</h3>
          <p>
            {activeTab === 'incoming'
              ? `There are no access requests currently pending for ${user?.division || 'your division'}.`
              : 'You have not submitted any cross-division document access requests.'}
          </p>
        </div>
      ) : (
        <div className="requests-list">
          {requests.map((req) => {
            const reqId = req.id || req._id;
            const isPending = req.status === 'pending';
            const isApproved = req.status === 'approved';
            const isRejected = req.status === 'rejected';

            return (
              <div key={reqId} className="request-card">
                <div className="request-card-left">
                  <div className="request-icon-box">
                    <FileText size={22} className="req-doc-icon" />
                  </div>
                  <div className="request-info">
                    <h3 className="request-doc-title">{req.doc_title || 'Document'}</h3>
                    <div className="request-meta-row">
                      <span className="req-meta-item">
                        <User size={14} /> Requester: <strong>{req.requester_name}</strong>
                      </span>
                      <span className="req-meta-item">
                        <Building2 size={14} /> From: <span className="badge division-badge">{req.requester_division}</span>
                      </span>
                      <span className="req-meta-item">
                        Target Division: <span className="badge division-badge">{req.target_division}</span>
                      </span>
                      <span className="req-meta-item">
                        Date: {new Date(req.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="request-reason-box">
                      <strong>Reason:</strong> {req.reason || 'No justification provided'}
                    </div>

                    {req.reviewed_by && (
                      <p className="reviewed-by-text">
                        Reviewed by <strong>{req.reviewed_by}</strong> on {new Date(req.reviewed_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Action / Status Column */}
                <div className="request-card-right">
                  {/* Status Badge */}
                  <div className="status-badge-container">
                    {isApproved && (
                      <span className="badge status-approved">
                        <CheckCircle size={14} /> Approved
                      </span>
                    )}
                    {isPending && (
                      <span className="badge status-pending">
                        <Clock size={14} /> Pending Review
                      </span>
                    )}
                    {isRejected && (
                      <span className="badge status-rejected">
                        <XCircle size={14} /> Rejected
                      </span>
                    )}
                  </div>

                  {/* Approver Action buttons (Incoming tab) */}
                  {activeTab === 'incoming' && isPending && (
                    <div className="action-buttons-inline">
                      <button
                        onClick={() => handleApprove(reqId)}
                        disabled={actionLoadingId === reqId}
                        className="btn-approve"
                      >
                        <CheckCircle size={16} />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleReject(reqId)}
                        disabled={actionLoadingId === reqId}
                        className="btn-reject"
                      >
                        <XCircle size={16} />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}

                  {/* Outgoing Download button if approved */}
                  {activeTab === 'outgoing' && isApproved && (
                    <button
                      onClick={() => handleDownloadApproved(req.doc_id, req.doc_title)}
                      className="btn-primary"
                    >
                      <Download size={16} />
                      <span>Download File</span>
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

export default AccessRequestsScreen;
