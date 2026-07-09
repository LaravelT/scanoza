'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import {
    Scan, X, ArrowLeft, Loader2, Play, Volume2, VolumeX,
    ExternalLink, FileText, Music, Video, Image as ImageIcon, Type,
    CheckCircle2, Info, Maximize2, Share2, Upload, Download, Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { scanFrame, ScanResponse, AttachedContent, ARContent } from '@/lib/api';
import toast from 'react-hot-toast';
import ScannerDisplay from '@/components/ScannerDisplay';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

const SCAN_INTERVAL = 2000; // Give mobile devices breathing room and prevent network queue buildup
const COOLDOWN_TIME = 4000; // 4 seconds pause after detection

export default function ScanPage() {
    const webcamRef = useRef<Webcam>(null);

    // App State
    const [hasLaunched, setHasLaunched] = useState(false);
    const [cameraSupported, setCameraSupported] = useState(true);
    const [isScanning, setIsScanning] = useState(true);
    const [lastMatch, setLastMatch] = useState<{
        content: ARContent;
        attachments: AttachedContent[];
        confidence: number;
    } | null>(null);

    const [scanning, setScanning] = useState(false);
    const scanningRef = useRef(false);
    const [onCooldown, setOnCooldown] = useState(false);
    const [showContent, setShowContent] = useState(false);
    const [muted, setMuted] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackFailed, setPlaybackFailed] = useState(false);
    const [insecureContext, setInsecureContext] = useState(false);
    const [installPrompt, setInstallPrompt] = useState<any>(null);

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setInstallPrompt(e);
            console.log("PWA install prompt captured");
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!installPrompt) {
            const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
            if (isIOS) {
                toast.success("To install: Tap the Share button in Safari and select 'Add to Home Screen' ➕", { duration: 6000 });
            } else {
                toast.success("App is installable! On desktop, look for the install icon in your browser URL bar.", { duration: 5000 });
            }
            return;
        }
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') {
            setInstallPrompt(null);
        }
    };

    // Refs for stable state access in interval
    const isScanningRef = useRef(isScanning);
    const onCooldownRef = useRef(onCooldown);
    const hasLaunchedRef = useRef(hasLaunched);
    const hasInteractedRef = useRef(hasInteracted);

    useEffect(() => { isScanningRef.current = isScanning; }, [isScanning]);
    useEffect(() => { onCooldownRef.current = onCooldown; }, [onCooldown]);
    useEffect(() => { hasLaunchedRef.current = hasLaunched; }, [hasLaunched]);
    useEffect(() => { hasInteractedRef.current = hasInteracted; }, [hasInteracted]);

    useEffect(() => {
        // Mobile browsers block getUserMedia on non-secure origins.
        const noMediaApi = typeof navigator !== 'undefined' && !navigator.mediaDevices;
        const notSecure = typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost';
        if (noMediaApi || notSecure) {
            setCameraSupported(false);
            setInsecureContext(true);
        }
    }, []);

    useEffect(() => {
        const handleWindowFocus = () => {
            if (hasLaunchedRef.current && isScanningRef.current) {
                console.log("Window focused - refreshing camera stream to prevent locks");
                setCameraSupported(false);
                setTimeout(() => setCameraSupported(true), 150);
            }
        };

        window.addEventListener('focus', handleWindowFocus);
        return () => window.removeEventListener('focus', handleWindowFocus);
    }, []);

    // Scanning Loop
    const captureAndScan = useCallback(async () => {
        if (!webcamRef.current || !isScanningRef.current || scanningRef.current || onCooldownRef.current || !hasInteractedRef.current || !hasLaunchedRef.current) return;

        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) return;

        scanningRef.current = true;
        try {
            const res = await fetch(imageSrc);
            const blob = await res.blob();

            const formData = new FormData();
            formData.append('frame', blob, 'frame.jpg');

            const { data } = await scanFrame(formData);

            if (data.matchFound && data.content) {
                setLastMatch({
                    content: data.content,
                    attachments: data.attachments || [],
                    confidence: data.confidence
                });

                toast.success("Image Recognized!", { icon: '✨' });
                setShowContent(true);
                setIsScanning(false);
                setOnCooldown(true);
            }
        } catch (err) {
            console.warn("Scan skipped:", err);
        } finally {
            scanningRef.current = false;
        }
    }, []); // No dependencies, uses refs inside

    useEffect(() => {
        const interval = setInterval(captureAndScan, SCAN_INTERVAL);
        return () => clearInterval(interval);
    }, [captureAndScan]);

    const resetScanner = () => {
        setShowContent(false);
        setLastMatch(null);
        setIsScanning(true);
        setTimeout(() => setOnCooldown(false), 2000);
    };

    // Auto-Open Logic for non-media content
    useEffect(() => {
        if (showContent && lastMatch && lastMatch.content) {
            const { type, url, videoPath } = lastMatch.content;
            const targetUrl = (url || videoPath).startsWith('http') ? (url || videoPath) : `${BACKEND_URL}${url || videoPath}`;

            // If it's a PDF or generic URL (and not a video/image/text/audio that we display inline)
            // YouTube videos will play in the iframe, so we DO NOT open them in a new tab.
            if (type === 'pdf' || (type !== 'video' && type !== 'image' && type !== 'text' && type !== 'audio')) {
                toast.success("Opening content...", { icon: '↗️' });
                // Small delay to ensure UI updates first
                setTimeout(() => {
                    window.open(targetUrl, '_blank');
                }, 50);
            }
        }
    }, [showContent, lastMatch]);

    // Ensure media plays when content is shown
    useEffect(() => {
        if (showContent && hasInteracted) {
            setPlaybackFailed(false);
            setIsPlaying(false);

            // Small delay to let the DOM settle and animation finish
            const timer = setTimeout(() => {
                const mediaElements = document.querySelectorAll('video, audio');
                if (mediaElements.length === 0 && (lastMatch?.content.type === 'video' || lastMatch?.content.type === 'audio')) {
                    // It might be a YouTube iframe, which we can't easily probe for 'playing' state
                    // without the API, so we assume it might work but provide a hit.
                    setIsPlaying(true);
                }

                mediaElements.forEach((el: any) => {
                    el.muted = muted;
                    const playPromise = el.play();

                    if (playPromise !== undefined) {
                        playPromise.then(() => {
                            setIsPlaying(true);
                            setPlaybackFailed(false);
                        }).catch((err: any) => {
                            console.log("Autoplay blocked:", err);
                            setPlaybackFailed(true);
                            // Try again muted as last resort
                            el.muted = true;
                            el.play().then(() => setIsPlaying(true)).catch(() => { });
                        });
                    }
                });
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [showContent, hasInteracted, muted]);

    const handleManualPlay = () => {
        // Unmute all media elements
        const mediaElements = document.querySelectorAll('video, audio');
        mediaElements.forEach((el: any) => {
            el.muted = false;
            el.play().then(() => {
                setMuted(false);
                setIsPlaying(true);
                setPlaybackFailed(false);
            }).catch((e: any) => {
                console.error("Manual play failed:", e);
                setPlaybackFailed(true);
            });
        });
    };



    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setScanning(true);
        try {
            const formData = new FormData();
            formData.append('frame', file);

            const { data } = await scanFrame(formData);

            if (data.matchFound && data.content) {
                setLastMatch({
                    content: data.content,
                    attachments: data.attachments || [],
                    confidence: data.confidence
                });
                toast.success("Image Recognized!", { icon: '✨' });
                setShowContent(true);
                setIsScanning(false);
                setOnCooldown(true);
            } else {
                toast.error(data.message || "This image is not uploaded");
            }
        } catch (err: any) {
            console.error("Full Error details:", err);
            if (err.response) {
                toast.error(`Server Error: ${err.response.status}`);
            } else if (err.request) {
                toast.error("No response from server. Check CORS or Network.");
            } else {
                toast.error(`Failed to scan image: ${err.message || String(err)}`);
            }
        } finally {
            setScanning(false);
            // Reset input value so same file can be selected again if needed
            e.target.value = '';
        }
    };

    const handleManualCapture = async () => {
        if (!webcamRef.current || scanning) return;

        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) {
            toast.error("Camera not ready. Please allow camera access.");
            return;
        }

        scanningRef.current = true;
        setScanning(true);
        try {
            const res = await fetch(imageSrc);
            const blob = await res.blob();
            const formData = new FormData();
            formData.append('frame', blob, 'frame.jpg');

            const { data } = await scanFrame(formData);

            if (data.matchFound && data.content) {
                setLastMatch({
                    content: data.content,
                    attachments: data.attachments || [],
                    confidence: data.confidence
                });
                toast.success("Image Recognized!", { icon: '✨' });
                setShowContent(true);
                setIsScanning(false);
                setOnCooldown(true);
            } else {
                toast.error("No match found in current frame.");
            }
        } catch (err: any) {
            console.error("Full Error details:", err);
            if (err.response) {
                toast.error(`Server Error: ${err.response.status}`);
            } else if (err.request) {
                toast.error("No response from server. Check CORS or Network.");
            } else {
                toast.error(`Scan failed: ${err.message || String(err)}`);
            }
        } finally {
            scanningRef.current = false;
            setScanning(false);
        }
    };

    return (
        <>
            {!hasLaunched ? (
                <div className="fixed inset-0 bg-[#050505] text-white flex flex-col items-center justify-center px-6 overflow-hidden">
                    {/* Premium Mesh Background */}
                    <div className="mesh-bg" />

                    {/* Install App Button in Top Right Corner */}
                    <div className="absolute top-6 right-6 z-20">
                        <button
                            onClick={handleInstallClick}
                            className="flex items-center gap-2 px-4 py-2.5 glass-dark rounded-full border border-white/10 hover:bg-white/10 active:scale-95 transition-all text-[9px] font-black uppercase tracking-widest text-zinc-300 pointer-events-auto"
                        >
                            <Download className="w-3.5 h-3.5 text-blue-400" />
                            <span>Install App</span>
                        </button>
                    </div>

                    {/* Animated Decorative Elements */}
                    <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[120px] animate-pulse" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-500/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1 }}
                        className="w-full max-w-sm flex flex-col items-center gap-8 relative z-10"
                    >
                        <div className="flex flex-col items-center gap-4 text-center">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0, filter: 'blur(10px)' }}
                                animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                                transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
                                className="relative group"
                            >
                                <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full scale-125 opacity-50 transition-opacity duration-1000" />
                                <div className="logo-container w-28 h-28 glass flex items-center justify-center text-white float-anim">
                                    <img src="/logo.jpg" alt="Scanoza Logo" className="w-full h-full object-cover rounded-[28px]" />
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3, duration: 0.8 }}
                                className="space-y-1"
                            >
                                <h1 className="font-black text-6xl tracking-tighter leading-none gradient-text">
                                    scanoza
                                </h1>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.5em]">
                                    Augmented Reality
                                </p>
                            </motion.div>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6, duration: 0.8 }}
                            className="w-full space-y-4"
                        >
                            <button
                                onClick={() => {
                                    setHasInteracted(true);
                                    setHasLaunched(true);
                                }}
                                className="glow-button group relative flex items-center justify-center gap-3 w-full h-14 bg-white rounded-full overflow-hidden active:scale-[0.98] transition-all"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-400 opacity-0 group-hover:opacity-10 transition-opacity" />
                                <Scan className="w-5 h-5 text-black relative z-10" />
                                <span className="text-black font-black uppercase tracking-widest text-[11px] relative z-10">Start Scanning</span>
                            </button>

                            <p className="text-center text-[9px] text-zinc-700 uppercase tracking-widest font-bold">
                                Version 2.0 • Secured Neural Link
                            </p>
                        </motion.div>
                    </motion.div>
                </div>
            ) : (
                <div className="fixed inset-0 bg-black text-white overflow-hidden select-none">
                    {/* Hidden file input for various trigger points */}
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                    />

                    {/* Hidden camera input for direct capture */}
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        ref={cameraInputRef}
                        onChange={handleFileUpload}
                    />

                    {/* ── Background: Camera Feed ────────────────────────────────────── */}
                    <div className="absolute inset-0 z-0 bg-zinc-950 flex flex-col items-center justify-center">
                        {cameraSupported ? (
                            <Webcam
                                audio={false}
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                screenshotQuality={0.70}
                                forceScreenshotSourceSize={false}
                                className="w-full h-full object-cover contrast-[1.05] brightness-[1.02]"
                                videoConstraints={{
                                    facingMode: { ideal: 'environment' },
                                    width: { ideal: 1280 },
                                    height: { ideal: 720 },
                                    aspectRatio: { ideal: 1.7777777778 }
                                }}
                                onUserMediaError={(err) => {
                                    console.log('Webcam mounted error:', err);
                                    setCameraSupported(false);
                                }}
                            />
                        ) : (
                            <div className="text-zinc-600 flex flex-col items-center gap-4">
                                <Camera className="w-16 h-16 opacity-20" />
                                <p className="text-sm font-bold uppercase tracking-widest text-zinc-500">Live Camera Disabled</p>
                                {insecureContext && (
                                    <p className="text-[10px] text-zinc-400 text-center max-w-xs leading-relaxed">
                                        Live camera needs HTTPS on phone browser. Use "OPEN CAMERA" below as fallback.
                                    </p>
                                )}
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />
                    </div>

                    {/* ── Top Bar ─────────────────────────────────────────────────── */}
                    <header className="absolute top-0 left-0 p-6 z-20">
                        <button
                            onClick={() => setHasLaunched(false)}
                            className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 hover:bg-black/60 transition-all text-white"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    </header>

                    {/* ── Bottom Floating Controls ────────────────────────────────────────── */}
                    <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-4 z-20 pointer-events-none">
                        <div className="flex glass-dark px-6 py-2.5 rounded-full items-center gap-3 pointer-events-auto shadow-2xl">
                            <div className={`w-2 h-2 rounded-full ${scanning ? 'bg-blue-500 animate-pulse' : (onCooldown ? 'bg-yellow-500' : 'bg-green-500')}`} />
                            <span className="text-[10px] font-black tracking-[0.2em] uppercase font-mono text-zinc-300">
                                {scanning ? 'Neural Processing...' : (onCooldown ? 'System Recovery' : 'Live Recognition Active')}
                            </span>
                        </div>

                        <div className="flex justify-center w-full pointer-events-auto px-4">
                            {!showContent && (
                                <div className="flex flex-wrap justify-center gap-2.5 max-w-md w-full">
                                    <button
                                        onClick={handleManualCapture}
                                        className="flex items-center justify-center gap-1.5 bg-white text-black px-4 py-3 rounded-full font-black text-[9px] tracking-wider uppercase shadow-2xl active:scale-95 transition-all flex-1 min-w-[95px]"
                                    >
                                        <Camera className="w-3.5 h-3.5" /> SCAN FRAME
                                    </button>
                                    <button
                                        onClick={() => cameraInputRef.current?.click()}
                                        className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-full font-black text-[9px] tracking-wider uppercase shadow-2xl active:scale-95 transition-all flex-1 min-w-[95px]"
                                    >
                                        <Camera className="w-3.5 h-3.5" /> OPEN CAMERA
                                    </button>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center justify-center gap-1.5 glass-dark hover:bg-white/10 text-white px-4 py-3 rounded-full font-black text-[9px] tracking-wider uppercase shadow-2xl active:scale-95 transition-all flex-1 min-w-[95px]"
                                    >
                                        <Upload className="w-3.5 h-3.5" /> UPLOAD IMAGE
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Scanning UI ─────────────────────────────────────────────── */}
                    <AnimatePresence>
                        {!showContent && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                            >
                                {/* Target Reticle */}
                                <div className="relative w-72 h-72 md:w-96 md:h-96">
                                    {/* Scanning Line */}
                                    {isScanning && <div className="scan-line" />}

                                    {/* Corners */}
                                    <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-blue-500/80 rounded-tl-3xl shadow-[-5px_-5px_30px_rgba(59,130,246,0.2)]"></div>
                                    <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-blue-500/80 rounded-tr-3xl shadow-[5px_-5px_30px_rgba(59,130,246,0.2)]"></div>
                                    <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-blue-500/80 rounded-bl-3xl shadow-[-5px_5px_30px_rgba(59,130,246,0.2)]"></div>
                                    <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-blue-500/80 rounded-br-3xl shadow-[5px_5px_30px_rgba(59,130,246,0.2)]"></div>

                                    {/* Scanning Active Component */}
                                    <div className={`absolute inset-0 transition-opacity duration-1000 ${isScanning ? 'opacity-100' : 'opacity-0'}`}>
                                        <div className="absolute inset-0 border border-white/5 rounded-3xl bg-blue-500/5 backdrop-blur-[1px]" />

                                        {/* HUD Text */}
                                        <div className="absolute -top-10 left-0 right-0 flex justify-between text-[8px] font-black tracking-[0.3em] uppercase text-blue-500/60">
                                            <span>Target Acquisition</span>
                                            <span>Depth: Auto</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── Match Trigger View (Optimized Modal) ─────────────────────── */}
                    <AnimatePresence>
                        {showContent && lastMatch && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-10"
                            >
                                <motion.div
                                    initial={{ scale: 0.95, y: 10 }}
                                    animate={{ scale: 1, y: 0 }}
                                    exit={{ scale: 0.95, y: 10 }}
                                    transition={{ duration: 0.2, type: "spring", stiffness: 300, damping: 25 }}
                                    className="bg-zinc-900/60 border border-white/10 md:rounded-[40px] overflow-hidden max-w-4xl w-full flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.5)] relative"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {/* Close button */}
                                    <button
                                        onClick={resetScanner}
                                        className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50 backdrop-blur-md"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>

                                    {/* Main Content Area */}
                                    <div className="relative w-full flex flex-col items-center justify-center p-4 md:p-8 min-h-[40vh]">
                                        {((lastMatch.content.type || 'video') === 'video' || lastMatch.content.type === 'image') ? (
                                            <div className="relative w-full h-full flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl border border-white/5">
                                                <ScannerDisplay
                                                    key={lastMatch.content.contentId}
                                                    post={{
                                                        secretType: lastMatch.content.type || 'video',
                                                        secretContent: lastMatch.content.url || lastMatch.content.videoPath || ''
                                                    }}
                                                />

                                                {playbackFailed && lastMatch.content.type === 'video' && (
                                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-6 text-center z-10 backdrop-blur-sm">
                                                        <button
                                                            onClick={handleManualPlay}
                                                            className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-2xl animate-bounce hover:bg-blue-500 transition-colors"
                                                        >
                                                            <Play className="w-8 h-8 fill-white text-white" />
                                                        </button>
                                                        <p className="mt-4 font-bold text-white text-sm">Tap to Play with Audio</p>
                                                    </div>
                                                )}
                                            </div>
                                        ) : lastMatch.content.type === 'text' ? (
                                            <div className="p-12 text-center italic text-xl md:text-2xl text-zinc-100 font-medium max-w-2xl">
                                                "{lastMatch.content.text}"
                                            </div>
                                        ) : (
                                            <div className="p-12 text-center space-y-6">
                                                <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center mx-auto text-blue-400">
                                                    {lastMatch.content.type === 'audio' ? <Music className="w-10 h-10" /> : <FileText className="w-10 h-10" />}
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold">{lastMatch.content.title || 'Attached Content'}</h3>
                                                    <p className="text-zinc-500 text-sm mt-1 uppercase tracking-widest">{(lastMatch.content.type || 'unknown')}</p>
                                                </div>
                                                {lastMatch.content.type === 'audio' && (
                                                    <audio
                                                        key={lastMatch.content.contentId}
                                                        src={(lastMatch.content.url || lastMatch.content.videoPath).startsWith('http') ? (lastMatch.content.url || lastMatch.content.videoPath) : `${BACKEND_URL}/${(lastMatch.content.url || lastMatch.content.videoPath).replace(/^\/+/, '')}`}
                                                        autoPlay
                                                        muted={muted}
                                                        controls
                                                        className="w-full max-w-md mx-auto"
                                                    />
                                                )}
                                                <button
                                                    onClick={() => {
                                                        const raw = lastMatch.content.url || lastMatch.content.videoPath || '';
                                                        const url = raw.startsWith('http') ? raw : `${BACKEND_URL}/${raw.replace(/^\/+/, '')}`;
                                                        window.open(url, '_blank');
                                                    }}
                                                    className="px-8 py-3 bg-zinc-800 hover:bg-white/10 text-white rounded-xl font-bold text-xs border border-white/5 transition-all"
                                                >
                                                    OPEN IN NEW TAB
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Badge/Info */}
                                    <div className="px-8 py-4 bg-black/40 border-t border-white/5 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10">
                                                <img
                                                    src={lastMatch.content.imagePath.startsWith('http') ? lastMatch.content.imagePath : `${BACKEND_URL}${lastMatch.content.imagePath}`}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/100x100/18181b/ffffff?text=AR'; }}
                                                />
                                            </div>
                                            <span className="text-xs font-bold text-zinc-400 truncate max-w-[150px]">{lastMatch.content.originalImageName}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                            <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Authentication Matched</span>
                                        </div>
                                    </div>

                                    {/* Linked Attachments Section (Niche wali list) */}
                                    {lastMatch.attachments.length > 0 && (
                                        <div className="px-8 py-4 bg-black/20 border-t border-white/5">
                                            <h4 className="text-[9px] font-black uppercase text-zinc-500 tracking-[0.2em] mb-3">Extra Content Found ({lastMatch.attachments.length})</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {lastMatch.attachments.slice(0, 4).map((att) => (
                                                    <div
                                                        key={att.attachmentId}
                                                        className="flex items-center gap-3 bg-white/5 border border-white/5 p-2 rounded-xl cursor-pointer hover:bg-white/10 transition-all"
                                                        onClick={() => {
                                                            const rawUrl = att.url || att.videoPath;
                                                            if (rawUrl) {
                                                                const url = rawUrl.startsWith('http') ? rawUrl : `${BACKEND_URL}/${rawUrl.replace(/^\/+/, '')}`;
                                                                window.open(url, '_blank');
                                                            }
                                                        }}
                                                    >
                                                        <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center text-blue-400 shrink-0">
                                                            {att.type === 'video' ? <Video className="w-4 h-4" /> :
                                                                att.type === 'audio' ? <Music className="w-4 h-4" /> :
                                                                    att.type === 'image' ? <ImageIcon className="w-4 h-4" /> :
                                                                        att.type === 'pdf' ? <FileText className="w-4 h-4" /> : <Type className="w-4 h-4" />}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-[10px] font-bold text-white truncate">{att.title || `${att.type.toUpperCase()}`}</p>
                                                            <p className="text-[8px] text-zinc-500 uppercase tracking-widest leading-none">{att.type}</p>
                                                        </div>
                                                        <ExternalLink className="w-3 h-3 text-zinc-600" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Button */}
                                    <div className="p-4 md:p-6 bg-black/60">
                                        <button
                                            onClick={resetScanner}
                                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all shadow-[0_0_40px_rgba(59,130,246,0.3)] flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
                                        >
                                            <Scan className="w-5 h-5" /> CONTINUE SCANNING
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
            <style jsx global>{`
        @keyframes scan {
          0% { top: 10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
      `}</style>
        </>
    );
}
