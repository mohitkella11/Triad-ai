import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Sliders, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Settings, 
  Tag, 
  ListPlus, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';

function AdminSettingsScreen() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Add field form state
  const [isAdding, setIsAdding] = useState(false);
  const [fieldName, setFieldName] = useState('');
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState('select');
  const [fieldOptions, setFieldOptions] = useState('');
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldDesc, setFieldDesc] = useState('');

  // Editing existing field (e.g. adding options to Report Type)
  const [editingFieldId, setEditingFieldId] = useState(null);
  const [editOptions, setEditOptions] = useState('');
  const [editLabel, setEditLabel] = useState('');

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    setLoading(true);
    try {
      const res = await api.get('/metadata/fields');
      setFields(res.data.fields || []);
    } catch (e) {
      console.error('Failed to fetch metadata fields:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = async (e) => {
    e.preventDefault();
    if (!fieldName.trim()) return;

    try {
      const optionsArray = fieldType === 'select' 
        ? fieldOptions.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      await api.post('/metadata/fields', {
        name: fieldName.trim(),
        label: fieldLabel.trim() || fieldName.trim(),
        type: fieldType,
        options: optionsArray,
        required: fieldRequired,
        description: fieldDesc.trim()
      });

      setFeedback({ type: 'success', message: `Metadata field '${fieldName}' added successfully!` });
      setIsAdding(false);
      resetAddForm();
      fetchFields();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to add field.' });
    }
  };

  const resetAddForm = () => {
    setFieldName('');
    setFieldLabel('');
    setFieldType('select');
    setFieldOptions('');
    setFieldRequired(false);
    setFieldDesc('');
  };

  const startEdit = (field) => {
    setEditingFieldId(field.id || field._id);
    setEditLabel(field.label || field.name);
    setEditOptions((field.options || []).join(', '));
  };

  const handleSaveEdit = async (fieldId) => {
    try {
      const optionsArray = editOptions.split(',').map(s => s.trim()).filter(Boolean);
      await api.put(`/metadata/fields/${fieldId}`, {
        label: editLabel.trim(),
        options: optionsArray
      });

      setFeedback({ type: 'success', message: 'Field updated successfully!' });
      setEditingFieldId(null);
      fetchFields();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to update field.' });
    }
  };

  const handleDelete = async (fieldId, name) => {
    if (!window.confirm(`Are you sure you want to delete the metadata field '${name}'?`)) return;

    try {
      await api.delete(`/metadata/fields/${fieldId}`);
      setFeedback({ type: 'success', message: `Field '${name}' deleted.` });
      fetchFields();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to delete field.' });
    }
  };

  return (
    <div className="admin-settings-container">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Dynamic Metadata Settings</h1>
          <p className="page-subtitle">
            Configure dynamic, extensible fields without hardcoding. Changes automatically propagate to uploads, filters, and search.
          </p>
        </div>
        <button onClick={() => setIsAdding(!isAdding)} className="btn-primary">
          {isAdding ? <X size={18} /> : <Plus size={18} />}
          <span>{isAdding ? 'Cancel' : 'Add New Custom Field'}</span>
        </button>
      </div>

      {feedback.message && (
        <div className={feedback.type === 'success' ? 'alert-success' : 'alert-error'}>
          {feedback.message}
        </div>
      )}

      {/* Add New Field Drawer / Form */}
      {isAdding && (
        <div className="add-field-card">
          <div className="card-header">
            <h3>Define New Custom Metadata Field</h3>
            <span className="card-badge">Zero Hardcoding</span>
          </div>

          <form onSubmit={handleAddField} className="field-form">
            <div className="form-grid-2">
              <div className="form-group">
                <label>Field Identifier (Key Name)*</label>
                <input
                  type="text"
                  placeholder="e.g. Audit Status, Project Code"
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  required
                />
                <small className="help-text">Internal key stored in MongoDB dynamic metadata object.</small>
              </div>

              <div className="form-group">
                <label>Display Label</label>
                <input
                  type="text"
                  placeholder="e.g. Audit Approval Status"
                  value={fieldLabel}
                  onChange={(e) => setFieldLabel(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Field Data Type</label>
                <select value={fieldType} onChange={(e) => setFieldType(e.target.value)}>
                  <option value="select">Dropdown Select (Predefined Options)</option>
                  <option value="text">Single-line Text</option>
                  <option value="number">Numeric Value</option>
                  <option value="date">Date Picker</option>
                </select>
              </div>

              <div className="form-group">
                <label>Description (Optional)</label>
                <input
                  type="text"
                  placeholder="Help text shown to user during document upload"
                  value={fieldDesc}
                  onChange={(e) => setFieldDesc(e.target.value)}
                />
              </div>
            </div>

            {fieldType === 'select' && (
              <div className="form-group">
                <label>Dropdown Options (Comma-separated)*</label>
                <input
                  type="text"
                  placeholder="e.g. In Review, Approved, Flagged for Revision, Closed"
                  value={fieldOptions}
                  onChange={(e) => setFieldOptions(e.target.value)}
                  required
                />
                <small className="help-text">Separate options with commas. You can add more options anytime.</small>
              </div>
            )}

            <div className="form-group-checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={fieldRequired}
                  onChange={(e) => setFieldRequired(e.target.checked)}
                />
                <span>Mandatory field (Required during upload)</span>
              </label>
            </div>

            <div className="form-actions">
              <button type="button" onClick={() => setIsAdding(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save Custom Field
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Existing Dynamic Fields Table */}
      <div className="fields-table-card">
        <div className="card-header">
          <h3>Configured Dynamic Metadata Attributes</h3>
          <span className="count-badge">{fields.length} Active Fields</span>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading schema definitions...</p>
          </div>
        ) : fields.length === 0 ? (
          <div className="empty-state">
            <Sliders size={48} className="empty-icon" />
            <h3>No custom metadata fields</h3>
            <p>Click 'Add New Custom Field' above to define dynamic tags for your documents.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="custom-fields-table">
              <thead>
                <tr>
                  <th>Field Key & Label</th>
                  <th>Type</th>
                  <th>Configured Options / Allowed Values</th>
                  <th>Required</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field) => {
                  const fieldId = field.id || field._id;
                  const isEditing = editingFieldId === fieldId;

                  return (
                    <tr key={fieldId} className={isEditing ? 'editing-row' : ''}>
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            className="inline-input"
                          />
                        ) : (
                          <div>
                            <strong>{field.label || field.name}</strong>
                            <div className="field-internal-name">{field.name}</div>
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="type-pill">{field.type}</span>
                      </td>
                      <td>
                        {isEditing ? (
                          <div className="edit-options-box">
                            <input
                              type="text"
                              value={editOptions}
                              onChange={(e) => setEditOptions(e.target.value)}
                              placeholder="Comma-separated options"
                              className="inline-input"
                            />
                            <small className="help-text">Edit or add choices (e.g. new 'Report Type')</small>
                          </div>
                        ) : field.options && field.options.length > 0 ? (
                          <div className="options-tags-wrap">
                            {field.options.map((opt) => (
                              <span key={opt} className="option-badge">
                                {opt}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted">Free-form {field.type}</span>
                        )}
                      </td>
                      <td>
                        {field.required ? (
                          <span className="badge required-yes">Required</span>
                        ) : (
                          <span className="badge required-no">Optional</span>
                        )}
                      </td>
                      <td>
                        <div className="row-actions">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(fieldId)}
                                className="btn-icon save"
                                title="Save changes"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={() => setEditingFieldId(null)}
                                className="btn-icon cancel"
                                title="Cancel"
                              >
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(field)}
                                className="btn-icon edit"
                                title="Edit options / label"
                              >
                                <Edit3 size={16} />
                              </button>
                              {field.name !== 'Division' && (
                                <button
                                  onClick={() => handleDelete(fieldId, field.name)}
                                  className="btn-icon delete"
                                  title="Delete field"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminSettingsScreen;
