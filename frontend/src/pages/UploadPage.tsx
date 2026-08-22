import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import api from '../services/api';
import { 
  Upload, FileImage, X, AlertCircle, Loader2, ArrowRight, CheckCircle2,
  Camera, SwitchCamera, Sparkles
} from 'lucide-react';

export const UploadPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  
  // Camera capture state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('environment');
  const [cameraLoading, setCameraLoading] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const navigate = useNavigate();

  const startCamera = async (facing: 'user' | 'environment' = cameraFacingMode) => {
    try {
      setCameraLoading(true);
      setError(null);
      
      // Stop previous stream if any
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

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `handwritten-snap-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setSelectedFile(file);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      stopCamera();
    }, 'image/jpeg', 0.95);
  };

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    setError(null);
    if (fileRejections && fileRejections.length > 0) {
      const rejection = fileRejections[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError('Selected file exceeds the maximum 10MB size limit.');
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError('Invalid file format. Please upload a JPEG or PNG image.');
      } else {
        setError(rejection.errors[0]?.message || 'File upload error.');
      }
      return;
    }

    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false
  });

  const handleClear = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setError(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setError(null);
      setProgressStatus('Uploading image to secure cloud storage...');

      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await api.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const { document_id } = response.data;
      setProgressStatus('Upload complete! Launching Scriptly Vision parser...');

      setTimeout(() => {
        navigate(`/documents/${document_id}`);
      }, 500);

    } catch (err: any) {
      console.error('Upload failed:', err);
      const serverDetail = err.response?.data?.detail;
      setError(serverDetail || err.message || 'Failed to upload document to backend service.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="pb-4 sm:pb-6 border-b border-[#D0E2E2]">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#183D40] tracking-tight">
          Upload Handwritten Document
        </h1>
        <p className="text-xs sm:text-sm text-[#5A7E81] mt-1 font-sans">
          Select a high-resolution photo or scan of your handwritten notes (JPEG, PNG — Max 10MB)
        </p>
      </div>

      {/* Error Callout */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start space-x-3 text-sm text-red-700 shadow-sm">
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

      {/* Live Camera Viewfinder Modal */}
      {isCameraActive && (
        <div className="bg-white border border-[#D0E2E2] rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#D0E2E2] pb-3">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <h3 className="font-display font-bold text-sm text-[#183D40]">Camera Viewfinder</h3>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={switchCamera}
                title="Switch Camera"
                className="text-xs font-bold text-[#235D62] bg-[#EBF3F3] hover:bg-[#D0E2E2] px-2.5 sm:px-3 py-1.5 rounded-full flex items-center space-x-1.5 transition-colors"
              >
                <SwitchCamera className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Flip Camera</span>
              </button>
              <button
                onClick={stopCamera}
                className="text-[#5A7E81] hover:text-red-600 p-1.5 rounded-xl hover:bg-red-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden bg-black flex items-center justify-center min-h-[260px] sm:min-h-[320px] max-h-[460px]">
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

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={stopCamera}
              className="px-5 py-2.5 text-xs font-bold text-[#5A7E81] hover:bg-[#EBF3F3] rounded-full transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={capturePhoto}
              className="bg-[#235D62] hover:bg-[#1C4E52] text-white px-6 sm:px-8 py-3 sm:py-3.5 rounded-full font-bold text-xs shadow-lg shadow-[#235D62]/25 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>Capture Photo</span>
            </button>
          </div>
        </div>
      )}

      {/* Dropzone or Preview */}
      {!selectedFile && !isCameraActive ? (
        <div className="space-y-4">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-3xl p-6 sm:p-12 text-center cursor-pointer transition-all shadow-lg ${
              isDragActive
                ? 'border-[#235D62] bg-[#EBF3F3] scale-[0.99]'
                : 'border-[#B5D6D5] hover:border-[#235D62] bg-white'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center space-y-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#EBF3F3] border border-[#78C0BD] flex items-center justify-center text-[#235D62] shadow-inner">
                <Upload className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <div>
                <p className="font-display text-base sm:text-lg font-bold text-[#183D40]">
                  {isDragActive ? 'Drop your handwritten note here...' : 'Drag & drop your handwritten note here'}
                </p>
                <p className="text-xs text-[#5A7E81] mt-1 font-mono">
                  or click to browse files on your device
                </p>
              </div>
              <div className="inline-flex items-center space-x-2 text-[10px] sm:text-[11px] font-mono font-bold text-[#235D62] bg-[#EBF3F3] px-3.5 py-1 rounded-full border border-[#D0E2E2]">
                <span>Supported: JPG, JPEG, PNG</span>
                <span>•</span>
                <span>Max: 10MB</span>
              </div>
            </div>
          </div>

          {/* Quick Camera Capture Button */}
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
      ) : selectedFile ? (
        <div className="bg-white border border-[#D0E2E2] rounded-3xl p-7 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#D0E2E2] pb-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#EBF3F3] border border-[#78C0BD] flex items-center justify-center text-[#235D62]">
                <FileImage className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#183D40]">{selectedFile.name}</h3>
                <p className="text-xs font-mono text-[#5A7E81]">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type}
                </p>
              </div>
            </div>
            {!uploading && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { handleClear(); startCamera(); }}
                  className="text-xs font-bold text-[#235D62] hover:bg-[#EBF3F3] px-3 py-1.5 rounded-xl border border-[#D0E2E2] transition-colors flex items-center space-x-1"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Retake Photo</span>
                </button>
                <button
                  onClick={handleClear}
                  className="text-xs font-mono text-[#5A7E81] hover:text-red-600 p-2 rounded-xl hover:bg-red-50 transition-colors flex items-center space-x-1"
                >
                  <X className="w-4 h-4" />
                  <span>Remove</span>
                </button>
              </div>
            )}
          </div>

          {/* Image Preview Window with Laser Scan during Upload */}
          {previewUrl && (
            <div className="relative rounded-2xl border-2 border-[#D0E2E2] overflow-hidden max-h-96 bg-[#F4F8F8] flex items-center justify-center p-4">
              <img
                src={previewUrl}
                alt="Handwritten note preview"
                className={`max-h-80 object-contain rounded-xl shadow-md transition-all ${
                  uploading ? 'filter contrast-125 brightness-95 opacity-90' : ''
                }`}
              />

              {/* Holographic Laser Scanning Beam when Uploading */}
              {uploading && (
                <>
                  <div className="absolute inset-0 bg-[radial-gradient(#78C0BD_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />
                  
                  {/* Sweeping Laser Line */}
                  <div 
                    className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#78C0BD] to-transparent shadow-[0_0_15px_#78C0BD,0_0_30px_#235D62] animate-bounce pointer-events-none" 
                    style={{ animationDuration: '1.8s' }} 
                  />

                  {/* Corner Targets */}
                  <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-[#78C0BD]" />
                  <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-[#78C0BD]" />
                  <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-[#78C0BD]" />
                  <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-[#78C0BD]" />

                  {/* Live OCR Badge */}
                  <div className="absolute top-5 right-5 bg-white/90 backdrop-blur-md border border-[#78C0BD] px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 animate-pulse">
                    <Sparkles className="w-3.5 h-3.5 text-[#78C0BD]" />
                    <span className="text-[10px] font-mono font-bold text-[#235D62]">Connecting to Scriptly AI...</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Action & Status */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="text-xs font-mono text-[#5A7E81] w-full sm:w-auto">
              {uploading ? (
                <div className="flex items-center space-x-2 text-[#235D62]">
                  <Loader2 className="w-4 h-4 animate-spin text-[#78C0BD]" />
                  <span className="font-semibold">{progressStatus}</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Ready for Scriptly AI vision recognition</span>
                </div>
              )}
            </div>

            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-[#235D62] hover:bg-[#1C4E52] text-white px-8 py-3.5 rounded-full disabled:opacity-50 transition-all font-bold text-xs shadow-lg shadow-[#235D62]/20 hover:scale-105 active:scale-95"
            >
              {uploading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Document...</span>
                </span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#78C0BD]" />
                  <span>Upload & Process with AI</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
