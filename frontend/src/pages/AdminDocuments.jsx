import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Upload, FileText, Trash2, RefreshCw, X, Check, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

function AdminDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [credentials, setCredentials] = useState(() => {
    return localStorage.getItem('admin-credentials') || '';
  });
  const [showLogin, setShowLogin] = useState(!credentials);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  const [uploadForm, setUploadForm] = useState({
    title: '',
    category: 'general',
    language: 'mixed',
    file: null
  });

  const getAuthHeader = useCallback(() => {
    if (!credentials) return {};
    return { 'Authorization': `Basic ${credentials}` };
  }, [credentials]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/documents`, {
        headers: getAuthHeader()
      });
      if (res.status === 401) {
        setShowLogin(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err) {
      console.warn('Could not fetch documents:', err.message);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader]);

  useEffect(() => {
    if (credentials) {
      fetchDocuments();
    }
  }, [credentials, fetchDocuments]);

  const handleLogin = (e) => {
    e.preventDefault();
    const encoded = btoa(`${loginForm.username}:${loginForm.password}`);
    localStorage.setItem('admin-credentials', encoded);
    setCredentials(encoded);
    setShowLogin(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadForm(prev => ({
        ...prev,
        file,
        title: prev.title || file.name.replace(/\.[^/.]+$/, '')
      }));
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.file) return;

    setUploading(true);
    setUploadStatus(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('title', uploadForm.title);
      formData.append('category', uploadForm.category);
      formData.append('language', uploadForm.language);

      const res = await fetch(`${API_BASE}/admin/upload-doc`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: formData
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }

      setUploadStatus({ type: 'success', message: 'Document uploaded and processed!' });
      setUploadForm({ title: '', category: 'general', language: 'mixed', file: null });
      fetchDocuments();
    } catch (err) {
      setUploadStatus({ type: 'error', message: err.message || 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this document? This cannot be undone.')) return;
    try {
      await fetch(`${API_BASE}/admin/documents/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      fetchDocuments();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const categories = ['academic', 'administrative', 'facilities', 'faq', 'general'];
  const languages = [
    { value: 'en', label: 'English' },
    { value: 'ms', label: 'Bahasa Melayu' },
    { value: 'mixed', label: 'Mixed' }
  ];

  // Login screen
  if (showLogin) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
        <div className="w-full max-w-sm glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4 text-center">Admin Login</h2>
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="text"
              placeholder="Username"
              value={loginForm.username}
              onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
              className="w-full input-field"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={loginForm.password}
              onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
              className="w-full input-field"
              required
            />
            <button type="submit" className="w-full btn-primary">
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-900">
      {/* Header */}
      <header className="border-b border-navy-700 bg-navy-800/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href="/admin"
              className="p-2 rounded-lg hover:bg-navy-700 text-gray-400 transition-colors"
              aria-label="Back to admin"
            >
              <ArrowLeft size={20} />
            </a>
            <div>
              <h1 className="text-sm font-semibold text-white">Document Management</h1>
              <p className="text-[10px] text-gray-400">Upload, view, and manage knowledge base documents</p>
            </div>
          </div>
          <button
            onClick={fetchDocuments}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-navy-700 text-gray-400 transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto px-4 py-6 space-y-6"
      >
        {/* Upload Form */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Upload size={16} className="text-accent" />
            Upload New Document
          </h3>

          <form onSubmit={handleUpload} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Document Title</label>
              <input
                type="text"
                value={uploadForm.title}
                onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Academic Calendar 2024/2025"
                className="w-full input-field text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Category</label>
                <select
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full input-field text-sm"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Language</label>
                <select
                  value={uploadForm.language}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, language: e.target.value }))}
                  className="w-full input-field text-sm"
                >
                  {languages.map(lang => (
                    <option key={lang.value} value={lang.value}>{lang.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">File (PDF, TXT, MD)</label>
              <input
                type="file"
                accept=".pdf,.txt,.md"
                onChange={handleFileChange}
                className="w-full text-sm text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-accent/20 file:text-accent hover:file:bg-accent/30 file:cursor-pointer"
              />
            </div>

            {uploadStatus && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
                  uploadStatus.type === 'success'
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}
              >
                {uploadStatus.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                {uploadStatus.message}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={!uploadForm.file || uploading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload size={14} />
                  Upload & Process
                </>
              )}
            </button>
          </form>
        </div>

        {/* Document List */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <FileText size={16} className="text-accent" />
              Ingested Documents ({documents.length})
            </h3>
          </div>

          <div className="space-y-2">
            {loading ? (
              <p className="text-sm text-gray-500 text-center py-4">Loading...</p>
            ) : documents.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No documents uploaded yet</p>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc._id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-navy-900/50 border border-navy-700/50 group"
                >
                  <FileText size={16} className="text-accent/60 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate">{doc.title}</p>
                    <p className="text-[10px] text-gray-500">
                      {doc.category} · {doc.chunkCount || 0} chunks · {doc.fileType?.toUpperCase()} · {formatFileSize(doc.fileSize)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(doc._id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all"
                    aria-label="Delete document"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.main>
    </div>
  );
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

export default AdminDocuments;
