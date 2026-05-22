import { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import AdminPanel from '../components/AdminPanel';
import { documentsAPI } from '../utils/api';

function Admin() {
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [docsRes, statsRes] = await Promise.all([
        documentsAPI.list(),
        documentsAPI.getStats()
      ]);
      setDocuments(docsRes.data.documents || []);
      setStats(statsRes.data);
    } catch (err) {
      // API might not be running yet
      console.warn('Could not fetch admin data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-900">
      {/* Header */}
      <header className="border-b border-navy-700 bg-navy-800/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href="/chat"
              className="p-2 rounded-lg hover:bg-navy-700 text-gray-400 transition-colors"
              aria-label="Back to chat"
            >
              <ArrowLeft size={20} />
            </a>
            <div>
              <h1 className="text-sm font-semibold text-white">Knowledge Base Admin</h1>
              <p className="text-[10px] text-gray-400">Manage UMPSA documents</p>
            </div>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-navy-700 text-gray-400 transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Content */}
      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto px-4 py-6"
      >
        <AdminPanel
          documents={documents}
          stats={stats}
          onRefresh={fetchData}
        />
      </motion.main>
    </div>
  );
}

export default Admin;
