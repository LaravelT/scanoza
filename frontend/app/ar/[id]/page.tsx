'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Scan, Volume2, VolumeX } from 'lucide-react';
import Script from 'next/script';
import { motion, AnimatePresence } from 'framer-motion';

export default function ARViewer() {
    const { id } = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [arReady, setArReady] = useState(false);
    const [error, setError] = useState('');
    const [resources, setResources] = useState<{ image: string, video: string, ratio: number } | null>(null);
    const [started, setStarted] = useState(false);
    const [muted, setMuted] = useState(false);

    useEffect(() => {
        // Fetch content data
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/contents`)
            .then(res => res.json())
            .then(data => {
                const item = data.find((c: any) => c.contentId === id);
                if (item) {
                    const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';
                    setResources({
                        // Ensure we use the full absolute URL for the compiler to fetch it
                        image: backendUrl + item.imagePath,
                        video: item.videoPath.startsWith('http') ? item.videoPath : backendUrl + item.videoPath,
                        ratio: 1
                    });
                } else {
                    setError('Target not found');
                    setLoading(false);
                }
            })
            .catch(() => {
                setError('Connection failed');
                setLoading(false);
            });
    }, [id]);

    const handleArLoad = async () => {
        if (!resources) return;

        // We need to compile the target image into a .mind file for tracking
        // This allows using any uploaded image without backend processing
        try {
            setLoading(true);
            console.log("Starting compilation for:", resources.image);

            // precise compilation can be slow but needed for good tracking
            // @ts-ignore
            const compiler = new window.MINDAR.IMAGE.Compiler();

            await compiler.importData(null); // Initialize empty

            // Load the image
            const image = new Image();
            image.crossOrigin = "anonymous";
            image.src = resources.image;

            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = reject;
            });

            // Compile
            await compiler.compileImageTargets([image], (progress: number) => {
                console.log("Compiling progress:", progress);
            });

            const exportedBuffer = await compiler.exportData();
            const blob = new Blob([exportedBuffer]);
            const mindFileUrl = URL.createObjectURL(blob);

            // Pass this compiled file to the scene
            const sceneEl = document.querySelector('a-scene');
            if (sceneEl) {
                sceneEl.setAttribute('mindar-image', `imageTargetSrc: ${mindFileUrl}; autoStart: true; uiLoading: no; uiError: no; filterMinCF:0.0001; filterBeta: 0.001;`);
            }

            setArReady(true);
            setLoading(false);

            // Register video handler if not already done
            // @ts-ignore
            if (window.AFRAME && !window.AFRAME.components['vidhandler']) {
                // @ts-ignore
                window.AFRAME.registerComponent('vidhandler', {
                    init: function () {
                        this.toggle = false;
                        this.vid = document.querySelector("#ar-video");
                        this.vid.pause();
                    },
                    tick: function () {
                        if (this.el.object3D.visible === true) {
                            if (!this.toggle) {
                                this.toggle = true;
                                this.vid.play();
                                const overlay = document.getElementById('scanning-overlay');
                                if (overlay) overlay.style.opacity = '0';
                            }
                        } else {
                            if (this.toggle) {
                                this.toggle = false;
                                this.vid.pause();
                                const overlay = document.getElementById('scanning-overlay');
                                if (overlay) overlay.style.opacity = '1';
                            }
                        }
                    }
                });
            }

        } catch (err) {
            console.error("AR Compilation Failed:", err);
            setError("Failed to process image for AR. Please try a clearer image.");
            setLoading(false);
        }
    };


    const startExperience = () => {
        setStarted(true);
        // This click allows video to play with sound later
        const v = document.getElementById('ar-video') as HTMLVideoElement;
        if (v) {
            v.muted = false;
            v.play().then(() => v.pause()).catch(() => { });
        }
    };

    if (error) return (
        <div className="flex h-screen items-center justify-center bg-black text-white">
            <div className="text-center p-6">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Scan className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-red-500 mb-2">Target Unavailable</h2>
                <p className="text-zinc-500 mb-6 text-sm">{error}</p>
                <button onClick={() => router.back()} className="px-6 py-3 bg-zinc-800 rounded-full font-medium text-sm hover:bg-zinc-700 transition">Go Back</button>
            </div>
        </div>
    );

    return (
        <>
            <Script
                src="https://aframe.io/releases/1.4.2/aframe.min.js"
                strategy="beforeInteractive"
            />
            <Script
                src="https://cdn.jsdelivr.net/npm/mind-ar@1.2.2/dist/mindar-image-aframe.prod.js"
                strategy="afterInteractive"
                onLoad={handleArLoad}
            />

            <div className="fixed inset-0 z-50 bg-black overflow-hidden select-none">

                {/* 1. INITIAL LOADING STATE */}
                {loading && (
                    <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-black text-white">
                        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
                        <p className="font-mono text-sm tracking-widest uppercase">Initializing FrameStory Engine</p>
                    </div>
                )}

                {/* 2. START SCREEN (For Audio Permission) */}
                {!loading && !started && resources && (
                    <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl text-white p-6 text-center">
                        <div className="flex-1 flex flex-col items-center justify-center space-y-8">
                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 animate-pulse"></div>
                                <img
                                    src={resources.image}
                                    className="w-48 h-64 object-cover rounded-xl border border-white/20 shadow-2xl relative z-10 rotate-[-4deg]"
                                />
                                <img
                                    src={resources.image}
                                    className="w-48 h-64 object-cover rounded-xl border border-white/20 shadow-2xl absolute top-0 left-0 rotate-[4deg] opacity-50 z-0 scale-95"
                                />
                            </div>

                            <div className="space-y-2">
                                <h1 className="text-2xl font-bold">Ready to Experience?</h1>
                                <p className="text-zinc-400 text-sm max-w-xs mx-auto">Point your camera at the target image to bring it to life.</p>
                            </div>
                        </div>

                        <button
                            onClick={startExperience}
                            className="w-full max-w-xs bg-white text-black font-bold py-4 rounded-full text-lg shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105 transition-transform active:scale-95"
                        >
                            START AR SCANNER
                        </button>
                    </div>
                )}

                {/* 3. AR UI OVERLAY (Active Scanner) */}
                {started && (
                    <div className="absolute inset-0 pointer-events-none z-[50]">
                        {/* Header Actions */}
                        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-auto">
                            <button
                                onClick={() => window.location.href = '/'}
                                className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white border border-white/10"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => {
                                    const v = document.getElementById('ar-video') as HTMLVideoElement;
                                    if (v) {
                                        v.muted = !v.muted;
                                        setMuted(!muted);
                                    }
                                }}
                                className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white border border-white/10"
                            >
                                {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                            </button>
                        </div>

                        {/* Scanning Reticle */}
                        <div id="scanning-overlay" className="absolute inset-0 flex items-center justify-center transition-opacity duration-500">
                            <div className="relative w-[70vw] h-[70vw] max-w-[400px] max-h-[400px]">
                                {/* Corners */}
                                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white/80 rounded-tl-xl"></div>
                                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white/80 rounded-tr-xl"></div>
                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white/80 rounded-bl-xl"></div>
                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white/80 rounded-br-xl"></div>

                                {/* Scanning Line */}
                                <div className="absolute inset-x-0 h-[2px] bg-blue-500/80 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>

                                <div className="absolute -bottom-12 left-0 right-0 text-center">
                                    <p className="text-white/80 font-mono text-xs tracking-[0.2em] animate-pulse">SEARCHING TARGET...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. AR SCENE (MindAR + A-Frame) */}
                {resources && started && (
                    // @ts-ignore
                    <a-scene
                        mindar-image={`imageTargetSrc: ${resources.image}; autoStart: true; uiLoading: no; uiError: no; filterMinCF:0.0001; filterBeta: 0.001;`}
                        color-space="sRGB"
                        renderer="colorManagement: true, physicallyCorrectLights"
                        vr-mode-ui="enabled: false"
                        device-orientation-permission-ui="enabled: false"
                        embedded
                        class="w-full h-full absolute inset-0 z-0"
                    >
                        {/* @ts-ignore */}
                        <a-assets>
                            {/* @ts-ignore */}
                            <video
                                id="ar-video"
                                src={resources.video}
                                preload="auto"
                                response-type="arraybuffer"
                                loop
                                crossOrigin="anonymous"
                                playsInline
                                webkit-playsinline
                            ></video>
                        </a-assets>

                        {/* @ts-ignore */}
                        <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>

                        {/* @ts-ignore */}
                        <a-entity mindar-image-target="targetIndex: 0">
                            {/* @ts-ignore */}
                            <a-plane
                                src="#ar-video"
                                position="0 0 0"
                                height="1"
                                width="1" // Start square, but scaling should be handled by your content creation 
                                rotation="0 0 0"
                                vidhandler
                            ></a-plane>
                        </a-entity>
                    </a-scene>
                )}
            </div>

            <style jsx global>{`
        @keyframes scan {
            0% { top: 0%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
        }
      `}</style>
        </>
    );
}
