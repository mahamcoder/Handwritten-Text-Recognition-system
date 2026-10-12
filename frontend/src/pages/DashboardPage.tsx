import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Plus, FileText, Sparkles, Loader2, AlertCircle, Clock, CheckCircle2,
  Upload, Trash2, RefreshCw, Pencil, Layers
} from 'lucide-react';

interface DocumentItem {
  document_id: string;
  image_url: string;
  image_urls?: string[];
  page_count?: number;
  recognized_text: string;
  status: string;
  error_message: string | null;
  engine_used: string;
  file_size: number;
  upload_date: string;
  updated_at: string;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
    uploaded: {
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-700',
      icon: <Upload className="w-3 h-3 text-blue-600" />,
      label: 'Uploaded'
    },
    processing: {
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-700',
      icon: <Loader2 className="w-3 h-3 animate-spin text-amber-600" />,
      label: 'Processing'
    },
    done: {
      bg: 'bg-emerald-50 border-emerald-200',
      text: 'text-emerald-700',
      icon: <CheckCircle2 className="w-3 h-3 text-emerald-600" />,
      label: 'Done'
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-700',
      icon: <AlertCircle className="w-3 h-3 text-red-600" />,
      label: 'Error'
    }
  };

  const c = config[status] || config['uploaded'];
  return (
    <span className={`inline-flex items-center space-x-1.5 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${c.bg} ${c.text}`}>
      {c.icon}
      <span>{c.label}</span>
    </span>
  );
};

export const DashboardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/documents');
      setDocuments(response.data.documents || []);
    } catch (err: any) {
      console.error('Failed to fetch documents:', err);
      setError(err.response?.data?.detail || 'Failed to load document history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDelete = async (docId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.delete(`/api/documents/${docId}`);
      setDocuments((prev) => prev.filter((d) => d.document_id !== docId));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete document.');
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
        ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 sm:pb-6 border-b border-[#D0E2E2]">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#183D40] tracking-tight">My Documents</h1>
          <p className="text-xs sm:text-sm text-[#5A7E81] mt-1 font-sans">
            Manage and export your handwritten transcriptions ({currentUser?.email})
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          <button
            onClick={fetchDocuments}
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#235D62] bg-white border border-[#D0E2E2] px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl hover:bg-[#EBF3F3] transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <Link
            to="/upload"
            className="inline-flex items-center space-x-1.5 sm:space-x-2 bg-[#235D62] hover:bg-[#1C4E52] text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-full transition-all font-bold text-xs shadow-md shadow-[#235D62]/20 hover:scale-105 active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Note</span>
          </Link>
        </div>
      </div>

      {/* Error Callout */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start space-x-2.5 text-xs text-red-700 shadow-sm">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="w-9 h-9 text-[#235D62] animate-spin" />
          <span className="font-mono text-xs font-semibold text-[#5A7E81]">Loading your document workspace...</span>
        </div>
      ) : documents.length === 0 ? (
        /* Empty State */
        <div className="bg-white border border-[#D0E2E2] rounded-3xl p-12 text-center space-y-4 max-w-xl mx-auto shadow-xl">
          <div className="w-14 h-14 rounded-full bg-[#EBF3F3] border border-[#78C0BD] mx-auto flex items-center justify-center text-[#235D62] shadow-inner">
            <FileText className="w-7 h-7 text-[#235D62]" />
          </div>
          <h3 className="font-display text-2xl font-extrabold text-[#183D40]">No documents uploaded yet</h3>
          <p className="text-sm text-[#5A7E81] max-w-md mx-auto leading-relaxed">
            Upload photos or scans of your handwritten notes to transcribe them into digital text.
          </p>
          <div className="pt-2">
            <Link
              to="/upload"
              className="inline-flex items-center space-x-2 bg-[#235D62] hover:bg-[#1C4E52] text-white px-6 py-3 rounded-full transition-all font-bold text-xs shadow-md shadow-[#235D62]/20 hover:scale-105 active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-[#78C0BD]" />
              <span>Upload Your First Note</span>
            </Link>
          </div>
        </div>
      ) : (
        /* Document Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <div
              key={doc.document_id}
              className="bg-white border border-[#D0E2E2] rounded-3xl overflow-hidden shadow-lg shadow-[#183D40]/5 hover:shadow-xl hover:border-[#78C0BD] transition-all group"
            >
              {/* Image Thumbnail */}
              <div
                className="h-44 bg-[#F4F8F8] overflow-hidden cursor-pointer relative"
                onClick={() => navigate(`/documents/${doc.document_id}`)}
              >
                {doc.image_url ? (
                  <img
                    src={doc.image_url}
                    alt="Document thumbnail"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#5A7E81]">
                    <FileText className="w-10 h-10 text-[#D0E2E2]" />
                  </div>
                )}

                {/* Multi-Page Indicator Badge */}
                {doc.page_count && doc.page_count > 1 ? (
                  <span className="absolute top-2.5 right-2.5 bg-[#183D40]/85 backdrop-blur-md text-white font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center space-x-1 shadow">
                    <Layers className="w-3 h-3 text-[#78C0BD]" />
                    <span>{doc.page_count} Pages</span>
                  </span>
                ) : null}
              </div>

              {/* Card Footer */}
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <StatusBadge status={doc.status} />
                    {doc.page_count && doc.page_count > 1 ? (
                      <span className="font-mono text-[10px] bg-teal-50 border border-teal-200 text-[#235D62] px-2 py-0.5 rounded-full font-bold flex items-center space-x-1">
                        <Layers className="w-3 h-3 text-[#235D62]" />
                        <span>{doc.page_count}p</span>
                      </span>
                    ) : null}
                  </div>
                  {doc.engine_used && (
                    <span className="font-mono text-[10px] text-[#235D62] bg-[#EBF3F3] border border-[#D0E2E2] px-2 py-0.5 rounded-md font-bold">
                      {doc.engine_used}
                    </span>
                  )}
                </div>

                {/* Recognized text preview */}
                <p className="text-xs text-[#183D40] line-clamp-2 leading-relaxed min-h-[2.5rem] font-sans">
                  {doc.recognized_text
                    ? doc.recognized_text.slice(0, 120) + (doc.recognized_text.length > 120 ? '...' : '')
                    : doc.status === 'error'
                      ? doc.error_message || 'Recognition error'
                      : 'No text transcribed yet'}
                </p>

                <div className="flex items-center justify-between pt-3 border-t border-[#D0E2E2]/70">
                  <span className="font-mono text-[10px] text-[#5A7E81] flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-[#235D62]" />
                    <span>{formatDate(doc.upload_date)}</span>
                  </span>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => navigate(`/documents/${doc.document_id}`)}
                      title="Edit Document"
                      className="px-3 py-1.5 bg-[#EBF3F3] hover:bg-[#D0E2E2] text-[#235D62] font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(doc.document_id)}
                      title="Delete Document"
                      className="p-1.5 text-[#5A7E81] hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
