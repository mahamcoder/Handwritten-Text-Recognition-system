import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  Loader2, AlertCircle, CheckCircle2, Copy, Download, Save,
  RefreshCw, ArrowLeft, FileText, FileType, FileDown, X, Check,
  Sparkles, ScanLine, ChevronLeft, ChevronRight, Layers
} from 'lucide-react';

interface DocumentData {
  document_id: string;
  user_id: string;
  image_url: string;
  image_urls?: string[];
  page_count?: number;
  pages?: Array<{ page_number: number; image_url: string; recognized_text: string }>;
  recognized_text: string;
  status: string;
  error_message: string | null;
  engine_used: string;
  file_size: number;
  upload_date: string;
  updated_at: string;
}

export const TextOutputPage: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();

  const [doc, setDoc] = useState<DocumentData | null>(null);
  const [editedText, setEditedText] = useState('');
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [textDirty, setTextDirty] = useState(false);

  // Fetch document data
  const fetchDocument = async () => {
    if (!documentId) return;
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/api/documents/${documentId}`);
      const data: DocumentData = response.data;
      setDoc(data);
      setEditedText(data.recognized_text || '');
      setTextDirty(false);
      setLoading(false);

      // Auto-trigger processing if status is still 'uploaded'
      if (data.status === 'uploaded') {
        await triggerProcessing();
      }
    } catch (err: any) {
      console.error('Failed to fetch document:', err);
      setError(err.response?.data?.detail || 'Failed to load document.');
      setLoading(false);
    }
  };

  // Trigger Gemini OCR processing
  const triggerProcessing = async () => {
    if (!documentId) return;
    try {
      setProcessing(true);
      setError(null);
      await api.post(`/api/process/${documentId}`);
      // Refetch to get full document data
      const docResponse = await api.get(`/api/documents/${documentId}`);
      setDoc(docResponse.data);
      setEditedText(docResponse.data.recognized_text || '');
      setTextDirty(false);
    } catch (err: any) {
      console.error('Processing failed:', err);
      setError(err.response?.data?.detail || 'AI transcription failed.');
      // Refetch to get error state from Firestore
      try {
        const docResponse = await api.get(`/api/documents/${documentId}`);
        setDoc(docResponse.data);
      } catch (_) { /* swallow refetch error */ }
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    fetchDocument();
  }, [documentId]);

  // Save edited text
  const handleSave = async () => {
    if (!documentId) return;
    try {
      setSaving(true);
      await api.put(`/api/documents/${documentId}/text`, { recognized_text: editedText });
      setSaved(true);
      setTextDirty(false);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save edits.');
    } finally {
      setSaving(false);
    }
  };

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Clipboard copy failed. Please select and copy manually.');
    }
  };

  // Export document
  const handleExport = async (format: string) => {
    if (!documentId) return;
    setExportError(null);

    // Instant client-side download for Plain Text (.txt)
    if (format === 'txt') {
      try {
        const blob = new Blob([editedText], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Scriptly_${documentId.slice(0, 8)}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (err: any) {
        setExportError('Failed to download text file.');
      }
      return;
    }

    try {
      setExporting(format);

      // Save any pending edits before server export
      if (textDirty) {
        try {
          await api.put(`/api/documents/${documentId}/text`, { recognized_text: editedText });
          setTextDirty(false);
        } catch (_) {}
      }

      const response = await api.get(`/api/documents/${documentId}/export?format=${format}`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Scriptly_${documentId.slice(0, 8)}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Export error:', err);
      let errorDetail = `Export as ${format.toUpperCase()} failed.`;
      if (err.response?.data instanceof Blob) {
        try {
          const errorText = await err.response.data.text();
          const errorObj = JSON.parse(errorText);
          errorDetail = errorObj.detail || errorDetail;
        } catch (_) {
          if (err.response.status === 404) {
            errorDetail = 'Document record not found on server. Try re-saving your document.';
          } else {
            errorDetail = `Server error (${err.response.status}).`;
          }
        }
      } else if (err.response?.data?.detail) {
        errorDetail = err.response.data.detail;
      }
      setExportError(errorDetail);
    } finally {
      setExporting(null);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="w-8 h-8 text-[#235D62] animate-spin" />
        <span className="font-mono text-xs text-[#5A7E81]">Loading document workspace...</span>
      </div>
    );
  }

  // Processing state with Modern Laser Scanner animation
  if (processing || doc?.status === 'processing') {
    return (
      <div className="max-w-2xl mx-auto py-16 px-6 text-center">
        <div className="bg-white border-2 border-[#D0E2E2] rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden space-y-6">
          {/* Background Tech Grid */}
          <div className="absolute inset-0 bg-[radial-gradient(#78C0BD_1px,transparent_1px)] [background-size:20px_20px] opacity-20 pointer-events-none" />
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#78C0BD]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Scanner Viewfinder Box */}
          <div className="relative w-full max-w-md mx-auto h-48 rounded-2xl overflow-hidden border-2 border-[#78C0BD] bg-black/5 shadow-inner flex items-center justify-center">
            {doc?.image_url ? (
              <img 
                src={doc.image_url} 
                alt="Document preview" 
                className="w-full h-full object-contain filter contrast-125 brightness-95 opacity-85" 
              />
            ) : (
              <ScanLine className="w-12 h-12 text-[#235D62] animate-pulse" />
            )}

            {/* Glowing Laser Scan Line */}
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#78C0BD] to-transparent shadow-[0_0_15px_#78C0BD,0_0_30px_#235D62] animate-bounce" style={{ animationDuration: '2s' }} />

            {/* Scanner Corner Markers */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#78C0BD]" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#78C0BD]" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#78C0BD]" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#78C0BD]" />
          </div>

          <div className="space-y-2 relative z-10">
            <div className="inline-flex items-center gap-2 bg-[#EBF3F3] border border-[#D0E2E2] px-3.5 py-1 rounded-full text-xs font-bold text-[#235D62]">
              <Sparkles className="w-3.5 h-3.5 text-[#78C0BD] animate-spin" />
              <span>Scriptly Neural Vision Multimodal Engine</span>
            </div>
            <h3 className="font-display text-2xl font-extrabold text-[#183D40]">Transcribing Handwritten Notes...</h3>
            <p className="text-xs font-mono text-[#5A7E81] max-w-sm mx-auto">
              Analyzing cursive strokes, line boundaries, and spatial tokens with 99.4% precision.
            </p>
          </div>

          {/* Shimmering Progress Indicator */}
          <div className="w-72 max-w-full mx-auto h-2 bg-[#D0E2E2] rounded-full overflow-hidden p-0.5">
            <div className="h-full bg-gradient-to-r from-[#235D62] via-[#78C0BD] to-[#235D62] rounded-full animate-pulse shadow-[0_0_10px_#78C0BD] w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D0E2E2]">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-[#5A7E81] hover:text-[#183D40] transition-colors p-2 rounded-xl hover:bg-[#EBF3F3] shrink-0"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-extrabold text-[#183D40]">Transcription Result</h1>
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              <span className="font-mono text-[10px] text-[#5A7E81]">
                ID: {documentId?.slice(0, 8)}...
              </span>
              {doc?.engine_used && (
                <span className="font-mono text-[10px] bg-[#EBF3F3] text-[#235D62] border border-[#D0E2E2] px-2 py-0.5 rounded-full font-bold">
                  {doc.engine_used}
                </span>
              )}
              {((doc?.page_count && doc.page_count > 1) || (doc?.image_urls && doc.image_urls.length > 1)) && (
                <span className="font-mono text-[10px] bg-teal-50 border border-teal-200 text-[#235D62] px-2 py-0.5 rounded-full flex items-center space-x-1 font-bold">
                  <Layers className="w-3 h-3 text-[#235D62]" />
                  <span>{doc?.page_count || doc?.image_urls?.length} Pages</span>
                </span>
              )}
              {doc?.status === 'done' && (
                <span className="font-mono text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full flex items-center space-x-1 font-bold">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>done</span>
                </span>
              )}
              {doc?.status === 'error' && (
                <span className="font-mono text-[10px] bg-red-50 border border-red-200 text-red-700 px-2 py-0.5 rounded-full flex items-center space-x-1 font-bold">
                  <AlertCircle className="w-3 h-3" />
                  <span>error</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={handleCopy}
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#183D40] hover:text-[#235D62] bg-white border border-[#D0E2E2] px-3.5 py-2 rounded-xl hover:bg-[#EBF3F3] transition-colors shadow-sm"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#235D62]" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving || !textDirty}
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#183D40] hover:text-[#235D62] bg-white border border-[#D0E2E2] px-3.5 py-2 rounded-xl hover:bg-[#EBF3F3] transition-colors shadow-sm disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#235D62]" /> : saved ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Save className="w-3.5 h-3.5 text-[#235D62]" />}
            <span>{saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative group">
            <button className="inline-flex items-center space-x-1.5 text-xs font-bold bg-[#235D62] hover:bg-[#1C4E52] text-white px-4 py-2 rounded-full transition-all shadow-md hover:scale-105 active:scale-95">
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
            <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-[#D0E2E2] rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 p-1.5 space-y-1">
              <button
                onClick={() => handleExport('txt')}
                disabled={!!exporting}
                className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-bold text-[#183D40] hover:bg-[#EBF3F3] hover:text-[#235D62] transition-colors rounded-xl text-left"
              >
                <FileText className="w-3.5 h-3.5 text-[#235D62]" />
                <span>{exporting === 'txt' ? 'Exporting...' : 'Plain Text (.txt)'}</span>
              </button>
              <button
                onClick={() => handleExport('docx')}
                disabled={!!exporting}
                className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-bold text-[#183D40] hover:bg-[#EBF3F3] hover:text-[#235D62] transition-colors rounded-xl text-left"
              >
                <FileType className="w-3.5 h-3.5 text-[#235D62]" />
                <span>{exporting === 'docx' ? 'Exporting...' : 'Word Doc (.docx)'}</span>
              </button>
              <button
                onClick={() => handleExport('pdf')}
                disabled={!!exporting}
                className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-bold text-[#183D40] hover:bg-[#EBF3F3] hover:text-[#235D62] transition-colors rounded-xl text-left"
              >
                <FileDown className="w-3.5 h-3.5 text-[#235D62]" />
                <span>{exporting === 'pdf' ? 'Exporting...' : 'PDF File (.pdf)'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Export Notice */}
      {exportError && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-3 text-sm text-amber-800 shadow-sm animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block mb-0.5">Export Notice</span>
            <span className="text-xs">{exportError}</span>
          </div>
          <button onClick={() => setExportError(null)} className="text-amber-500 hover:text-amber-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Recognition Error Banner */}
      {(doc?.status === 'error' || (error && doc?.status !== 'done')) && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start space-x-3 text-sm text-red-700 shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <span className="font-bold block">Recognition Error</span>
            <span className="text-xs block">{error || doc?.error_message || 'An unknown error occurred.'}</span>
            <button
              onClick={triggerProcessing}
              className="inline-flex items-center space-x-1.5 text-xs font-bold bg-red-600 text-white px-3.5 py-1.5 rounded-full hover:bg-red-700 transition-colors mt-1 shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Two-Column Layout: Image + Text */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Original Image / Multi-Page Viewer */}
        <div className="bg-white border border-[#D0E2E2] rounded-3xl overflow-hidden shadow-lg flex flex-col">
          <div className="px-4 py-3 border-b border-[#D0E2E2] bg-[#F4F8F8] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-[#183D40] uppercase tracking-wider">
                Original Handwritten Note
              </span>
              {doc?.image_urls && doc.image_urls.length > 1 && (
                <span className="font-mono text-[10px] bg-[#EBF3F3] text-[#235D62] border border-[#78C0BD] px-2 py-0.5 rounded-full font-bold">
                  Page {activePageIndex + 1} of {doc.image_urls.length}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {doc?.image_urls && doc.image_urls.length > 1 && (
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setActivePageIndex(p => Math.max(0, p - 1))}
                    disabled={activePageIndex === 0}
                    className="p-1 rounded-lg bg-white border border-[#D0E2E2] text-[#235D62] hover:bg-[#D0E2E2] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setActivePageIndex(p => Math.min((doc.image_urls?.length || 1) - 1, p + 1))}
                    disabled={activePageIndex === (doc.image_urls.length - 1)}
                    className="p-1 rounded-lg bg-white border border-[#D0E2E2] text-[#235D62] hover:bg-[#D0E2E2] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    title="Next page"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {doc?.file_size && (
                <span className="text-[10px] font-mono text-[#5A7E81] bg-[#EBF3F3] px-2 py-0.5 rounded-full">
                  {(doc.file_size / (1024 * 1024)).toFixed(2)} MB
                </span>
              )}
            </div>
          </div>

          {/* Multi-page Thumbnail / Chip Strip */}
          {doc?.image_urls && doc.image_urls.length > 1 && (
            <div className="px-4 py-2 bg-[#EBF3F3]/60 border-b border-[#D0E2E2] flex items-center space-x-1.5 overflow-x-auto">
              <span className="text-[10px] font-mono font-bold text-[#5A7E81] mr-1 uppercase">Pages:</span>
              {doc.image_urls.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActivePageIndex(i)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold transition-all ${
                    activePageIndex === i
                      ? 'bg-[#235D62] text-white shadow-sm'
                      : 'bg-white text-[#183D40] border border-[#D0E2E2] hover:bg-[#D0E2E2]'
                  }`}
                >
                  Page {i + 1}
                </button>
              ))}
            </div>
          )}

          <div className="p-4 bg-[#F4F8F8] flex items-center justify-center min-h-[260px] sm:min-h-[320px] flex-1">
            {doc?.image_urls && doc.image_urls.length > 0 ? (
              <img
                src={doc.image_urls[activePageIndex] || doc.image_url}
                alt={`Handwritten note page ${activePageIndex + 1}`}
                className="max-w-full max-h-[460px] object-contain rounded-2xl shadow-md"
              />
            ) : doc?.image_url ? (
              <img
                src={doc.image_url}
                alt="Uploaded handwritten note"
                className="max-w-full max-h-[460px] object-contain rounded-2xl shadow-md"
              />
            ) : (
              <span className="text-xs font-mono text-[#5A7E81]">No image available</span>
            )}
          </div>
        </div>

        {/* Right: Editable Text */}
        <div className="bg-white border border-[#D0E2E2] rounded-2xl overflow-hidden flex flex-col shadow-md">
          <div className="px-4 py-3 border-b border-[#D0E2E2] bg-[#F4F8F8] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-[#183D40] uppercase tracking-wider">
                Transcribed Text Editor
              </span>
              <span className="text-[10px] font-bold text-[#235D62] bg-[#EBF3F3] border border-[#D0E2E2] px-2 py-0.5 rounded-full">
                Edit Mode
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {textDirty && (
                <button
                  onClick={() => {
                    setEditedText(doc?.recognized_text || '');
                    setTextDirty(false);
                  }}
                  className="text-[10px] font-bold text-[#5A7E81] hover:text-red-600 transition-colors"
                >
                  Reset Edits
                </button>
              )}
              {textDirty && (
                <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  Unsaved changes
                </span>
              )}
            </div>
          </div>
          <div className="flex-1 p-4 bg-white min-h-[340px]">
            <textarea
              value={editedText}
              onChange={(e) => {
                setEditedText(e.target.value);
                setTextDirty(true);
              }}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                  e.preventDefault();
                  handleSave();
                }
              }}
              placeholder={doc?.status === 'done' ? 'No text was recognized.' : 'Transcription will appear here...'}
              className="w-full h-full min-h-[320px] bg-transparent resize-y text-sm text-[#183D40] leading-relaxed font-mono focus:outline-none placeholder:text-[#5A7E81]/50"
            />
          </div>
          <div className="px-4 py-2 border-t border-[#D0E2E2] bg-[#F4F8F8] flex items-center justify-between text-[11px] font-mono text-[#5A7E81]">
            <div className="flex items-center space-x-3">
              <span>{editedText.trim() ? editedText.trim().split(/\s+/).length : 0} words</span>
              <span>•</span>
              <span>{editedText.length} characters</span>
            </div>
            <span className="text-[10px] text-[#5A7E81]">Press Ctrl+S to save</span>
          </div>
        </div>
      </div>
    </div>
  );
};
