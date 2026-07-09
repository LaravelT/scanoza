'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { useRouter } from 'next/navigation';
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

const SCAN_INTERVAL = 900; // HD frames need a little breathing room on mobile
const COOLDOWN_TIME = 5000; // 5 seconds pause after detection

export default function ScanPage() {
    const router = useRouter();
    const webcamRef = useRef<Webcam>(null);

    // App State
    const [hasLaunched, setHasLaunched] = useState(false);
    const [isScanning, setIsScanning] = useState(true);
    const [lastMatch, setLastMatch] = useState<{
        content: ARContent;
        attachments: AttachedContent[];
        confidence: number;
    } | null>(null);

    const [scanning, setScanning] = useState(false);
    const [onCooldown, setOnCooldown] = useState(false);
    const [showContent, setShowContent] = useState(false);
    const [muted, setMuted] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackFailed, setPlaybackFailed] = useState(false);

    // Scanning Loop
    const captureAndScan = useCallback(async () => {
        if (!webcamRef.current || !isScanning || scanning || onCooldown || !hasInteracted || !hasLaunched) return;

        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) return;

        setScanning(true);
        try {
            // Convert base64 to Blob
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

                // Success feedback
                toast.success("Image Recognized!", { icon: '✨' });
                setShowContent(true);
                setIsScanning(false);
                setOnCooldown(true);

                // For now, we stay in "Content View" until the user closes it
            }
        } catch (err) {
            console.error("Scan error:", err);
        } finally {
            setScanning(false);
        }
    }, [isScanning, scanning, onCooldown]);

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
        } catch (err) {
            console.error("Upload scan error:", err);
            toast.error("Failed to scan image");
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
        } catch (err) {
            console.error("Manual capture error:", err);
            toast.error("Scan failed");
        } finally {
            setScanning(false);
        }
    };

    return (
        <>
            {!hasLaunched ? (
                <div className="fixed inset-0 bg-[#050505] text-white flex flex-col items-center justify-center px-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-sm flex flex-col items-center gap-10"
                    >
                        <div className="flex flex-col items-center gap-4 text-center">
                            <div className="w-24 h-24 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-blue-500/40 overflow-hidden mb-2">
                                <Scan className="w-12 h-12" />
                            </div>
                            <div>
                                <h1 className="font-black text-3xl tracking-tighter text-white leading-none">FrameStory</h1>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em] mt-2">Web Scanner</p>
                            </div>
                        </div>

                        <button
                            onClick={async () => {
                                try {
                                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                                    stream.getTracks().forEach(track => track.stop());
                                    setHasInteracted(true);
                                    setHasLaunched(true);
                                } catch (err) {
                                    toast.error("Camera access is required to scan images.");
                                }
                            }}
                            className="group relative flex items-center justify-center gap-2 w-full h-14 bg-blue-600 rounded-[12px] shadow-lg shadow-blue-600/30 overflow-hidden active:scale-[0.98] transition-all"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-700 group-hover:opacity-90 transition-opacity" />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] from-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Scan className="w-5 h-5 text-white relative z-10 animate-pulse" />
                            <span className="text-white font-black uppercase tracking-widest text-sm relative z-10">Allow Camera access</span>
                        </button>
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
                    <div className="absolute inset-0 z-0">
                        <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            screenshotQuality={1.0}
                            forceScreenshotSourceSize={true}
                            className="w-full h-full object-cover contrast-[1.05] brightness-[1.02]"
                            videoConstraints={{
                                facingMode: { ideal: 'environment' },
                                width: { ideal: 2560 },
                                height: { ideal: 1440 },
                                aspectRatio: { ideal: 1.7777777778 }
                            }}
                        />
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
                        <div className="flex bg-black/40 backdrop-blur-md px-6 py-2.5 rounded-full border border-white/10 items-center gap-3 pointer-events-auto">
                            <div className={`w-2 h-2 rounded-full ${scanning ? 'bg-blue-500 animate-pulse' : (onCooldown ? 'bg-yellow-500' : 'bg-green-500')}`} />
                            <span className="text-xs font-bold tracking-widest uppercase font-mono">
                                {scanning ? 'Processing...' : (onCooldown ? 'Cooldown' : 'Live Scanner')}
                            </span>
                        </div>

                        <div className="flex gap-3 items-center pointer-events-auto">
                            {!showContent && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleManualCapture}
                                        className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-full font-bold text-sm shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all"
                                    >
                                        <Camera className="w-4 h-4" /> CAMERA
                                    </button>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all"
                                    >
                                        <Upload className="w-4 h-4" /> UPLOAD
                                    </button>
                                </div>
                            )}
                            <button
                                onClick={() => setMuted(!muted)}
                                className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 hover:bg-black/60 transition-all text-white"
                            >
                                {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                            </button>
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
                                <div className="relative w-64 h-64 md:w-80 md:h-80">
                                    {/* Corners */}
                                    <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-white/80 rounded-tl-3xl shadow-[-5px_-5px_20px_rgba(0,0,0,0.5)]"></div>
                                    <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-white/80 rounded-tr-3xl shadow-[5px_-5px_20px_rgba(0,0,0,0.5)]"></div>
                                    <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-white/80 rounded-bl-3xl shadow-[-5px_5px_20px_rgba(0,0,0,0.5)]"></div>
                                    <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-white/80 rounded-br-3xl shadow-[5px_5px_20px_rgba(0,0,0,0.5)]"></div>

                                    {/* Scanning Active Component */}
                                    <div className={`absolute inset-0 transition-opacity duration-500 ${isScanning ? 'opacity-100' : 'opacity-0'}`}>
                                        {/* Clean HD Overlay */}
                                        <div className="absolute inset-0 border border-white/5 rounded-3xl" />
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
                                                    {lastMatch.content.type === 'audio' ? (
                                                        <Music className="w-10 h-10" />
                                                    ) : lastMatch.content.type === 'link' ? (
                                                        <ExternalLink className="w-10 h-10" />
                                                    ) : (
                                                        <FileText className="w-10 h-10" />
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold">{lastMatch.content.title || (lastMatch.content.type === 'link' ? 'Redirect Link' : 'Attached Content')}</h3>
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
                                                    {lastMatch.content.type === 'link' ? 'OPEN LINK' : 'OPEN IN NEW TAB'}
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
                                            <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Authenticated Match</span>
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
