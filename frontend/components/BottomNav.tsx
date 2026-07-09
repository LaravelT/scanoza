'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Image, ShoppingBag, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const BottomNav = () => {
    const pathname = usePathname();

    const navItems = [
        { name: 'Home', icon: Home, path: '/' },
        { name: 'Targets', icon: Image, path: '/targets' },
        { name: 'Products', icon: ShoppingBag, path: '/products' },
        { name: 'Orders', icon: Receipt, path: '/orders' },
    ];

    // Hide on AR/Scan pages
    const isFullScreen = pathname.startsWith('/scan') || pathname.startsWith('/ar');
    if (isFullScreen) return null;

    return (
        <div className="lg:hidden fixed bottom-2 left-1/2 -translate-x-1/2 z-50 w-[96%] max-w-sm">
            <nav className="bg-zinc-900/95 backdrop-blur-3xl border border-white/5 rounded-[20px] flex items-center justify-around px-1 py-1 sm:px-2 sm:py-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                {navItems.map((item) => {
                    const isActive = pathname === item.path;
                    const Icon = item.icon;



                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={cn(
                                "flex flex-col items-center justify-center py-1 sm:py-2 px-1 sm:px-4 rounded-xl transition-all relative flex-1",
                                isActive ? "text-white" : "text-zinc-500"
                            )}
                        >
                            <div className={cn(
                                "p-1 sm:p-2 rounded-xl transition-all mb-0.5",
                                isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "bg-transparent"
                            )}>
                                <Icon className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                            </div>
                            <span className="text-[7px] sm:text-[9px] font-bold uppercase tracking-tighter truncate w-full text-center">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
};

export default BottomNav;
