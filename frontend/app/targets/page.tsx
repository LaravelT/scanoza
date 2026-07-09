'use client';
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import {
    getContentList, deleteContent, ARContent, updateContent,
    getAttachedContents, AttachedContent, registerUser
} from "@/lib/api";
import {
    Copy, Trash2, Calendar, FileType, Search, ExternalLink, Info, Scan,
    Video, Music, Image as ImageIcon, Type, FileText, Plus, X, UploadCloud, Download, Edit2, Loader2
} from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

const CONTENT_TYPES = [
    { id: 'video' as const, label: 'Video', icon: Video, color: 'text-red-400' },
    { id: 'audio' as const, label: 'Audio', icon: Music, color: 'text-purple-400' },
    { id: 'image' as const, label: 'Image', icon: ImageIcon, color: 'text-green-400' },
    { id: 'text' as const, label: 'Text', icon: Type, color: 'text-yellow-400' },
    { id: 'pdf' as const, label: 'PDF', icon: FileText, color: 'text-orange-400' },
];

export default function TargetsPage() {
    const { data: session, status } = useSession();
    const [contents, setContents] = useState<ARContent[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedContent, setSelectedContent] = useState<ARContent | null>(null);


    // Edit Message state
    const [editingContent, setEditingContent] = useState<ARContent | null>(null);
    const [editType, setEditType] = useState<'video' | 'audio' | 'image' | 'text' | 'pdf'>('video');
    const [editUrl, setEditUrl] = useState('');
    const [editText, setEditText] = useState('');
    const [editTitle, setEditTitle] = useState('');
    const [editFile, setEditFile] = useState<File | null>(null);
    const [editSubmitting, setEditSubmitting] = useState(false);

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            if (status === 'loading') return;

            if (status === 'unauthenticated' || !session?.user?.email) {
                setContents([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const { data } = await getContentList(session.user.email);
                setContents(data);
            } catch {
                toast.error('Failed to load your content');
            }
            setLoading(false);
        };

        fetchData();
        if (status === 'authenticated' && session?.user?.email) {
            registerUser(session.user.email, (session.user as any).id || session.user.email)
                .catch(() => console.warn("User sync failed"));
        }
    }, [session, status]);

    const handleDelete = async (id: string, contentId: string) => {
        if (!confirm("Are you sure? This will also delete all attached contents.")) return;
        try {
            await deleteContent(contentId);
            setContents(contents.filter(c => c.contentId !== contentId));
            if (selectedContent?.contentId === contentId) setSelectedContent(null);
            toast.success("Content deleted");
        } catch {
            toast.error("Delete failed");
        }
    };

    const handleEditSubmit = async () => {
        if (!editingContent) return;
        setEditSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('type', editType);
            formData.append('title', editTitle);
            if (editType === 'text') formData.append('text', editText);
            else if (editFile) formData.append('file', editFile);
            else formData.append('url', editUrl);

            await updateContent(editingContent.contentId, formData);
            toast.success('Updated successfully!');
            const { data } = await getContentList(session?.user?.email || undefined);
            setContents(data);
            setEditingContent(null);
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Failed to update');
        }
        setEditSubmitting(false);
    };

    const filteredContents = contents.filter(c =>
        c.contentId.toLowerCase().includes(search.toLowerCase()) ||
        c.originalImageName.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="max-w-6xl mx-auto relative px-4 sm:px-6 pb-20 sm:pb-32 pt-12 sm:pt-14">
            {/* Search Field */}
            <div className="relative mb-8 sm:mb-12 max-w-md mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
                <input
                    type="text"
                    placeholder="Search targets..."
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all backdrop-blur-md text-white"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Target Grid */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Your Targets ({filteredContents.length})</h2>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-64 bg-zinc-900/50 rounded-[20px] animate-pulse" />
                        ))}
                    </div>
                ) : filteredContents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {filteredContents.map((item) => (
                        <motion.div
                            key={item.contentId}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-zinc-900/40 border border-white/5 rounded-[32px] overflow-hidden backdrop-blur-sm flex flex-col h-full hover:border-white/10 transition-all group"
                        >

                            <div className="flex flex-col p-4 gap-4 flex-1">
                                {/* Thumbnail */}
                                <div
                                    className="relative w-full aspect-square rounded-2xl overflow-hidden flex-shrink-0 cursor-pointer border border-white/5 group-hover:border-blue-500/30 transition-all"
                                    onClick={() => setSelectedContent(item)}
                                >
                                    <img
                                        src={item.imagePath.startsWith('http') ? item.imagePath : `${BACKEND_URL}${item.imagePath}`}
                                        alt={item.originalImageName}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/18181b/ffffff?text=Target'; }}
                                    />
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-all" />
                                </div>

                                {/* Info */}
                                <div className="flex-1 flex flex-col min-w-0">
                                    <h3 className="font-bold text-white truncate text-base mb-1">{item.originalImageName}</h3>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-md border border-blue-500/10">
                                            {item.type}
                                        </span>
                                        <span className="text-[11px] text-zinc-500 flex items-center gap-1 font-medium">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {(() => {
                                                const date = new Date(item.createdAt);
                                                const dd = String(date.getDate()).padStart(2, '0');
                                                const mm = String(date.getMonth() + 1).padStart(2, '0');
                                                const yy = String(date.getFullYear()).slice(-2);
                                                return `${dd}/${mm}/${yy}`;
                                            })()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions below the card */}
                            <div className={`grid ${item.url ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'} gap-[1px] bg-white/5 border-t border-white/5 mt-auto`}>
                                <button
                                    onClick={() => {
                                        setEditType((item.type as any) || 'video');
                                        setEditUrl(item.url || '');
                                        setEditText(item.text || '');
                                        setEditTitle(item.title || '');
                                        setEditFile(null);
                                        setEditingContent(item);
                                    }}
                                    className="flex items-center justify-center gap-1.5 py-4 text-[9px] font-black text-zinc-400 hover:bg-white/5 hover:text-white transition-colors uppercase tracking-widest"
                                >
                                    <Edit2 className="w-3.5 h-3.5" /> EDIT
                                </button>
                                <button
                                    onClick={async () => {
                                        try {
                                            const imgUrl = item.imagePath.startsWith('http') ? item.imagePath : `${BACKEND_URL}${item.imagePath}`;
                                            const res = await fetch(imgUrl);
                                            const blob = await res.blob();
                                            const blobUrl = URL.createObjectURL(blob);
                                            const link = document.createElement('a');
                                            link.href = blobUrl;
                                            link.download = `target-${item.originalImageName || item.contentId}.jpg`;
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                            URL.revokeObjectURL(blobUrl);
                                            toast.success("Download started");
                                        } catch (err) {
                                            window.open(item.imagePath.startsWith('http') ? item.imagePath : `${BACKEND_URL}${item.imagePath}`, '_blank');
                                        }
                                    }}
                                    className="flex items-center justify-center gap-1.5 py-4 text-[9px] font-black text-zinc-400 hover:bg-white/5 hover:text-white transition-colors border-l border-white/5 uppercase tracking-widest"
                                >
                                    <Download className="w-3.5 h-3.5" /> SAVE
                                </button>
                                
                                {item.url && (
                                    <button
                                        onClick={async () => {
                                            const rawUrl = item.url || '';
                                            if (rawUrl.startsWith('http')) {
                                                window.open(rawUrl, '_blank');
                                            } else {
                                                try {
                                                    const res = await fetch(`${BACKEND_URL}${rawUrl}`);
                                                    const blob = await res.blob();
                                                    const blobUrl = URL.createObjectURL(blob);
                                                    const link = document.createElement('a');
                                                    link.href = blobUrl;
                                                    link.download = rawUrl.split('/').pop() || 'file';
                                                    link.click();
                                                    URL.revokeObjectURL(blobUrl);
                                                } catch { window.open(`${BACKEND_URL}${rawUrl}`, '_blank'); }
                                            }
                                        }}
                                        className="flex items-center justify-center gap-1.5 py-4 text-[9px] font-black text-green-400 hover:bg-white/5 hover:text-green-300 transition-colors border-l border-white/5 uppercase tracking-widest"
                                    >
                                        {item.url.startsWith('http') ? <ExternalLink className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                                        {item.url.startsWith('http') ? 'LINK' : 'FILE'}
                                    </button>
                                )}

                                <button
                                    onClick={() => handleDelete(item._id, item.contentId)}
                                    className="flex items-center justify-center gap-1.5 py-4 text-[9px] font-black text-red-500/80 hover:bg-red-500/10 hover:text-red-400 transition-colors border-l border-white/5 uppercase tracking-widest"
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> DEL
                                </button>
                            </div>
                        </motion.div>
                    ))}
                    </div>


                ) : (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center py-4 sm:py-20 px-2 sm:px-8 text-center bg-zinc-950/20 border border-dashed border-zinc-800 rounded-[12px] sm:rounded-[32px]">
                        <div className="w-8 h-8 sm:w-20 sm:h-20 bg-zinc-900 rounded-[12px] flex items-center justify-center mb-2 sm:mb-6 border border-white/5 shadow-inner">
                            <UploadCloud className="w-4 h-4 text-zinc-700" />
                        </div>
                        <h3 className="text-[12px] sm:text-xl font-bold text-white mb-0.5 sm:mb-1">No Targets Yet</h3>
                        <p className="text-zinc-500 text-[8px] sm:text-sm leading-relaxed mb-4 sm:mb-8">
                            Upload your first target image to attach AR content like videos, 3D models, or links.
                        </p>
                        <Link
                            href="/upload"
                            className="px-4 py-2 sm:px-8 sm:py-4 bg-white text-black font-black uppercase tracking-widest text-[8px] sm:text-xs rounded-lg shadow-lg active:scale-95 transition-all text-center"
                        >
                            + Add Target
                        </Link>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {selectedContent && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
                        onClick={() => setSelectedContent(null)}
                    >
                        {/* Persistent Close Button in right corner */}
                        <button
                            onClick={() => setSelectedContent(null)}
                            className="fixed top-6 right-6 p-3 bg-zinc-900/80 hover:bg-zinc-800 text-white rounded-full border border-white/10 shadow-lg transition-colors cursor-pointer z-[110]"
                            title="Close Preview"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="relative max-w-[90vw] max-h-[85vh] rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center bg-zinc-950"
                            onClick={e => e.stopPropagation()}
                        >
                            <img
                                src={selectedContent.imagePath.startsWith('http') ? selectedContent.imagePath : `${BACKEND_URL}${selectedContent.imagePath}`}
                                className="max-w-[90vw] max-h-[85vh] object-contain"
                                alt="Preview"
                                onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/800x800/18181b/ffffff?text=Target+Image'; }}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {editingContent && (
                    <motion.div
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center"
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            className="bg-zinc-900 border-t border-x border-white/10 rounded-t-[40px] sm:rounded-[40px] w-full max-w-md p-6 sm:p-8 sm:pb-12"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-sm sm:text-xl font-bold flex items-center gap-2 text-white">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600/20 rounded-xl flex items-center justify-center overflow-hidden border border-blue-500/20">
                                        <img 
                                            src={editingContent.imagePath?.startsWith('http') ? editingContent.imagePath : `${BACKEND_URL}${editingContent.imagePath}`} 
                                            className="w-full h-full object-cover"
                                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/100x100/18181b/ffffff?text=...'; }}
                                        />
                                    </div>
                                    Update Content
                                </h3>
                                <button onClick={() => setEditingContent(null)} className="p-2 text-zinc-500"><X className="w-5 h-5" /></button>
                            </div>

                            <div className="space-y-4 sm:space-y-6">
                                <div>
                                    <label className="block text-[8px] font-black text-zinc-500 mb-2 uppercase tracking-widest">Content Type</label>
                                    <div className="grid grid-cols-5 gap-1.5 border border-zinc-900 rounded-lg p-1 bg-zinc-900/50">
                                        {CONTENT_TYPES.map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => setEditType(t.id)}
                                                className={`flex flex-col items-center gap-1 p-2 rounded-md transition-all ${editType === t.id ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                                            >
                                                <t.icon className="w-4 h-4" />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[8px] font-black text-zinc-500 mb-2 uppercase tracking-widest">Title</label>
                                    <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg sm:rounded-2xl px-3 py-2 sm:px-5 sm:py-4 text-[10px] sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none text-white transition-all" placeholder="Content title..." />
                                </div>

                                {editType === 'text' ? (
                                    <textarea value={editText} onChange={e => setEditText(e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-[10px] h-24 focus:ring-2 focus:ring-blue-500 outline-none text-white transition-all" placeholder="Your secret message..." />
                                ) : (
                                    <div className="space-y-3">
                                        <div className="relative border-2 border-dashed border-zinc-800 rounded-lg p-4 text-center hover:bg-white/5 transition-colors cursor-pointer group">
                                            <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={e => { if (e.target.files) setEditFile(e.target.files[0]) }} />
                                            <UploadCloud className="w-5 h-5 text-zinc-600 mx-auto mb-1 group-hover:text-blue-500" />
                                            <p className="text-[9px] font-bold text-zinc-400">{editFile ? editFile.name : 'Replace attached file'}</p>
                                        </div>
                                        <input type="text" value={editUrl} onChange={e => setEditUrl(e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-[10px] focus:ring-2 focus:ring-blue-500 outline-none text-white transition-all font-mono" placeholder="Or enter URL" />
                                    </div>
                                )}

                                <button
                                    onClick={handleEditSubmit}
                                    disabled={editSubmitting}
                                    className="w-full bg-blue-600 text-white font-black py-3 rounded-lg flex items-center justify-center gap-2 active:scale-95 transition-all text-[10px] tracking-widest uppercase disabled:opacity-50 mt-2"
                                >
                                    {editSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Changes'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>


        </div>
    );
}
