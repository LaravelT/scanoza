'use client';
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import {
    getContentList, ARContent, getProducts, getOrders, Product, Order
} from "@/lib/api";
import {
    Image as ImageIcon, Upload, ShoppingBag, Receipt, Scan, BarChart2,
    TrendingUp, Calendar, User, ShoppingCart, ArrowRight, Loader2, Sparkles,
    MousePointerClick, Timer, RefreshCw
} from "lucide-react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { signIn, useSession } from "next-auth/react";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

export default function Dashboard() {
    const { data: session, status } = useSession();
    
    // Core Counts State
    const [targets, setTargets] = useState<ARContent[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            // Get targets if authenticated
            let targetList: ARContent[] = [];
            if (session?.user?.email) {
                const res = await getContentList(session.user.email);
                targetList = res.data;
                setTargets(targetList);
            }

            // Get products
            const prodRes = await getProducts();
            setProducts(prodRes.data);

            // Get orders
            const orderRes = await getOrders();
            setOrders(orderRes.data);
        } catch (err) {
            console.error("Failed to load dashboard data", err);
            toast.error("Failed to refresh dashboard stats");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [session?.user?.email]);

    useEffect(() => {
        if (status === 'loading') return;
        fetchData();
    }, [status, fetchData]);



    const handleRefresh = () => {
        setRefreshing(true);
        fetchData(true);
    };

    if (status === 'unauthenticated') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
                <div className="w-20 h-20 bg-blue-600/10 rounded-[32px] border border-blue-500/20 flex items-center justify-center mb-8 animate-pulse">
                    <Sparkles className="w-10 h-10 text-blue-500" />
                </div>
                <h1 className="text-3xl font-black tracking-tight uppercase mb-3">FrameStory Admin</h1>
                <p className="text-zinc-500 text-sm max-w-sm mb-8">
                    Access your interactive dashboard, manage markers, and check real-time order data.
                </p>
                <button
                    onClick={() => signIn('google')}
                    className="flex items-center justify-center gap-3 px-8 py-4 bg-white text-black rounded-[20px] font-black uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all hover:bg-zinc-100"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Sign In with Google
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto relative px-4 sm:px-6 pb-20 sm:pb-32 pt-12 sm:pt-14">
            
            {/* Header Block */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-12 border-b border-white/5 pb-8">
                <div>
                    <h1 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-600">
                        WELCOME, {session?.user?.name?.toUpperCase() || 'CREATOR'}
                    </h1>
                    <p className="text-zinc-500 text-sm mt-1">
                        Here is a summary overview of your targets, orders and storefront products.
                    </p>
                </div>
                
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center justify-center gap-2 px-5 py-3.5 bg-zinc-900 border border-white/10 hover:border-white/20 text-white rounded-[20px] font-bold text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> REFRESH STATS
                </button>
            </div>

            {loading ? (
                <div className="space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-44 bg-zinc-900/40 border border-white/5 rounded-[32px] animate-pulse" />
                        ))}
                    </div>
                    <div className="h-96 bg-zinc-900/40 border border-white/5 rounded-[32px] animate-pulse" />
                </div>
            ) : (
                <div className="space-y-12">
                    
                    {/* Stats Counter Rows */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Target Card */}
                        <Link href="/targets" className="block group">
                            <div className="bg-[#0b0b0b] border border-white/5 group-hover:border-blue-500/20 rounded-[32px] p-6 sm:p-8 transition-all hover:translate-y-[-2px] relative overflow-hidden flex items-center justify-between">
                                <div className="space-y-2">
                                    <span className="block text-[10px] font-black tracking-widest text-zinc-500 uppercase">Your Targets</span>
                                    <span className="block text-4xl font-black text-white group-hover:text-blue-400 transition-colors">
                                        {targets.length}
                                    </span>
                                </div>
                                <div className="p-4 bg-blue-500/10 text-blue-400 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                                    <ImageIcon className="w-6 h-6" />
                                </div>
                            </div>
                        </Link>

                        {/* Product Card */}
                        <Link href="/products" className="block group">
                            <div className="bg-[#0b0b0b] border border-white/5 group-hover:border-green-500/20 rounded-[32px] p-6 sm:p-8 transition-all hover:translate-y-[-2px] relative overflow-hidden flex items-center justify-between">
                                <div className="space-y-2">
                                    <span className="block text-[10px] font-black tracking-widest text-zinc-500 uppercase">Store Products</span>
                                    <span className="block text-4xl font-black text-white group-hover:text-green-400 transition-colors">
                                        {products.length}
                                    </span>
                                </div>
                                <div className="p-4 bg-green-500/10 text-green-400 rounded-2xl group-hover:bg-green-600 group-hover:text-white transition-all">
                                    <ShoppingBag className="w-6 h-6" />
                                </div>
                            </div>
                        </Link>

                        {/* Orders Card */}
                        <Link href="/orders" className="block group">
                            <div className="bg-[#0b0b0b] border border-white/5 group-hover:border-purple-500/20 rounded-[32px] p-6 sm:p-8 transition-all hover:translate-y-[-2px] relative overflow-hidden flex items-center justify-between">
                                <div className="space-y-2">
                                    <span className="block text-[10px] font-black tracking-widest text-zinc-500 uppercase">Placed Orders</span>
                                    <span className="block text-4xl font-black text-white group-hover:text-purple-400 transition-colors">
                                        {orders.length}
                                    </span>
                                </div>
                                <div className="p-4 bg-purple-500/10 text-purple-400 rounded-2xl group-hover:bg-purple-600 group-hover:text-white transition-all">
                                    <Receipt className="w-6 h-6" />
                                </div>
                            </div>
                        </Link>
                    </div>



                    {/* Split View: Recent Targets & Recent Orders */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        
                        {/* Recent Targets */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Recent Targets</h3>
                                <Link href="/targets" className="text-xs font-bold text-blue-500 hover:underline flex items-center gap-1">
                                    View All <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>

                            <div className="space-y-4 bg-zinc-900/10 border border-white/5 rounded-[32px] p-4 sm:p-6">
                                {targets.length > 0 ? (
                                    targets.slice(0, 3).map((item) => (
                                        <div key={item.contentId} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-[20px] transition-colors border border-transparent hover:border-white/5">
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 flex-shrink-0">
                                                    <img
                                                        src={item.imagePath.startsWith('http') ? item.imagePath : `${BACKEND_URL}${item.imagePath}`}
                                                        alt={item.originalImageName}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/100x100/18181b/ffffff?text=Img'; }}
                                                    />
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="block text-sm font-bold text-white truncate">{item.originalImageName}</span>
                                                    <span className="inline-block text-[9px] font-black uppercase tracking-wider text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/10 mt-1">
                                                        {item.type}
                                                    </span>
                                                </div>
                                            </div>
                                             <span className="text-xs text-zinc-500 font-medium whitespace-nowrap">
                                                 {(() => {
                                                     const date = new Date(item.createdAt);
                                                     const dd = String(date.getDate()).padStart(2, '0');
                                                     const mm = String(date.getMonth() + 1).padStart(2, '0');
                                                     const yy = String(date.getFullYear()).slice(-2);
                                                     return `${dd}/${mm}/${yy}`;
                                                 })()}
                                             </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-12 text-center text-xs text-zinc-600 font-medium">No target markers uploaded yet.</div>
                                )}
                            </div>
                        </div>

                        {/* Recent Orders */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Recent Storefront Orders</h3>
                                <Link href="/orders" className="text-xs font-bold text-purple-500 hover:underline flex items-center gap-1">
                                    View All <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>

                            <div className="space-y-4 bg-zinc-900/10 border border-white/5 rounded-[32px] p-4 sm:p-6">
                                {orders.length > 0 ? (
                                    orders.slice(0, 3).map((item) => (
                                        <div key={item.orderId} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-[20px] transition-colors border border-transparent hover:border-white/5">
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/10 flex items-center justify-center flex-shrink-0">
                                                    <User className="w-5 h-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="block text-sm font-bold text-white truncate">{item.customerDetails.name}</span>
                                                    <span className="block text-[10px] text-zinc-500 truncate leading-none mt-1">
                                                        {item.items.length} frame{item.items.length > 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="block text-sm font-black text-white">{item.total}</span>
                                                <span className="text-[9px] font-black text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded uppercase mt-1 inline-block">
                                                    {item.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-12 text-center text-xs text-zinc-600 font-medium">No customer orders placed yet.</div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
