import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import api from '../services/api';
import { 
  Upload, X, AlertCircle, Loader2, ArrowRight, CheckCircle2,
  Camera, SwitchCamera, Sparkles, Plus, Trash2, ChevronLeft, ChevronRight,
  Layers, Files, ExternalLink
} from 'lucide-react';

interface QueuedImage {
  id: string;
  file: File;
  previewUrl: string;
}

interface BatchProcessedDoc {
  document_id: string;
  image_url: string;
  filename?: string;
  recognized_text?: string;
  status?: string;
}

export const UploadPage: React.FC = () => {
  const [queuedImages, setQueuedImages] = useState<QueuedImage[]>([]);
  const [batchMode, setBatchMode] = useState<'combined' | 'individual'>('combined');
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [batchResults, setBatchResults] = useState<BatchProcessedDoc[] | null>(null);
  
  // Camera capture state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('environment');
  const [cameraLoading, setCameraLoading] = useState<boolean>(false);
  const [cameraFlash, setCameraFlash] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const addMoreInputRef = useRef<HTMLInputElement | null>(null);

  const navigate = useNavigate();

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      queuedImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const startCamera = async (facing: 'user' | 'environment' = cameraFacingMode) => {
    try {
      setCameraLoading(true);
      setError(null);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setError('Could not access camera. Please allow camera permissions in your browser.');
      setIsCameraActive(false);
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const switchCamera = () => {
    const nextFacing = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  const capturePhoto = (keepCameraOpen: boolean = false) => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Quick flash effect
    setCameraFlash(true);
    setTimeout(() => setCameraFlash(false), 200);

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      if (!blob) return;
      const count = queuedImages.length + 1;
      const file = new File([blob], `handwritten-page-${count}-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const previewUrl = URL.createObjectURL(blob);
      const newImg: QueuedImage = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        file,
        previewUrl
      };

      setQueuedImages(prev => [...prev, newImg]);
      
      if (!keepCameraOpen) {
        stopCamera();
      }
    }, 'image/jpeg', 0.95);
  };

  // Add files helper
  const addFilesToQueue = (files: File[]) => {
    const validNewImages: QueuedImage[] = [];
    const rejectedErrors: string[] = [];

    files.forEach(file => {
      // Validate type
      const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png' || 
                         file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg') || file.name.toLowerCase().endsWith('.png');
      if (!isJpgOrPng) {
        rejectedErrors.push(`"${file.name}" is not a JPEG or PNG image.`);
        return;
      }

      // Validate size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        rejectedErrors.push(`"${file.name}" exceeds the 10MB size limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
        return;
      }

      validNewImages.push({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        file,
        previewUrl: URL.createObjectURL(file)
      });
    });

    if (rejectedErrors.length > 0) {
      setError(rejectedErrors.join(' '));
    } else {
      setError(null);
    }

    if (validNewImages.length > 0) {
      setQueuedImages(prev => [...prev, ...validNewImages]);
      setBatchResults(null);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    setError(null);
    if (fileRejections && fileRejections.length > 0) {
      const messages = fileRejections.map(rej => {
        if (rej.errors[0]?.code === 'file-too-large') {
          return `${rej.file.name} is larger than 10MB.`;
        }
        return `${rej.file.name}: ${rej.errors[0]?.message}`;
      });
      setError(messages.join(', '));
    }

    if (acceptedFiles && acceptedFiles.length > 0) {
      addFilesToQueue(acceptedFiles);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png']
    },
    maxSize: 10 * 1024 * 1024,
    multiple: true
  });

  const handleManualAddMore = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleRemoveImage = (id: string) => {
    setQueuedImages(prev => {
      const target = prev.find(item => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter(item => item.id !== id);
    });
  };

  const handleMoveImage = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= queuedImages.length) return;

    setQueuedImages(prev => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated;
    });
  };

  const handleClearAll = () => {
    queuedImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
    setQueuedImages([]);
    setError(null);
    setBatchResults(null);
  };

  // Upload and Convert
  const handleUploadAndConvert = async () => {
    if (queuedImages.length === 0) return;

    try {
      setUploading(true);
      setError(null);
      setBatchResults(null);
      setProgressPercent(10);
      setProgressStatus(`Uploading ${queuedImages.length} image${queuedImages.length > 1 ? 's' : ''} to secure storage...`);

      const formData = new FormData();
      queuedImages.forEach(item => {
        formData.append('files', item.file);
      });

      // 1. Batch Upload
      const uploadRes = await api.post(`/api/upload-batch?mode=${batchMode}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded * 40) / progressEvent.total);
            setProgressPercent(10 + pct);
          }
        }
      });

      setProgressPercent(55);

      if (batchMode === 'combined') {
        const { document_id, page_count } = uploadRes.data;
        setProgressStatus(`Transcribing ${page_count} handwritten page${page_count > 1 ? 's' : ''} with Scriptly Vision...`);
        setProgressPercent(75);

        // Process combined document
        await api.post(`/api/process/${document_id}`);
        setProgressPercent(100);
        setProgressStatus('Transcription complete! Opening document...');

        setTimeout(() => {
          navigate(`/documents/${document_id}`);
        }, 600);

      } else {
        // Individual mode: process each document
        const createdDocs = uploadRes.data.documents || [];
        setProgressStatus(`Starting transcription for ${createdDocs.length} documents...`);

        const processedList: BatchProcessedDoc[] = [];
        for (let i = 0; i < createdDocs.length; i++) {
          const doc = createdDocs[i];
          const currentPct = 55 + Math.round(((i + 1) / createdDocs.length) * 40);
          setProgressPercent(currentPct);
          setProgressStatus(`Transcribing document ${i + 1} of ${createdDocs.length} (${doc.filename || 'Note'})...`);

          try {
            const procRes = await api.post(`/api/process/${doc.document_id}`);
            processedList.push({
              document_id: doc.document_id,
              image_url: doc.image_url,
              filename: doc.filename,
              recognized_text: procRes.data.recognized_text,
              status: 'done'
            });
          } catch (procErr: any) {
            console.error(`Error processing ${doc.document_id}:`, procErr);
            processedList.push({
              document_id: doc.document_id,
              image_url: doc.image_url,
              filename: doc.filename,
              status: 'error'
            });
          }
        }

        setProgressPercent(100);
        setProgressStatus('All documents transcribed!');
        setBatchResults(processedList);
      }

    } catch (err: any) {
      console.error('Batch upload/processing failed:', err);
      const serverDetail = err.response?.data?.detail;
      setError(serverDetail || err.message || 'Failed to upload and convert documents.');
    } finally {
      setUploading(false);
    }
  };

  const totalSizeMb = queuedImages.reduce((sum, item) => sum + item.file.size, 0) / (1024 * 1024);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Hidden file input for "Add More" */}
      <input
        ref={addMoreInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/jpg"
        onChange={handleManualAddMore}
        className="hidden"
      />

      {/* Header */}
      <div className="pb-4 sm:pb-6 border-b border-[#D0E2E2] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#183D40] tracking-tight">
              Upload Handwritten Notes
            </h1>
            <span className="font-mono text-[10px] bg-[#EBF3F3] text-[#235D62] border border-[#78C0BD] px-2.5 py-0.5 rounded-full font-bold">
              Multi-Image & Multi-Page
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#5A7E81] mt-1 font-sans">
            Select one or multiple photos/scans to convert into editable, exportable text (JPEG, PNG — Max 10MB each)
          </p>
        </div>

        {queuedImages.length > 0 && !uploading && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => addMoreInputRef.current?.click()}
              className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#235D62] bg-[#EBF3F3] hover:bg-[#D0E2E2] border border-[#78C0BD] px-3.5 py-2 rounded-xl transition-all shadow-sm hover:scale-105 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Images</span>
            </button>
            <button
              onClick={() => startCamera()}
              className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#235D62] bg-white hover:bg-[#EBF3F3] border border-[#D0E2E2] px-3.5 py-2 rounded-xl transition-all shadow-sm hover:scale-105 active:scale-95"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Snap Photo</span>
            </button>
            <button
              onClick={handleClearAll}
              className="inline-flex items-center space-x-1 text-xs font-mono text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 px-3 py-2 rounded-xl transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        )}
      </div>

      {/* Error Callout */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start space-x-3 text-sm text-red-700 shadow-sm animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block mb-0.5">Notice</span>
            <span className="text-xs">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Batch Results Screen (if processed in individual mode) */}
      {batchResults && (
        <div className="bg-white border-2 border-[#78C0BD] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl animate-fadeIn">
          <div className="flex items-center justify-between border-b border-[#D0E2E2] pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-300 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-[#183D40]">
                  Batch Conversion Complete!
                </h3>
                <p className="text-xs text-[#5A7E81]">
                  Successfully converted {batchResults.length} documents.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearAll}
                className="text-xs font-bold text-[#5A7E81] hover:text-[#183D40] bg-[#EBF3F3] hover:bg-[#D0E2E2] px-4 py-2 rounded-xl transition-colors"
              >
                Upload More
              </button>
              <Link
                to="/dashboard"
                className="inline-flex items-center space-x-1.5 bg-[#235D62] hover:bg-[#1C4E52] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md transition-all hover:scale-105 active:scale-95"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {batchResults.map((item, idx) => (
              <div
                key={item.document_id}
                className="border border-[#D0E2E2] rounded-2xl overflow-hidden bg-[#F4F8F8] hover:border-[#78C0BD] transition-all shadow-sm group"
              >
                <div className="h-32 overflow-hidden bg-black/5 relative">
                  <img
                    src={item.image_url}
                    alt={item.filename || `Page ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <span className="absolute top-2 left-2 bg-[#183D40]/80 backdrop-blur-sm text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Doc #{idx + 1}
                  </span>
                </div>
                <div className="p-3.5 space-y-2">
                  <p className="text-xs font-bold text-[#183D40] truncate">
                    {item.filename || `Document ${idx + 1}`}
                  </p>
                  <p className="text-[11px] text-[#5A7E81] line-clamp-2 font-mono bg-white p-1.5 rounded-lg border border-[#D0E2E2]">
                    {item.recognized_text || 'No text recognized.'}
                  </p>
                  <Link
                    to={`/documents/${item.document_id}`}
                    className="inline-flex items-center space-x-1 text-xs font-bold text-[#235D62] hover:text-[#1C4E52] pt-1"
                  >
                    <span>Open Editor</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Camera Viewfinder Modal */}
      {isCameraActive && (
        <div className="bg-white border border-[#D0E2E2] rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 relative overflow-hidden animate-fadeIn">
          {cameraFlash && (
            <div className="absolute inset-0 bg-white z-30 transition-opacity duration-200" />
          )}

          <div className="flex items-center justify-between border-b border-[#D0E2E2] pb-3">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <h3 className="font-display font-bold text-sm text-[#183D40]">Live Camera Scanner</h3>
              {queuedImages.length > 0 && (
                <span className="font-mono text-[10px] bg-[#EBF3F3] text-[#235D62] px-2 py-0.5 rounded-full font-bold">
                  {queuedImages.length} page{queuedImages.length > 1 ? 's' : ''} in queue
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={switchCamera}
                title="Switch Camera"
                className="text-xs font-bold text-[#235D62] bg-[#EBF3F3] hover:bg-[#D0E2E2] px-2.5 sm:px-3 py-1.5 rounded-full flex items-center space-x-1.5 transition-colors"
              >
                <SwitchCamera className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Flip</span>
              </button>
              <button
                onClick={stopCamera}
                className="text-[#5A7E81] hover:text-red-600 p-1.5 rounded-xl hover:bg-red-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden bg-black flex items-center justify-center min-h-[260px] sm:min-h-[340px] max-h-[460px]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain max-h-[440px]"
            />
            {/* Guide overlay */}
            <div className="absolute inset-4 sm:inset-8 border-2 border-white/40 border-dashed rounded-2xl pointer-events-none flex items-center justify-center">
              <span className="text-[10px] sm:text-[11px] font-mono text-white/80 bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm text-center">
                Position your handwritten page within frame
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
            <button
              onClick={stopCamera}
              className="px-5 py-2.5 text-xs font-bold text-[#5A7E81] hover:bg-[#EBF3F3] rounded-full transition-colors"
            >
              Close Camera
            </button>
            <button
              onClick={() => capturePhoto(true)}
              className="bg-white border-2 border-[#235D62] text-[#235D62] hover:bg-[#EBF3F3] px-5 sm:px-6 py-3 rounded-full font-bold text-xs shadow-md flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              <Camera className="w-4 h-4 text-[#235D62]" />
              <span>Snap & Add Another Page</span>
            </button>
            <button
              onClick={() => capturePhoto(false)}
              className="bg-[#235D62] hover:bg-[#1C4E52] text-white px-6 sm:px-8 py-3 rounded-full font-bold text-xs shadow-lg shadow-[#235D62]/25 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
            >
              <CheckCircle2 className="w-4 h-4 text-[#78C0BD]" />
              <span>Capture & Finish</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Drag-and-Drop Area (When queue is empty and camera is off) */}
      {queuedImages.length === 0 && !isCameraActive && (
        <div className="space-y-4">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-3xl p-8 sm:p-14 text-center cursor-pointer transition-all shadow-lg ${
              isDragActive
                ? 'border-[#235D62] bg-[#EBF3F3] scale-[0.99]'
                : 'border-[#B5D6D5] hover:border-[#235D62] bg-white hover:bg-[#F9FCFC]'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#EBF3F3] border border-[#78C0BD] flex items-center justify-center text-[#235D62] shadow-inner group-hover:scale-110 transition-transform">
                <Upload className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <div>
                <p className="font-display text-base sm:text-lg font-bold text-[#183D40]">
                  {isDragActive
                    ? 'Drop all handwritten images here...'
                    : 'Drag & drop multiple images or click to browse'}
                </p>
                <p className="text-xs text-[#5A7E81] mt-1 font-mono">
                  Select one or multiple note pages at once (Page 1, 2, 3...)
                </p>
              </div>
              <div className="inline-flex items-center space-x-2 text-[10px] sm:text-[11px] font-mono font-bold text-[#235D62] bg-[#EBF3F3] px-4 py-1.5 rounded-full border border-[#D0E2E2]">
                <span>Supported: JPG, JPEG, PNG</span>
                <span>•</span>
                <span>Max: 10MB each</span>
                <span>•</span>
                <span>Batch Mode Enabled</span>
              </div>
            </div>
          </div>

          {/* Quick Camera Trigger */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <span className="text-xs font-mono text-[#5A7E81]">or</span>
            <button
              onClick={() => startCamera()}
              disabled={cameraLoading}
              className="bg-white border-2 border-[#78C0BD] hover:bg-[#EBF3F3] text-[#235D62] font-bold text-xs px-6 py-3 rounded-full shadow-sm flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              {cameraLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#235D62]" />
              ) : (
                <Camera className="w-4 h-4 text-[#235D62]" />
              )}
              <span>Take Photo with Camera</span>
            </button>
          </div>
        </div>
      )}

      {/* Selected Images Queue & Conversion Panel */}
      {queuedImages.length > 0 && (
        <div className="space-y-6">
          {/* Queue Bar */}
          <div className="bg-white border border-[#D0E2E2] rounded-3xl p-5 sm:p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D0E2E2] pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#EBF3F3] border border-[#78C0BD] flex items-center justify-center text-[#235D62] font-mono font-bold text-sm">
                  {queuedImages.length}
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-[#183D40]">
                    {queuedImages.length} Image{queuedImages.length > 1 ? 's' : ''} in Queue
                  </h3>
                  <p className="text-xs font-mono text-[#5A7E81]">
                    Total Size: {totalSizeMb.toFixed(2)} MB • Rearrange pages using the arrows
                  </p>
                </div>
              </div>

              {!uploading && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => addMoreInputRef.current?.click()}
                    className="text-xs font-bold text-[#235D62] bg-[#EBF3F3] hover:bg-[#D0E2E2] px-3.5 py-2 rounded-xl border border-[#D0E2E2] transition-colors flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add More</span>
                  </button>
                  <button
                    onClick={() => startCamera()}
                    className="text-xs font-bold text-[#235D62] bg-white hover:bg-[#EBF3F3] px-3.5 py-2 rounded-xl border border-[#D0E2E2] transition-colors flex items-center space-x-1"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Snap Page</span>
                  </button>
                </div>
              )}
            </div>

            {/* Images Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {queuedImages.map((img, index) => (
                <div
                  key={img.id}
                  className="bg-[#F4F8F8] border-2 border-[#D0E2E2] hover:border-[#78C0BD] rounded-2xl overflow-hidden shadow-sm transition-all flex flex-col group relative"
                >
                  {/* Page Badge & Action Buttons */}
                  <div className="absolute top-2 left-2 z-10">
                    <span className="font-mono text-[10px] font-bold bg-[#183D40]/85 backdrop-blur-md text-white px-2.5 py-1 rounded-full shadow">
                      Page {index + 1}
                    </span>
                  </div>

                  {!uploading && (
                    <div className="absolute top-2 right-2 z-10 flex items-center space-x-1">
                      <button
                        onClick={() => handleRemoveImage(img.id)}
                        className="bg-white/90 hover:bg-red-50 text-[#5A7E81] hover:text-red-600 p-1.5 rounded-full shadow transition-colors"
                        title="Remove image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Image Preview with scanning effect if uploading */}
                  <div className="relative h-44 overflow-hidden bg-white flex items-center justify-center p-2">
                    <img
                      src={img.previewUrl}
                      alt={`Page ${index + 1}`}
                      className={`max-h-full max-w-full object-contain rounded-lg transition-all ${
                        uploading ? 'filter contrast-125 brightness-95 opacity-80' : ''
                      }`}
                    />

                    {/* Scanning Laser Beam during Upload */}
                    {uploading && (
                      <>
                        <div className="absolute inset-0 bg-[radial-gradient(#78C0BD_1px,transparent_1px)] [background-size:12px_12px] opacity-30 pointer-events-none" />
                        <div 
                          className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#78C0BD] to-transparent shadow-[0_0_15px_#78C0BD] animate-bounce pointer-events-none" 
                          style={{ animationDuration: '1.5s' }} 
                        />
                      </>
                    )}
                  </div>

                  {/* Card Bottom: File Info & Order Controls */}
                  <div className="p-3 bg-[#EBF3F3] border-t border-[#D0E2E2] flex items-center justify-between text-xs">
                    <div className="truncate mr-2">
                      <p className="font-bold text-[#183D40] truncate text-[11px]">{img.file.name}</p>
                      <p className="font-mono text-[10px] text-[#5A7E81]">
                        {(img.file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>

                    {!uploading && queuedImages.length > 1 && (
                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={() => handleMoveImage(index, 'left')}
                          disabled={index === 0}
                          className="p-1 rounded-lg bg-white border border-[#D0E2E2] text-[#235D62] hover:bg-[#D0E2E2] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          title="Move earlier"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveImage(index, 'right')}
                          disabled={index === queuedImages.length - 1}
                          className="p-1 rounded-lg bg-white border border-[#D0E2E2] text-[#235D62] hover:bg-[#D0E2E2] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          title="Move later"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Mode Selector (When 2+ images selected) */}
            {queuedImages.length > 1 && !uploading && (
              <div className="pt-2">
                <p className="text-xs font-mono font-bold text-[#183D40] uppercase tracking-wider mb-3">
                  Select Output Mode:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div
                    onClick={() => setBatchMode('combined')}
                    className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex items-start space-x-3.5 ${
                      batchMode === 'combined'
                        ? 'border-[#235D62] bg-[#EBF3F3] shadow-md ring-1 ring-[#235D62]'
                        : 'border-[#D0E2E2] bg-white hover:border-[#78C0BD]'
                    }`}
                  >
                    <div className={`p-2 rounded-xl mt-0.5 ${batchMode === 'combined' ? 'bg-[#235D62] text-white' : 'bg-[#EBF3F3] text-[#235D62]'}`}>
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-sm text-[#183D40]">
                          Combine into 1 Multi-Page Document
                        </h4>
                        <span className="font-mono text-[9px] bg-[#78C0BD]/20 text-[#235D62] px-2 py-0.5 rounded-full font-bold">
                          Recommended
                        </span>
                      </div>
                      <p className="text-xs text-[#5A7E81] mt-1 leading-relaxed">
                        Transcribes all {queuedImages.length} pages in order into a single unified document with page markers (Page 1, Page 2...).
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => setBatchMode('individual')}
                    className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex items-start space-x-3.5 ${
                      batchMode === 'individual'
                        ? 'border-[#235D62] bg-[#EBF3F3] shadow-md ring-1 ring-[#235D62]'
                        : 'border-[#D0E2E2] bg-white hover:border-[#78C0BD]'
                    }`}
                  >
                    <div className={`p-2 rounded-xl mt-0.5 ${batchMode === 'individual' ? 'bg-[#235D62] text-white' : 'bg-[#EBF3F3] text-[#235D62]'}`}>
                      <Files className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#183D40]">
                        Process as Separate Documents
                      </h4>
                      <p className="text-xs text-[#5A7E81] mt-1 leading-relaxed">
                        Creates an individual document for each image in your library, allowing independent editing and exporting.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Live Progress Tracker during conversion */}
            {uploading && (
              <div className="p-5 bg-[#EBF3F3] border border-[#78C0BD] rounded-2xl space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between text-xs font-mono text-[#235D62]">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#78C0BD]" />
                    <span className="font-bold">{progressStatus}</span>
                  </div>
                  <span className="font-bold">{progressPercent}%</span>
                </div>
                <div className="w-full bg-[#D0E2E2] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#235D62] via-[#78C0BD] to-[#235D62] h-full transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-[#D0E2E2]">
              <div className="text-xs font-mono text-[#5A7E81] w-full sm:w-auto">
                {!uploading ? (
                  <div className="flex items-center space-x-2 text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>
                      {queuedImages.length} note{queuedImages.length > 1 ? 's' : ''} ready for AI recognition
                    </span>
                  </div>
                ) : null}
              </div>

              <button
                onClick={handleUploadAndConvert}
                disabled={uploading || queuedImages.length === 0}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2.5 bg-[#235D62] hover:bg-[#1C4E52] text-white px-8 py-3.5 rounded-full disabled:opacity-50 transition-all font-bold text-xs shadow-lg shadow-[#235D62]/20 hover:scale-105 active:scale-95"
              >
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#78C0BD]" />
                    <span>Converting with Scriptly Vision...</span>
                  </span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#78C0BD]" />
                    <span>
                      {queuedImages.length === 1
                        ? 'Upload & Convert Note'
                        : batchMode === 'combined'
                        ? `Convert & Merge ${queuedImages.length} Pages`
                        : `Convert ${queuedImages.length} Documents`}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
