import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { 
  Plus, 
  Sparkles, 
  ChevronDown,
  ArrowRight,
  GraduationCap,
  BookOpen,
  FlaskConical,
  Briefcase,
  CheckCircle2,
  ShieldCheck,
  Pencil,
  MousePointer2,
  ScanLine,
  NotebookPen,
  FileSearch,
  Upload,
  Eye,
  Download,
  FileText,
  Mail,
  Github,
  Twitter,
  Linkedin,
  Heart,
  Zap,
  Globe,
  Send,
  ImageIcon,
  Loader2,
  BarChart3,
  Users,
  FileCheck,
  Clock,
  UploadCloud,
  Cpu,
  CheckCheck,
  Share2,
  Database,
  Camera,
  SwitchCamera,
  X,
  LogOut,
  Menu
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const [activeNav, setActiveNav] = useState('Homepage');
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Demo state
  const [demoStep, setDemoStep] = useState(0); // 0=upload, 1=processing, 2=result
  const [demoFile, setDemoFile] = useState<File | null>(null);
  const [demoPreview, setDemoPreview] = useState<string | null>(null);
  const [demoTypedText, setDemoTypedText] = useState('');
  const [demoError, setDemoError] = useState<string | null>(null);
  const [isDemoCameraActive, setIsDemoCameraActive] = useState<boolean>(false);
  const [demoCameraFacing, setDemoCameraFacing] = useState<'user' | 'environment'>('environment');
  const [demoCameraLoading, setDemoCameraLoading] = useState<boolean>(false);
  const demoIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const demoFileInputRef = useRef<HTMLInputElement | null>(null);
  const demoVideoRef = useRef<HTMLVideoElement | null>(null);
  const demoStreamRef = useRef<MediaStream | null>(null);

  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 50);
  });

  const startDemoCamera = async (facing: 'user' | 'environment' = demoCameraFacing) => {
    try {
      setDemoCameraLoading(true);
      setDemoError(null);
      if (demoStreamRef.current) {
        demoStreamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      demoStreamRef.current = stream;
      if (demoVideoRef.current) {
        demoVideoRef.current.srcObject = stream;
      }
      setIsDemoCameraActive(true);
    } catch (err) {
      setDemoError('Could not access camera. Please allow camera permissions.');
      setIsDemoCameraActive(false);
    } finally {
      setDemoCameraLoading(false);
    }
  };

  const stopDemoCamera = () => {
    if (demoStreamRef.current) {
      demoStreamRef.current.getTracks().forEach(t => t.stop());
      demoStreamRef.current = null;
    }
    setIsDemoCameraActive(false);
  };

  const switchDemoCamera = () => {
    const next = demoCameraFacing === 'environment' ? 'user' : 'environment';
    setDemoCameraFacing(next);
    startDemoCamera(next);
  };

  const captureDemoPhoto = () => {
    if (!demoVideoRef.current) return;
    const video = demoVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `handwriting-snap-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setDemoFile(file);
      setDemoPreview(URL.createObjectURL(blob));
      stopDemoCamera();
      setDemoStep(0);
    }, 'image/jpeg', 0.95);
  };

  // Handle demo file selection
  const handleDemoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setDemoError('Please upload a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setDemoError('File size must be under 10MB.');
      return;
    }
    setDemoError(null);
    setDemoFile(file);
    setDemoPreview(URL.createObjectURL(file));
    setDemoStep(0);
    setDemoTypedText('');
  };

  // Handle real demo processing
  const handleDemoProcess = async () => {
    if (!demoFile) return;
    
    setDemoStep(1);
    setDemoTypedText('');
    setDemoError(null);

    try {
      const formData = new FormData();
      formData.append('file', demoFile);
      
      const response = await api.post('/api/demo-transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      const recognizedText = response.data.recognized_text || '[No text detected in image]';

      // Show real result with typewriter effect
      setDemoStep(2);
      let charIndex = 0;
      const interval = setInterval(() => {
        if (charIndex < recognizedText.length) {
          setDemoTypedText(recognizedText.substring(0, charIndex + 1));
          charIndex++;
        } else {
          clearInterval(interval);
        }
      }, 15);
      demoIntervalRef.current = interval;

    } catch (err: any) {
      console.error('Demo processing error:', err);
      const serverMsg = err.response?.data?.detail || err.message || 'Failed to process image.';
      setDemoStep(0);
      setDemoError(`AI Processing Error: ${serverMsg}`);
    }
  };

  // Reset demo
  const handleDemoReset = () => {
    setDemoStep(0);
    setDemoFile(null);
    if (demoPreview) URL.revokeObjectURL(demoPreview);
    setDemoPreview(null);
    setDemoTypedText('');
    setDemoError(null);
    stopDemoCamera();
    if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
  };

  const navItems = [
    { name: 'Homepage', href: '#' },
    { name: 'Technology', href: '#section-hub' },
    { name: 'Features', href: '#section-features' },
    { name: 'How It Works', href: '#section-works' },
    { name: 'Who It\'s For', href: '#section-audience' },
    { name: 'FAQ', href: '#section-faq' },
  ];

  const faqList = [
    {
      q: "What image formats does Scriptly support?",
      a: "Scriptly supports high-resolution JPEG, PNG, and WebP images up to 10MB. For maximum OCR precision, ensure your photo is well-lit and taken directly above your handwritten page."
    },
    {
      q: "Is my data secure and private?",
      a: "Absolutely. All uploaded documents are encrypted and linked directly to your authenticated Firebase account. Your documents are never shared or used to train public models."
    },
    {
      q: "How accurate is the handwriting recognition engine?",
      a: "Scriptly is powered by advanced Neural Vision AI models, achieving up to 99.4% accuracy on standard handwriting styles. Plus, our built-in split editor lets you edit any word instantly."
    },
    {
      q: "Can I export my digitized transcriptions?",
      a: "Yes! You can instantly export your recognized notes in Plain Text (.txt), Microsoft Word (.docx), or searchable PDF (.pdf) with a single click."
    }
  ];

  return (
    <div className="min-h-screen bg-[#F4F8F8] text-[#183D40] font-sans antialiased selection:bg-[#78C0BD] selection:text-[#143639] overflow-x-hidden">
      
      {/* ================================================================ */}
      {/* NAVBAR                                                           */}
      {/* ================================================================ */}
      <motion.header 
        className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-8 transition-all duration-500"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{ paddingTop: scrolled ? '10px' : '18px' }}
      >
        <motion.div 
          className={`max-w-6xl mx-auto flex items-center justify-between rounded-full px-4 sm:px-6 py-2.5 sm:py-3 transition-all duration-500 relative ${
            scrolled 
              ? 'bg-[#F4F8F8]/90 backdrop-blur-2xl shadow-[0_8px_32px_rgba(24,62,65,0.08)] border border-[#D0E2E2]' 
              : 'bg-[#F4F8F8]/80 backdrop-blur-xl border border-white/60 shadow-sm'
          }`}
          layout
        >
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <motion.div 
              className="w-9 h-9 rounded-full bg-[#235D62] flex items-center justify-center shadow-md shadow-[#235D62]/20"
              whileHover={{ rotate: 90, scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Plus className="w-5 h-5 text-white stroke-[2.5]" />
            </motion.div>
            <motion.span 
              className="font-extrabold text-lg sm:text-xl tracking-tight text-[#183D40] group-hover:text-[#235D62] transition-colors whitespace-nowrap"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              Scriptly <span className="text-[#235D62] font-normal">HTR</span>
            </motion.span>
          </Link>

          {/* Center Navigation Links (Hidden below XL to avoid crowding) */}
          <nav className="hidden xl:flex items-center gap-0.5 bg-[#E8F1F1] backdrop-blur-sm rounded-full p-1 border border-[#D0E2E2]/60">
            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                onClick={() => setActiveNav(item.name)}
                className={`relative px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all duration-300 whitespace-nowrap ${
                  activeNav === item.name 
                    ? 'text-white' 
                    : 'text-[#5A7E81] hover:text-[#183D40]'
                }`}
              >
                {activeNav === item.name && (
                  <motion.div
                    layoutId="activeNavBg"
                    className="absolute inset-0 bg-[#235D62] rounded-full shadow-md shadow-[#235D62]/20"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{item.name}</span>
              </a>
            ))}
          </nav>

          {/* Right Action & Profile Area */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {currentUser ? (
              <>
                <Link 
                  to="/dashboard"
                  className="hidden md:inline-flex items-center gap-1.5 text-xs font-bold text-[#183D40] hover:text-[#235D62] transition-colors px-3 py-1.5 rounded-full hover:bg-[#E8F1F1] whitespace-nowrap"
                >
                  <FileText className="w-3.5 h-3.5 text-[#235D62]" />
                  <span>Dashboard</span>
                </Link>

                <Link
                  to="/upload"
                  className="hidden sm:inline-flex bg-[#235D62] hover:bg-[#1C4E52] text-white font-bold text-xs px-4 py-2 rounded-full items-center gap-1.5 shadow-md shadow-[#235D62]/20 hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload</span>
                </Link>

                {/* Profile Avatar & Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-1 p-1 bg-[#E8F1F1] hover:bg-[#D0E2E2] rounded-full border border-[#D0E2E2] transition-all"
                    title={currentUser.email || 'User Profile'}
                  >
                    <div className="w-7 h-7 rounded-full bg-[#235D62] text-white text-xs font-bold flex items-center justify-center font-mono shadow-sm">
                      {currentUser.email ? currentUser.email[0].toUpperCase() : 'U'}
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-[#5A7E81] transition-transform duration-200 mr-0.5 hidden sm:block ${userDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Profile Dropdown Menu */}
                  <AnimatePresence>
                    {userDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-56 bg-white border border-[#D0E2E2] rounded-2xl shadow-xl p-3 z-50 space-y-2 text-left"
                      >
                        <div className="px-2 py-1.5 border-b border-[#D0E2E2]/60 pb-2">
                          <p className="text-[10px] font-mono text-[#5A7E81] uppercase font-bold tracking-wider">Signed in as</p>
                          <p className="text-xs font-bold text-[#183D40] truncate mt-0.5">{currentUser.email}</p>
                        </div>
                        <div className="space-y-1">
                          <Link
                            to="/dashboard"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2 px-2 py-2 text-xs font-bold text-[#183D40] hover:bg-[#EBF3F3] hover:text-[#235D62] rounded-xl transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#235D62]" />
                            <span>My Documents</span>
                          </Link>
                          <Link
                            to="/upload"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2 px-2 py-2 text-xs font-bold text-[#183D40] hover:bg-[#EBF3F3] hover:text-[#235D62] rounded-xl transition-colors"
                          >
                            <Upload className="w-3.5 h-3.5 text-[#235D62]" />
                            <span>Upload New Note</span>
                          </Link>
                        </div>
                        <div className="border-t border-[#D0E2E2]/60 pt-1">
                          <button
                            onClick={async () => {
                              setUserDropdownOpen(false);
                              try {
                                await logout();
                              } catch (e) {
                                console.error('Logout failed:', e);
                              }
                            }}
                            className="w-full flex items-center gap-2 px-2 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="hidden sm:inline-block text-xs font-bold text-[#183D40] hover:text-[#235D62] transition-colors px-3 py-2 whitespace-nowrap"
                >
                  Log In
                </Link>

                <Link
                  to="/register"
                  className="hidden sm:inline-flex bg-[#235D62] hover:bg-[#1C4E52] text-white font-bold text-xs px-4 sm:px-5 py-2 sm:py-2.5 rounded-full items-center gap-1.5 shadow-md shadow-[#235D62]/20 hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}

            {/* Mobile Hamburger Toggle (XL and below) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 text-[#183D40] hover:bg-[#E8F1F1] rounded-full transition-colors ml-1"
              title="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-[#235D62]" /> : <Menu className="w-5 h-5 text-[#235D62]" />}
            </button>
          </div>
        </motion.div>

        {/* Mobile / Tablet Collapsible Menu Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="xl:hidden max-w-6xl mx-auto mt-2 bg-white/95 backdrop-blur-2xl border border-[#D0E2E2] rounded-3xl p-5 shadow-2xl space-y-4"
            >
              <div className="grid grid-cols-2 gap-2 pb-3 border-b border-[#D0E2E2]">
                {navItems.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    onClick={() => {
                      setActiveNav(item.name);
                      setMobileMenuOpen(false);
                    }}
                    className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors ${
                      activeNav === item.name
                        ? 'bg-[#235D62] text-white'
                        : 'text-[#183D40] hover:bg-[#EBF3F3]'
                    }`}
                  >
                    {item.name}
                  </a>
                ))}
              </div>

              {currentUser ? (
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#235D62] text-white text-xs font-bold flex items-center justify-center font-mono">
                      {currentUser.email ? currentUser.email[0].toUpperCase() : 'U'}
                    </div>
                    <span className="text-xs font-bold text-[#183D40] truncate max-w-[160px]">{currentUser.email}</span>
                  </div>
                  <button
                    onClick={async () => {
                      setMobileMenuOpen(false);
                      try {
                        await logout();
                      } catch (e) {
                        console.error('Logout error:', e);
                      }
                    }}
                    className="text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-1">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 text-center py-2.5 text-xs font-bold text-[#183D40] bg-[#EBF3F3] rounded-full"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 text-center py-2.5 text-xs font-bold text-white bg-[#235D62] rounded-full shadow-md"
                  >
                    Get Started Free
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <section className="relative pt-36 pb-24 md:pt-44 md:pb-32 overflow-hidden bg-[#F4F8F8]">
        {/* ─── Bold rotating arc segments behind heading (reference style) ─── */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginTop: '40px' }}>
          {/* Outer bold arc — large, slow rotation */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: '750px',
              height: '750px',
              background: 'conic-gradient(from 200deg, transparent 0deg, rgba(120, 192, 189, 0.25) 40deg, rgba(120, 192, 189, 0.4) 80deg, rgba(120, 192, 189, 0.25) 120deg, transparent 160deg)',
              mask: 'radial-gradient(farthest-side, transparent calc(100% - 45px), #000 calc(100% - 45px) calc(100% - 2px), transparent calc(100%))',
              WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 45px), #000 calc(100% - 45px) calc(100% - 2px), transparent calc(100%))',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />
          {/* Middle bold arc — medium, counter-rotation */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: '580px',
              height: '580px',
              background: 'conic-gradient(from 30deg, transparent 0deg, rgba(120, 192, 189, 0.18) 50deg, rgba(120, 192, 189, 0.35) 100deg, rgba(120, 192, 189, 0.18) 150deg, transparent 200deg)',
              mask: 'radial-gradient(farthest-side, transparent calc(100% - 38px), #000 calc(100% - 38px) calc(100% - 2px), transparent calc(100%))',
              WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 38px), #000 calc(100% - 38px) calc(100% - 2px), transparent calc(100%))',
            }}
            animate={{ rotate: -360 }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          />
          {/* Inner subtle arc — smallest, gentle rotation */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: '420px',
              height: '420px',
              background: 'conic-gradient(from 120deg, transparent 0deg, rgba(35, 93, 98, 0.12) 30deg, rgba(35, 93, 98, 0.22) 60deg, rgba(35, 93, 98, 0.12) 90deg, transparent 130deg)',
              mask: 'radial-gradient(farthest-side, transparent calc(100% - 28px), #000 calc(100% - 28px) calc(100% - 2px), transparent calc(100%))',
              WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 28px), #000 calc(100% - 28px) calc(100% - 2px), transparent calc(100%))',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          />
          {/* Soft radial glow behind the arcs */}
          <div
            className="absolute rounded-full"
            style={{
              width: '550px',
              height: '550px',
              background: 'radial-gradient(circle, rgba(120, 192, 189, 0.08) 0%, transparent 70%)',
              filter: 'blur(60px)',
            }}
          />
        </div>

        {/* ─── Scattered decorative dots ─── */}
        <motion.div className="absolute top-[18%] left-[8%] w-2.5 h-2.5 rounded-full bg-[#78C0BD]/40" animate={{ y: [0, -10, 0] }} transition={{ duration: 3, repeat: Infinity }} />
        <motion.div className="absolute top-[25%] right-[12%] w-2 h-2 rounded-full bg-[#235D62]/30" animate={{ y: [0, 8, 0] }} transition={{ duration: 4, repeat: Infinity }} />
        <motion.div className="absolute bottom-[20%] left-[15%] w-3 h-3 rounded-full bg-[#78C0BD]/20" animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 3.5, repeat: Infinity }} />
        <motion.div className="absolute top-[30%] left-[25%] w-1.5 h-1.5 rounded-full bg-[#235D62]/25" animate={{ y: [0, -6, 0] }} transition={{ duration: 2.5, repeat: Infinity }} />
        <motion.div className="absolute bottom-[25%] right-[18%] w-2 h-2 rounded-full bg-[#78C0BD]/30" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 4, repeat: Infinity }} />

        {/* ─── Small decorative cross/plus shapes ─── */}
        <motion.div className="absolute top-[22%] right-[25%] text-[#235D62]/20 text-xl font-light" animate={{ rotate: [0, 90, 0] }} transition={{ duration: 6, repeat: Infinity }}>+</motion.div>
        <motion.div className="absolute bottom-[28%] left-[22%] text-[#78C0BD]/25 text-lg font-light" animate={{ rotate: [0, -90, 0] }} transition={{ duration: 5, repeat: Infinity }}>+</motion.div>

        {/* ─── Floating Icons (Responsively scaled & positioned in safe corners) ─── */}
        <motion.div
          className="absolute top-28 sm:top-36 left-2 sm:left-8 md:left-14 w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-white rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg shadow-[#235D62]/10 flex items-center justify-center border border-[#D0E2E2]/80 pointer-events-none z-10"
          animate={{ y: [0, -10, 0], rotate: [0, -8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <Pencil className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-[#235D62]" />
        </motion.div>

        <motion.div
          className="absolute top-28 sm:top-32 right-2 sm:right-8 md:right-14 w-9 h-9 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-[#235D62] rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg shadow-[#235D62]/25 flex items-center justify-center pointer-events-none z-10"
          animate={{ y: [0, 10, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <MousePointer2 className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
        </motion.div>

        <motion.div
          className="absolute bottom-10 sm:bottom-20 left-2 sm:left-8 md:left-14 w-9 h-9 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-[#78C0BD]/20 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-md shadow-[#78C0BD]/10 flex items-center justify-center border border-[#78C0BD]/30 pointer-events-none z-10"
          animate={{ y: [0, 8, 0], rotate: [0, 6, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          <ScanLine className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-[#235D62]" />
        </motion.div>

        <motion.div
          className="absolute bottom-10 sm:bottom-20 right-2 sm:right-8 md:right-14 w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-white rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg shadow-[#235D62]/10 flex items-center justify-center border border-[#D0E2E2]/80 pointer-events-none z-10"
          animate={{ y: [0, -8, 0], rotate: [0, -5, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <NotebookPen className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-[#78C0BD]" />
        </motion.div>

        <motion.div
          className="hidden sm:flex absolute top-[40%] right-3 sm:right-6 w-10 h-10 sm:w-12 sm:h-12 bg-[#183E41] rounded-xl shadow-md shadow-[#183E41]/20 items-center justify-center pointer-events-none z-10"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <FileSearch className="w-4 h-4 sm:w-5 sm:h-5 text-[#78C0BD]" />
        </motion.div>

        {/* ─── Center Content ─── */}
        <div className="relative z-20 max-w-4xl mx-auto px-8 sm:px-12 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-[#E3F2F2] border border-[#BDE0DF] px-3.5 sm:px-4 py-1.5 rounded-full text-[#183D40] font-mono text-[10px] sm:text-xs font-bold shadow-sm mb-6 sm:mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-[#78C0BD] animate-pulse" />
            <span>Next-Gen HTR AI • Transcribe Handwritten Documents</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#183D40] leading-[1.1] mb-6"
          >
            The Best{' '}
            <br className="hidden sm:block" />
            Personal{' '}
            <span className="relative inline-block">
              <span className="relative z-10 text-[#235D62]">AI</span>
              <svg className="absolute -inset-1 w-[130%] h-[150%] text-[#78C0BD] pointer-events-none z-0 left-[-15%] top-[-25%]" viewBox="0 0 100 60" fill="none">
                <ellipse cx="50" cy="30" rx="46" ry="25" stroke="currentColor" strokeWidth="2" className="opacity-60" />
              </svg>
            </span>{' '}
            <br className="hidden sm:block" />
            Handwriting{' '}
            <br className="hidden sm:block" />
            <span className="text-[#78C0BD]">Tool</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-sm sm:text-base md:text-lg text-[#5A7E81] max-w-xl mx-auto leading-relaxed font-normal mb-10"
          >
            Save hours every day. The world's first AI handwriting recognition tool that works across your notes, documents, and lab journals.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            {currentUser ? (
              <>
                <Link
                  to="/dashboard"
                  className="bg-[#235D62] hover:bg-[#1C4E52] text-white font-bold text-sm px-8 py-4 rounded-full shadow-lg shadow-[#235D62]/25 flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95"
                >
                  <FileText className="w-4 h-4" />
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/upload"
                  className="bg-white border-2 border-[#235D62] text-[#235D62] hover:bg-[#E8F1F1] font-bold text-sm px-8 py-4 rounded-full shadow-sm flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Note</span>
                </Link>
              </>
            ) : (
              <Link
                to="/register"
                className="bg-[#235D62] hover:bg-[#1C4E52] text-white font-bold text-sm px-10 py-4 rounded-full shadow-lg shadow-[#235D62]/25 flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95"
              >
                <span>Get started</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </motion.div>

          {/* ─── Trust badges below CTA ─── */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 pt-6 sm:pt-8 mt-6 sm:mt-8 border-t border-[#D0E2E2]/50 text-[11px] sm:text-xs font-mono text-[#5A7E81]"
          >
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#78C0BD]" />
              <span>Free to Use</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#235D62]" />
              <span>Encrypted Cloud Storage</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#78C0BD]" />
              <span>99.4% Accuracy</span>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="section-features" className="w-full max-w-7xl mx-auto px-4 sm:px-12 py-12 sm:py-20">
        <div className="text-left mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#183D40] tracking-tight">
            What we do
          </h2>
          <p className="text-xs sm:text-base text-[#5A7E81] mt-2 sm:mt-3 max-w-xl">Powerful AI tools to transform handwritten documents into editable digital text.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left column — 3 stacked feature cards */}
          <div className="space-y-6">
            {[
              { icon: <ScanLine className="w-5 h-5" />, title: "Multi-Format OCR", desc: "High-precision handwriting and printed text recognition for JPEG, PNG, and WebP documents up to 10MB.", symbol: "▲▼▲" },
              { icon: <Eye className="w-5 h-5" />, title: "Side-by-Side Editor", desc: "Real-time split-screen verification interface to edit, proofread, and format extracted notes side by side.", symbol: "■■■" },
              { icon: <Download className="w-5 h-5" />, title: "Multi-Format Export", desc: "Instant one-click exports to Plain Text (.txt), Word (.docx), and PDF (.pdf) for professional workflows.", symbol: "●⊙●" }
            ].map((card, i) => (
              <motion.div key={i} whileHover={{ y: -4, scale: 1.01 }} className="bg-[#183E41] text-white rounded-[28px] p-7 sm:p-8 shadow-xl shadow-[#1C4F53]/20 flex items-start gap-5 relative overflow-hidden border border-[#327379] group cursor-pointer transition-all">
                <div className="w-12 h-12 rounded-2xl bg-[#78C0BD]/15 flex items-center justify-center flex-shrink-0 text-[#78C0BD] group-hover:bg-[#78C0BD]/25 transition-colors">
                  {card.icon}
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">{card.title}</h3>
                    <ArrowRight className="w-4 h-4 text-[#78C0BD]/50 group-hover:text-[#78C0BD] group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-xs sm:text-sm text-[#D0E6E5]/80 leading-relaxed">{card.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Right column — Real Interactive Demo card */}
          <motion.div 
            whileHover={{ y: -4 }}
            className="bg-white border-2 border-[#D0E2E2] rounded-[32px] p-7 sm:p-8 shadow-xl relative overflow-hidden flex flex-col"
          >
            {/* Hidden file input */}
            <input 
              ref={demoFileInputRef}
              type="file" 
              accept="image/jpeg,image/png,image/webp" 
              onChange={handleDemoFileSelect}
              className="hidden" 
            />

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#235D62] flex items-center justify-center">
                  <Zap className="w-5 h-5 text-[#78C0BD]" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-[#183D40]">Try It Live</h3>
                  <p className="text-[10px] font-mono text-[#5A7E81]">Upload your handwriting • Get instant results</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LIVE
              </span>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center gap-0 mb-5">
              {[
                { label: 'Select Image', icon: <ImageIcon className="w-3.5 h-3.5" /> },
                { label: 'AI Processing', icon: <Cpu className="w-3.5 h-3.5" /> },
                { label: 'Result', icon: <FileText className="w-3.5 h-3.5" /> }
              ].map((s, i) => (
                <React.Fragment key={i}>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all duration-300 ${
                    (demoStep === 2 && i < 2) || (demoStep > 0 && i === 0)
                      ? 'bg-[#235D62] text-white' 
                      : (demoStep === 1 && i === 1) || (demoStep === 2 && i === 2) || (demoStep === 0 && i === 0 && demoFile)
                        ? 'bg-[#78C0BD]/20 text-[#235D62] ring-2 ring-[#78C0BD]/40' 
                        : 'bg-[#F4F8F8] text-[#5A7E81]'
                  }`}>
                    {s.icon}
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                  {i < 2 && <div className={`flex-1 h-0.5 mx-1 rounded-full transition-all duration-500 ${
                    (demoStep === 2 && i < 2) || (demoStep >= 1 && i === 0) ? 'bg-[#235D62]' : 'bg-[#D0E2E2]'
                  }`} />}
                </React.Fragment>
              ))}
            </div>

            {/* Error display */}
            {demoError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-xs text-red-700 font-medium">
                {demoError}
              </div>
            )}

            {/* Demo Content Area */}
            <div className="flex-1 bg-[#F4F8F8] border border-[#D0E2E2] rounded-2xl mb-5 min-h-[220px] relative overflow-hidden">
              <AnimatePresence mode="wait">
                {/* Live Camera viewfinder */}
                {isDemoCameraActive && (
                  <motion.div key="camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-3 h-full flex flex-col">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#D0E2E2]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                        <span className="text-[11px] font-bold text-[#183D40]">Webcam Active</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={switchDemoCamera}
                          className="text-[10px] font-bold text-[#235D62] bg-[#EBF3F3] hover:bg-[#D0E2E2] px-2.5 py-1 rounded-full flex items-center gap-1"
                        >
                          <SwitchCamera className="w-3 h-3" />
                          <span>Flip</span>
                        </button>
                        <button
                          onClick={stopDemoCamera}
                          className="text-[#5A7E81] hover:text-red-600 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="relative rounded-xl overflow-hidden bg-black flex-1 min-h-[160px] flex items-center justify-center">
                      <video ref={demoVideoRef} autoPlay playsInline muted className="w-full h-full object-contain max-h-[170px]" />
                    </div>
                    <button
                      onClick={captureDemoPhoto}
                      className="mt-2.5 w-full bg-[#235D62] hover:bg-[#1C4E52] text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-md"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Take Snapshot</span>
                    </button>
                  </motion.div>
                )}

                {/* Empty State */}
                {demoStep === 0 && !demoFile && !isDemoCameraActive && (
                  <motion.div 
                    key="empty" 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center h-full text-center py-8"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-[#235D62]/10 flex items-center justify-center mb-3 border-2 border-dashed border-[#235D62]/20">
                      <UploadCloud className="w-6 h-6 text-[#235D62]" />
                    </div>
                    <p className="text-sm font-bold text-[#183D40] mb-1">Select or Snap a Handwritten Note</p>
                    <p className="text-[11px] text-[#5A7E81] max-w-[220px] mb-4">Upload a document scan or take a live photo with your camera</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => demoFileInputRef.current?.click()}
                        className="bg-white border border-[#D0E2E2] hover:border-[#235D62] text-[#235D62] font-bold text-xs px-4 py-2 rounded-full shadow-sm flex items-center gap-1.5 transition-all hover:scale-105"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload File</span>
                      </button>
                      <button
                        onClick={() => startDemoCamera()}
                        disabled={demoCameraLoading}
                        className="bg-[#235D62] hover:bg-[#1C4E52] text-white font-bold text-xs px-4 py-2 rounded-full shadow-sm flex items-center gap-1.5 transition-all hover:scale-105"
                      >
                        {demoCameraLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                        <span>Use Camera</span>
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Preview State */}
                {demoStep === 0 && demoFile && demoPreview && !isDemoCameraActive && (
                  <motion.div 
                    key="preview" 
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    className="p-3 h-full"
                  >
                    <div className="relative rounded-xl overflow-hidden border border-[#D0E2E2] bg-white h-full">
                      <img src={demoPreview} alt="Preview" className="w-full h-full object-contain max-h-[200px]" />
                      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 text-[10px] font-bold text-[#235D62] border border-[#D0E2E2] flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" />
                        {demoFile.name.length > 20 ? demoFile.name.substring(0, 17) + '...' : demoFile.name}
                      </div>
                      <div className="absolute bottom-2 right-2 flex gap-1.5">
                        <button 
                          onClick={(e) => { e.stopPropagation(); demoFileInputRef.current?.click(); }}
                          className="bg-[#235D62] text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg hover:bg-[#1C4E52] transition-colors"
                        >
                          Change File
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); startDemoCamera(); }}
                          className="bg-white text-[#235D62] border border-[#D0E2E2] text-[10px] font-bold px-2.5 py-1.5 rounded-lg hover:bg-[#EBF3F3] transition-colors flex items-center gap-1"
                        >
                          <Camera className="w-3 h-3" />
                          <span>Camera</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
                {demoStep === 1 && (
                  <motion.div 
                    key="process" 
                    initial={{ opacity: 0, scale: 0.96 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 0.96 }} 
                    className="p-4 flex flex-col items-center justify-center min-h-[260px] relative overflow-hidden"
                  >
                    {/* Background Tech Grid & Glow */}
                    <div className="absolute inset-0 bg-[radial-gradient(#78C0BD_1px,transparent_1px)] [background-size:16px_16px] opacity-25 pointer-events-none" />
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#78C0BD]/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[#235D62]/15 rounded-full blur-2xl pointer-events-none" />

                    {/* Image Laser Scanner View */}
                    <div className="relative w-full max-w-[280px] h-32 rounded-xl overflow-hidden border-2 border-[#78C0BD]/50 bg-black/5 shadow-inner mb-4 flex items-center justify-center">
                      {demoPreview ? (
                        <img 
                          src={demoPreview} 
                          alt="Processing" 
                          className="w-full h-full object-contain filter contrast-125 brightness-95 opacity-85" 
                        />
                      ) : (
                        <div className="flex items-center justify-center text-[#5A7E81]">
                          <NotebookPen className="w-8 h-8 opacity-40" />
                        </div>
                      )}

                      {/* Glowing Laser Sweep Line */}
                      <motion.div
                        className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#78C0BD] to-transparent shadow-[0_0_12px_#78C0BD,0_0_24px_#235D62]"
                        animate={{
                          top: ['0%', '100%', '0%']
                        }}
                        transition={{
                          duration: 2.2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />

                      {/* Laser Beam Gradient Overlay */}
                      <motion.div
                        className="absolute left-0 right-0 h-12 bg-gradient-to-b from-[#78C0BD]/20 to-transparent pointer-events-none"
                        animate={{
                          top: ['-20%', '80%', '-20%']
                        }}
                        transition={{
                          duration: 2.2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />

                      {/* Animated OCR Bounding Detection Boxes */}
                      <motion.div
                        className="absolute top-3 left-4 w-20 h-6 border border-[#78C0BD] bg-[#78C0BD]/15 rounded flex items-center justify-center"
                        animate={{ opacity: [0, 1, 0.4, 1, 0] }}
                        transition={{ duration: 1.8, repeat: Infinity }}
                      >
                        <span className="text-[8px] font-mono text-[#183D40] font-bold">OCR: Text</span>
                      </motion.div>

                      <motion.div
                        className="absolute bottom-4 right-5 w-28 h-6 border border-[#78C0BD] bg-[#78C0BD]/15 rounded flex items-center justify-center"
                        animate={{ opacity: [0.3, 0, 1, 0.5, 0.3] }}
                        transition={{ duration: 2.1, repeat: Infinity, delay: 0.4 }}
                      >
                        <span className="text-[8px] font-mono text-[#183D40] font-bold">99.4% Match</span>
                      </motion.div>

                      {/* Live scanning corner markers */}
                      <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-[#78C0BD]" />
                      <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-[#78C0BD]" />
                      <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-[#78C0BD]" />
                      <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-[#78C0BD]" />
                    </div>

                    {/* Status & Processing Steps */}
                    <div className="text-center space-y-1 z-10">
                      <div className="flex items-center justify-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#78C0BD] animate-spin" />
                        <h4 className="text-sm font-extrabold text-[#183D40] tracking-tight">Scriptly Neural Vision AI</h4>
                      </div>
                      <motion.p 
                        className="text-[11px] font-mono text-[#235D62] font-bold"
                        animate={{ opacity: [0.6, 1, 0.6] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        ⚡ Decoding handwriting strokes & spatial layout...
                      </motion.p>
                    </div>

                    {/* High-Tech Shimmer Progress Bar */}
                    <div className="w-56 h-2 bg-[#D0E2E2] rounded-full mt-3.5 overflow-hidden p-0.5 shadow-inner">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-[#235D62] via-[#78C0BD] to-[#235D62] rounded-full shadow-[0_0_8px_#78C0BD]"
                        initial={{ width: '10%' }}
                        animate={{ width: ['15%', '85%', '95%'] }}
                        transition={{ duration: 4, ease: "easeInOut", repeat: Infinity }}
                      />
                    </div>
                  </motion.div>
                )}
                {demoStep === 2 && (
                  <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-3 h-full">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-bold text-emerald-700">Recognition Complete</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 h-[calc(100%-32px)]">
                      {demoPreview && (
                        <div className="bg-white rounded-xl p-2 border border-[#D0E2E2] overflow-hidden">
                          <div className="text-[9px] font-bold text-[#5A7E81] uppercase mb-1.5 tracking-wider px-1">Your Image</div>
                          <img src={demoPreview} alt="Input" className="w-full h-auto max-h-[140px] object-contain rounded-lg" />
                        </div>
                      )}
                      <div className="bg-white rounded-xl p-3 border border-[#D0E2E2] overflow-auto">
                        <div className="text-[9px] font-bold text-[#235D62] uppercase mb-1.5 tracking-wider">Recognized Text</div>
                        <div className="text-xs text-[#183D40] leading-relaxed font-mono whitespace-pre-wrap">
                          {demoTypedText}
                          <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.5, repeat: Infinity }} className="text-[#235D62]">|</motion.span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action Button */}
            {demoStep === 0 && !demoFile && !isDemoCameraActive && (
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => demoFileInputRef.current?.click()}
                  className="w-full bg-white border-2 border-[#235D62] text-[#235D62] font-bold text-xs sm:text-sm py-3.5 rounded-full shadow-sm transition-all flex items-center justify-center gap-2 hover:bg-[#EBF3F3] active:scale-95"
                >
                  <Upload className="w-4 h-4" /> Upload Image
                </button>
                <button 
                  onClick={() => startDemoCamera()}
                  className="w-full bg-[#235D62] hover:bg-[#1C4E52] text-white font-bold text-xs sm:text-sm py-3.5 rounded-full shadow-md transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95"
                >
                  <Camera className="w-4 h-4" /> Snap Photo
                </button>
              </div>
            )}
            {demoStep === 0 && demoFile && !isDemoCameraActive && (
              <button 
                onClick={handleDemoProcess}
                className="w-full bg-[#235D62] hover:bg-[#1C4E52] text-white font-bold text-sm py-3.5 rounded-full shadow-md transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95"
              >
                <Zap className="w-4 h-4" /> Process with AI
              </button>
            )}
            {demoStep === 1 && (
              <button disabled className="w-full bg-[#D0E2E2] text-[#5A7E81] font-bold text-sm py-3.5 rounded-full shadow-md flex items-center justify-center gap-2 cursor-not-allowed">
                <Loader2 className="w-4 h-4 animate-spin" /> Processing...
              </button>
            )}
            {demoStep === 2 && (
              <div className="flex gap-3">
                <button 
                  onClick={handleDemoReset}
                  className="flex-1 bg-[#EBF3F3] hover:bg-[#D0E2E2] text-[#235D62] font-bold text-sm py-3.5 rounded-full shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  Try Another Image
                </button>
                <Link 
                  to={currentUser ? '/upload' : '/register'}
                  className="flex-1 bg-[#235D62] hover:bg-[#1C4E52] text-white font-bold text-sm py-3.5 rounded-full shadow-md transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
                >
                  Full Experience <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      <section id="section-works" className="w-full bg-[#EBF3F3] py-24 border-y border-[#D0E2E2]/60">
        <div className="max-w-7xl mx-auto px-6 sm:px-12">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-16 gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-[#D0E2E2] px-3 py-1 rounded-full text-[#235D62] text-[10px] font-bold uppercase tracking-wider mb-4">
                <Sparkles className="w-3 h-3" />
                Workflow
              </div>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-[#183D40] tracking-tight">How it works</h2>
              <p className="text-sm text-[#5A7E81] mt-2 max-w-md">From photo to polished text in under 30 seconds.</p>
            </div>
            <Link to={currentUser ? '/upload' : '/register'} className="inline-flex items-center gap-2 bg-[#235D62] hover:bg-[#1C4E52] text-white font-bold text-xs px-6 py-3 rounded-full shadow-md hover:scale-105 active:scale-95 transition-all self-start sm:self-auto">
              Try it now <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Steps Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              { step: "01", title: "Upload", desc: "Drag & drop or select handwritten document photos.", icon: <UploadCloud className="w-6 h-6" />, color: "bg-[#235D62]" },
              { step: "02", title: "AI Analysis", desc: "Scriptly Neural Vision parses every stroke with 99.4% accuracy.", icon: <Cpu className="w-6 h-6" />, color: "bg-[#1C4E52]" },
              { step: "03", title: "Verify", desc: "Compare original and recognized text side by side in the editor.", icon: <CheckCheck className="w-6 h-6" />, color: "bg-[#235D62]" },
              { step: "04", title: "Export", desc: "Download as TXT, Word DOCX, or searchable PDF instantly.", icon: <Share2 className="w-6 h-6" />, color: "bg-[#1C4E52]" },
              { step: "05", title: "Cloud Sync", desc: "All transcriptions saved to your private dashboard.", icon: <Database className="w-6 h-6" />, color: "bg-[#235D62]" }
            ].map((s, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -6 }}
                className="bg-white rounded-[24px] p-6 shadow-lg border border-[#D0E2E2] relative group hover:shadow-xl transition-all"
              >
                {/* Step number */}
                <div className="absolute -top-3 -right-2 w-8 h-8 rounded-full bg-[#78C0BD] text-[#143639] text-xs font-extrabold flex items-center justify-center shadow-md">
                  {s.step}
                </div>
                {/* Icon */}
                <div className={`w-12 h-12 rounded-2xl ${s.color} flex items-center justify-center text-white mb-4 shadow-md group-hover:scale-110 transition-transform`}>
                  {s.icon}
                </div>
                <h3 className="text-base font-extrabold text-[#183D40] mb-2">{s.title}</h3>
                <p className="text-xs text-[#5A7E81] leading-relaxed">{s.desc}</p>
                {/* Connecting arrow (hidden on last) */}
                {i < 4 && (
                  <div className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 z-10">
                    <ArrowRight className="w-4 h-4 text-[#78C0BD]" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Statistics / Trust Section */}
      <section className="w-full max-w-7xl mx-auto px-6 sm:px-12 py-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { value: "99.4%", label: "Recognition Accuracy", icon: <BarChart3 className="w-5 h-5" />, accent: "text-[#235D62]" },
            { value: "<30s", label: "Processing Time", icon: <Clock className="w-5 h-5" />, accent: "text-[#78C0BD]" },
            { value: "10K+", label: "Documents Processed", icon: <FileCheck className="w-5 h-5" />, accent: "text-[#235D62]" },
            { value: "500+", label: "Active Users", icon: <Users className="w-5 h-5" />, accent: "text-[#78C0BD]" }
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white border border-[#D0E2E2] rounded-[28px] p-6 sm:p-8 text-center shadow-lg hover:shadow-xl transition-all group"
            >
              <div className={`w-12 h-12 rounded-2xl bg-[#EBF3F3] flex items-center justify-center mx-auto mb-4 ${stat.accent} group-hover:scale-110 transition-transform`}>
                {stat.icon}
              </div>
              <div className={`text-3xl sm:text-4xl font-extrabold ${stat.accent} mb-1`}>{stat.value}</div>
              <div className="text-xs text-[#5A7E81] font-medium">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="section-audience" className="w-full max-w-7xl mx-auto px-6 sm:px-12 py-16">
        <div className="text-left mb-12"><h2 className="text-3xl sm:text-4xl font-extrabold text-[#183D40]">Designed for Everyone Who Writes</h2></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: <GraduationCap />, title: "Students", desc: "Notes to digital text." },
            { icon: <BookOpen />, title: "Educators", desc: "Digitize lesson plans." },
            { icon: <FlaskConical />, title: "Researchers", desc: "Transcribe log files." },
            { icon: <Briefcase />, title: "Professionals", desc: "Meeting notes." }
          ].map((a, i) => (
            <div key={i} className="bg-white border border-[#D0E2E2] rounded-3xl p-6 shadow-sm">
              <div className="w-10 h-10 rounded-2xl bg-[#EBF3F3] flex items-center justify-center mb-4">{a.icon}</div>
              <h3 className="text-base font-bold text-[#183D40] mb-2">{a.title}</h3>
              <p className="text-xs text-[#5A7E81]">{a.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="section-faq" className="w-full max-w-4xl mx-auto px-6 sm:px-12 py-16">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#183D40] mb-12">FAQ</h2>
        <div className="space-y-4">
          {faqList.map((item, index) => (
            <div key={index} className="bg-white border border-[#D0E2E2] rounded-2xl p-6">
              <button onClick={() => setOpenFaq(openFaq === index ? null : index)} className="w-full flex items-center justify-between font-bold">{item.q} <ChevronDown /></button>
              {openFaq === index && <p className="text-xs sm:text-sm text-[#5A7E81] mt-4">{item.a}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="w-full max-w-5xl mx-auto px-6 sm:px-12 my-16">
        <div className="bg-[#183E41] text-white border border-[#327379] rounded-[36px] p-10 sm:p-16 text-center shadow-2xl">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4">Ready to Digitize Your Notes?</h2>
          <p className="text-sm text-[#D0E6E5] max-w-md mx-auto mb-8">
            Experience real-time AI handwriting recognition with Scriptly Neural Vision.
          </p>
          {currentUser ? (
            <Link to="/dashboard" className="bg-[#78C0BD] hover:bg-[#68B3B0] text-[#143639] font-bold px-9 py-4 rounded-full inline-flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all">
              <span>Go to Your Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link to="/register" className="bg-[#78C0BD] hover:bg-[#68B3B0] text-[#143639] font-bold px-9 py-4 rounded-full inline-block shadow-lg hover:scale-105 active:scale-95 transition-all">
              Get Started Free
            </Link>
          )}
        </div>
      </section>

      <footer className="w-full max-w-7xl mx-auto px-3 sm:px-8 mt-16 sm:mt-24 mb-6 sm:mb-8">
        <div className="bg-[#143639] text-white rounded-[28px] sm:rounded-[40px] pt-10 sm:pt-16 pb-6 sm:pb-8 px-5 sm:px-16 border border-[#1C4F53] relative overflow-hidden">
          {/* Decorative background glow */}
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#78C0BD]/5 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#235D62]/10 rounded-full blur-[100px] pointer-events-none" />

          {/* Top section - Brand & Newsletter */}
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 mb-14">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-[#235D62] flex items-center justify-center shadow-lg shadow-[#235D62]/30">
                  <Plus className="w-5 h-5 text-white stroke-[2.5]" />
                </div>
                <span className="font-extrabold text-xl tracking-tight">Scriptly <span className="text-[#78C0BD] font-normal">HTR</span></span>
              </div>
              <p className="text-sm text-[#96C7C5] leading-relaxed max-w-sm">
                Transform handwritten documents into editable digital text with AI-powered precision. Built for students, researchers, and professionals.
              </p>
              <div className="flex items-center gap-3 pt-2">
                {[
                  { icon: <Twitter className="w-4 h-4" />, href: '#' },
                  { icon: <Github className="w-4 h-4" />, href: '#' },
                  { icon: <Linkedin className="w-4 h-4" />, href: '#' },
                  { icon: <Globe className="w-4 h-4" />, href: '#' }
                ].map((social, i) => (
                  <a key={i} href={social.href} className="w-9 h-9 rounded-full bg-[#1C4F53] hover:bg-[#78C0BD]/20 flex items-center justify-center text-[#78C0BD] hover:text-white transition-all hover:scale-110">
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Newsletter */}
            <div className="flex flex-col justify-center">
              <h4 className="text-base font-bold text-white mb-2">Stay in the loop</h4>
              <p className="text-xs text-[#96C7C5] mb-4">Get updates on new features and handwriting AI research.</p>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A7E81]" />
                  <input 
                    type="email" 
                    placeholder="your@email.com" 
                    className="w-full bg-[#1C4F53] border border-[#327379] rounded-full pl-10 pr-4 py-3 text-sm text-white placeholder-[#5A7E81] focus:outline-none focus:ring-2 focus:ring-[#78C0BD]/40 focus:border-[#78C0BD] transition-all"
                  />
                </div>
                <button className="bg-[#78C0BD] hover:bg-[#68B3B0] text-[#143639] font-bold text-sm px-6 py-3 rounded-full flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[#78C0BD]/20">
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Subscribe</span>
                </button>
              </div>
            </div>
          </div>

          {/* Links Grid */}
          <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-8 py-10 border-y border-[#1C4F53]">
            <div>
              <h5 className="text-xs font-bold text-[#78C0BD] uppercase tracking-wider mb-4">Product</h5>
              <ul className="space-y-2.5">
                {['Upload & Scan', 'Side-by-Side Editor', 'Export Tools', 'Dashboard'].map((item) => (
                  <li key={item}><Link to="/upload" className="text-sm text-[#96C7C5] hover:text-white transition-colors">{item}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="text-xs font-bold text-[#78C0BD] uppercase tracking-wider mb-4">Resources</h5>
              <ul className="space-y-2.5">
                {['Documentation', 'API Reference', 'Changelog', 'Status Page'].map((item) => (
                  <li key={item}><a href="#" className="text-sm text-[#96C7C5] hover:text-white transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="text-xs font-bold text-[#78C0BD] uppercase tracking-wider mb-4">Company</h5>
              <ul className="space-y-2.5">
                {['About Us', 'Blog', 'Careers', 'Contact'].map((item) => (
                  <li key={item}><a href="#" className="text-sm text-[#96C7C5] hover:text-white transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="text-xs font-bold text-[#78C0BD] uppercase tracking-wider mb-4">Legal</h5>
              <ul className="space-y-2.5">
                {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'GDPR'].map((item) => (
                  <li key={item}><a href="#" className="text-sm text-[#96C7C5] hover:text-white transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between pt-8 gap-4">
            <p className="text-xs text-[#5A7E81]">
              © {new Date().getFullYear()} Scriptly AI. All rights reserved.
            </p>
            <p className="text-xs text-[#5A7E81] flex items-center gap-1">
              Made with <Heart className="w-3 h-3 text-[#78C0BD] fill-[#78C0BD]" /> by Scriptly Team
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
