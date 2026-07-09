'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut, signIn } from 'next-auth/react';
import {
    LayoutDashboard, Upload,
    LogOut, Menu, X as CloseIcon, ArrowLeft,
    Image, ShoppingBag, Receipt
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const Sidebar = () => {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [isOpen, setIsOpen] = useState(false);

    const toggleSidebar = () => setIsOpen(!isOpen);
    const navItems = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
        { name: 'Your Targets', icon: Image, path: '/targets' },
        { name: 'New Target', icon: Upload, path: '/upload' },
        { name: 'Products', icon: ShoppingBag, path: '/products' },
        { name: 'Orders', icon: Receipt, path: '/orders' },
    ];

    // Non-dashboard pages show a back button on mobile instead of the full sidebar toggle in some layouts, 
    // but here we keep the top bar for consistent branding if on the main routes.
    const isDashboard = pathname === '/';

    return (
        <>
            {/* Mobile Top Bar */}
            {/* Mobile Top Bar - Simplified Header */}
            <div className={cn(
                "lg:hidden fixed top-0 left-0 right-0 h-10 sm:h-16 flex items-center justify-between px-3 sm:px-6 z-[60] bg-black/80 backdrop-blur-xl border-b border-white/5",
                !isDashboard && "opacity-0 pointer-events-none"
            )}>
                <div className="flex items-center gap-2 sm:gap-4 mb-1 sm:mb-0">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-5 h-5 sm:w-8 sm:h-8 bg-black rounded-lg sm:rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 border border-white/10">
                            <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
                        </div>
                        <span className="font-black text-[13px] sm:text-xl tracking-tighter text-white flex items-center gap-1 sm:gap-2 leading-none mt-0.5">
                            FrameStory Admin
                        </span>
                    </div>
                </div>
                <button
                    onClick={toggleSidebar}
                    className="p-1 sm:p-2 text-white active:scale-90 transition-transform mb-1 sm:mb-0"
                >
                    <Menu className="w-4 h-4 sm:w-6 sm:h-6" />
                </button>
            </div>

            {/* Backdrop for mobile */}
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70] lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <aside className={cn(
                "fixed left-0 top-0 h-screen w-72 bg-[#06070a] border-r border-white/5 z-[80] transition-transform duration-500 ease-out lg:translate-x-0 flex flex-col",
                isOpen ? "translate-x-0 shadow-[20px_0_50px_rgba(0,0,0,0.5)]" : "-translate-x-full"
            )}>
                {/* Logo Section */}
                <div className="p-8 pb-0">
                    <div className="flex items-center gap-4 py-4 px-2">
                        <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/10 overflow-hidden border border-white/10">
                            <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <span className="block font-black text-xl tracking-tighter text-white leading-none">FrameStory Admin</span>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                                <span className="text-[10px] font-bold text-zinc-500 tracking-[0.2em] uppercase">Core Online</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Nav Links */}
                <nav className="px-4 space-y-2 py-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                onClick={() => setIsOpen(false)}
                                className={cn(
                                    "flex items-center gap-4 px-5 py-4 rounded-[20px] transition-all duration-300 group relative overflow-hidden",
                                    isActive
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                                        : "text-zinc-500 hover:text-white hover:bg-white/5"
                                )}
                            >
                                <item.icon className={cn(
                                    "w-5 h-5 transition-transform duration-300 group-hover:scale-110 z-10",
                                    isActive ? "text-white" : "text-zinc-600 group-hover:text-blue-400"
                                )} />
                                <span className="font-bold text-sm tracking-tight z-10">{item.name}</span>

                                {isActive && (
                                    <motion.div
                                        layoutId="active-highlight"
                                        className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 z-0"
                                    />
                                )}
                            </Link>
                        );
                    })}

                    {/* User Profile / Google Auth Button - Directly below nav items */}
                    <div className="pt-4 space-y-2">
                        {session ? (
                            <div className="p-4 bg-white/5 rounded-[20px] flex items-center justify-between group border border-white/5">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    {session.user?.image ? (
                                        <img src={session.user.image} alt="Avatar" className="w-8 h-8 rounded-full border border-white/10" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white">
                                            {session.user?.email?.[0].toUpperCase()}
                                        </div>
                                    )}
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="text-xs font-bold text-white truncate">{session.user?.name || 'User'}</span>
                                        <span className="text-[10px] text-zinc-500 truncate">{session.user?.email}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => signOut()}
                                    className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                                    title="Sign Out"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => signIn('google')}
                                className="flex items-center justify-center gap-3 w-full py-4 bg-white text-black rounded-[20px] font-black uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all hover:bg-zinc-100"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Sign In with Google
                            </button>
                        )}
                    </div>
                </nav>



            </aside >
        </>
    );
};

export default Sidebar;
