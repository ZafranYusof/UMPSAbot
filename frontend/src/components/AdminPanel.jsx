import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, Trash2, RefreshCw, X, Check } from 'lucide-react';
import { documentsAPI } from '../utils/api';
import { formatFileSize } from '../utils/helpers';

function AdminPanel({ documents, stats, onRefresh }) {
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    category: 'general',
    language: 'mixed',
    file: null
  });
  const [uploadStatus, setUploadStatus] = useState(null);

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
      await documentsAPI.upload(uploadForm.file, {
        title: uploadForm.title,
        category: uploadForm.category,
        language: uploadForm.language
      });
      setUploadStatus({ type: 'success', message: 'Document uploaded and processed!' });
      setUploadForm({ title: '', category: 'general', language: 'mixed', file: null });
      onRefresh?.();
    } catch (err) {
      setUploadStatus({ 
        type: 'error', 
        message: err.response?.data?.error || 'Upload failed' 
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await documentsAPI.delete(id);
      onRefresh?.();
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

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-accent">{stats.totalDocuments || 0}</p>
            <p className="text-xs text-gray-400">Documents</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-accent">{stats.totalChunks || 0}</p>
            <p className="text-xs text-gray-400">Chunks</p>
          </div>
          <div className="glass-card p-4 text-center col-span-2 md:col-span-1">
            <p className="text-2xl font-bold text-accent">{stats.byCategory?.length || 0}</p>
            <p className="text-xs text-gray-400">Categories</p>
          </div>
        </div>
      )}

      {/* Upload Form */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Upload size={16} className="text-accent" />
          Upload Document
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
              {uploadStatus.type === 'success' ? <Check size={14} /> : <X size={14} />}
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
            Knowledge Base
          </h3>
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg hover:bg-navy-700 text-gray-400 transition-colors"
            aria-label="Refresh documents"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="space-y-2">
          {(!documents || documents.length === 0) ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No documents uploaded yet
            </p>
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
                    {doc.category} · {doc.chunkCount} chunks · {formatFileSize(doc.fileSize)}
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
    </div>
  );
}

export default AdminPanel;
