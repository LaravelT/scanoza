'use client';
import UploadForm from "@/components/UploadForm";
import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { motion } from "framer-motion";

export default function UploadPage() {
    const { data: session, status } = useSession();

    if (status === "loading") {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!session) {
        return (
            <div className="max-w-md mx-auto px-6 py-20 text-center">
                <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center mx-auto mb-8 text-blue-500">
                    <Lock className="w-10 h-10" />
                </div>
                <h1 className="text-3xl font-black uppercase tracking-tighter mb-4">Authentication Required</h1>
                <p className="text-zinc-500 mb-10 text-sm leading-relaxed">
                    You must be signed in with your Google account to create and manage AR targets.
                </p>
                <button
                    onClick={() => signIn('google')}
                    className="flex items-center justify-center gap-3 w-full py-5 bg-white text-black rounded-[24px] font-black uppercase tracking-widest text-sm shadow-2xl active:scale-95 transition-all hover:bg-zinc-100"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                </button>
                <Link href="/" className="inline-block mt-8 text-zinc-600 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">
                    Back to Dashboard
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-1 sm:px-4 pt-10 sm:pt-4">
            <header className="mb-4 sm:mb-12">
                <Link href="/" className="inline-flex items-center gap-1 sm:gap-2 text-zinc-500 hover:text-white transition-colors text-[10px] sm:text-sm font-medium mb-2 sm:mb-6 group mt-2 sm:mt-0">
                    <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Dashboard
                </Link>
                <h1 className="text-2xl sm:text-4xl font-black mb-1 sm:mb-3 tracking-tight uppercase">New Target</h1>
                <p className="text-zinc-500 text-[9px] sm:text-lg leading-tight sm:leading-normal border-b border-zinc-900/50 pb-2 mb-2">Define the image trigger and the video overlay for your AR experience.</p>
            </header>

            <UploadForm />

            <section className="mt-8 sm:mt-20 border-t border-zinc-900 pt-4 sm:pt-10">
                <h3 className="text-[9px] sm:text-sm font-bold text-zinc-700 uppercase tracking-widest mb-3 sm:mb-6">Best Practices for AR Targets</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-8">
                    <div className="space-y-0.5 sm:space-y-2">
                        <h4 className="font-bold text-zinc-300 text-[10px] sm:text-base">High Contrast</h4>
                        <p className="text-[8px] sm:text-xs text-zinc-500 leading-relaxed">Avoid blurry or low-contrast images. Patterns and sharp edges work best for ORB detection.</p>
                    </div>
                    <div className="space-y-0.5 sm:space-y-2">
                        <h4 className="font-bold text-zinc-300 text-[10px] sm:text-base">Asymmetric Design</h4>
                        <p className="text-[8px] sm:text-xs text-zinc-500 leading-relaxed">Avoid symmetrical patterns (like perfect circles) to help the system determine orientation.</p>
                    </div>
                    <div className="space-y-0.5 sm:space-y-2">
                        <h4 className="font-bold text-zinc-300 text-[10px] sm:text-base">Non-Reflective</h4>
                        <p className="text-[8px] sm:text-xs text-zinc-500 leading-relaxed">Use matte surfaces for physical targets to minimize glare from the camera lens.</p>
                    </div>
                </div>
            </section>
        </div>
    );
}
