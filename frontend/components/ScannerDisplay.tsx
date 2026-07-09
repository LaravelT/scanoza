'use client';

import React from 'react';

interface ScannerDisplayProps {
    post: {
        secretType: string;
        secretContent: string;
    };
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

const ScannerDisplay: React.FC<ScannerDisplayProps> = ({ post }) => {
    const [isReady, setIsReady] = React.useState(false);
    const contentUrl = post.secretContent || '';

    // Robust check for YouTube URLs (case-insensitive)
    const isYouTube = /youtube\.com|youtu\.be/i.test(contentUrl);
    const isShorts = /\/shorts\//i.test(contentUrl);

    React.useEffect(() => {
        const timer = setTimeout(() => setIsReady(true), 400);
        return () => clearTimeout(timer);
    }, [contentUrl]);

    if (!isReady) {
        return (
            <div className={`w-full ${isShorts ? 'aspect-[9/16]' : 'aspect-video'} bg-zinc-950 flex items-center justify-center rounded-2xl border border-white/5`}>
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Prepare media source (local vs remote)
    const getMediaSrc = (src: string) => {
        if (!src) return '';
        if (src.startsWith('http')) return src;
        const cleanPath = src.replace(/^\/+/, '');
        return `${BACKEND_URL}/${cleanPath.split('/').map(p => encodeURIComponent(p)).join('/')}`;
    };

    return (
        <div className={`scanner-display-content w-full h-full flex flex-col items-center group/display ${isShorts ? 'max-w-[280px] mx-auto' : ''}`}>
            {post.secretType === 'video' && (
                isYouTube ? (
                    <div className={`w-full ${isShorts ? 'aspect-[9/16]' : 'aspect-video'} relative shadow-2xl rounded-2xl overflow-hidden border border-white/10 bg-black`}>
                        <iframe
                            width="100%"
                            height="100%"
                            src={convertToEmbedUrl(contentUrl)}
                            title="Reality Overlay"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            loading="lazy"
                            className="absolute inset-0 w-full h-full"
                        />
                    </div>
                ) : (
                    <div className="relative w-full shadow-2xl rounded-2xl overflow-hidden border border-white/10 bg-black">
                        <video
                            src={getMediaSrc(contentUrl)}
                            controls
                            autoPlay
                            playsInline
                            className="w-full h-full object-contain"
                        />
                    </div>
                )
            )}

            {post.secretType === 'image' && (
                <div className="relative w-full shadow-2xl rounded-2xl overflow-hidden border border-white/10 bg-black">
                    <img
                        src={getMediaSrc(contentUrl)}
                        alt="Scanned Logic"
                        className="w-full h-full object-contain"
                    />
                </div>
            )}
        </div>
    );
};

export function convertToEmbedUrl(url: string) {
    if (!url) return '';

    // If it's already an embed link (even if it's from youtube.com, we'll try to use it)
    if (url.includes('/embed/')) {
        const base = url.split('?')[0].replace('youtube.com', 'youtube-nocookie.com');
        return `${base}?autoplay=1&mute=0&playsinline=1&enablejsapi=1&rel=0`;
    }

    try {
        // More robust YouTube ID extraction for all formats: watch, youtu.be, shorts, v/, embed/
        const youtubeIdRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i;
        const match = url.match(youtubeIdRegex);

        if (match && match[1]) {
            const videoId = match[1];
            // Using youtube-nocookie.com for better privacy/compatibility and bypassing some restricted embeds
            return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=0&playsinline=1&enablejsapi=1&rel=0`;
        }

        return url;
    } catch (e) {
        return url;
    }
}

export default ScannerDisplay;
