"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Mic, Activity, Zap, FileSearch, ShieldCheck } from "lucide-react";
import { useState } from "react";

export default function Home() {
    const [isRecording, setIsRecording] = useState(false);

    return (
        <div className="flex flex-col h-screen text-white">
            {/* Dynamic Header */}
            <header className="flex justify-between items-center p-4 border-b border-zinc-900 bg-black/80 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse ring-4 ring-red-500/20' : 'bg-zinc-700'}`} />
                    <h1 className="text-[14px] font-black uppercase tracking-[0.2em] text-zinc-400">MeetingIQ <span className="text-zinc-600 font-normal">v3</span></h1>
                </div>
                <button
                    onClick={() => setIsRecording(!isRecording)}
                    className={`px-4 py-1.5 rounded-full text-[11px] font-bold tracking-widest transition-all ${isRecording
                            ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                            : 'bg-white text-black hover:scale-105 active:scale-95'
                        }`}
                >
                    {isRecording ? 'STOP SESSION' : 'START INTELLIGENCE'}
                </button>
            </header>

            {/* Intelligence Grid */}
            <div className="flex-1 flex flex-col gap-6 p-6 overflow-y-auto no-scrollbar">

                {/* Sentiment & Pulse Layer */}
                <section className="space-y-4">
                    <div className="flex justify-between items-end">
                        <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Strategic Pulse</h2>
                        <div className="flex gap-1">
                            {[1, 2, 3].map(i => <div key={i} className="w-1 h-3 bg-zinc-800 rounded-full" />)}
                        </div>
                    </div>
                    <div className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-xl relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                        <p className="text-[14px] leading-relaxed text-zinc-300 font-medium">
                            Monitoring meeting dynamics. Grounding against <span className="text-blue-400">Enterprise Context</span>...
                        </p>
                    </div>
                </section>

                {/* Hero Card Stack (Micro-Briefings) */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Zap className="w-3 h-3 text-purple-400" />
                        <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Active Intel</h2>
                    </div>

                    <AnimatePresence>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl space-y-3"
                        >
                            <div className="flex justify-between">
                                <span className="text-[11px] font-black text-purple-400 uppercase italic">Project Phoenix</span>
                                <span className="text-[9px] text-zinc-600 mono">Match 98%</span>
                            </div>
                            <ul className="space-y-2">
                                <li className="flex items-start gap-3">
                                    <div className="w-1 h-1 rounded-full bg-purple-500 mt-1.5" />
                                    <span className="text-[12px] text-zinc-300">Cloud migration mandate (Q4 Deadline)</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-1 h-1 rounded-full bg-purple-500 mt-1.5" />
                                    <span className="text-[12px] text-zinc-300">Critical Stakeholder: Director Sarah</span>
                                </li>
                            </ul>
                        </motion.div>
                    </AnimatePresence>
                </section>

                {/* Critical Path Stack */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Activity className="w-3 h-3 text-blue-400" />
                        <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Action Pulse</h2>
                    </div>
                    <div className="space-y-3">
                        <div className="intel-row">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                            <p className="text-[13px] text-zinc-100 font-semibold italic">Commitment: Sync with GTM by EOW.</p>
                        </div>
                    </div>
                </section>

            </div>

            {/* Footer Controls */}
            <footer className="p-4 border-top border-zinc-900 bg-black">
                <div className="relative group">
                    <input
                        type="text"
                        placeholder="Ask MeetingIQ..."
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-3 px-4 text-[13px] focus:outline-none focus:border-zinc-700 transition-all pl-10"
                    />
                    <FileSearch className="absolute left-3 top-3.5 w-4 h-4 text-zinc-600 group-focus-within:text-zinc-400 transition-colors" />
                </div>
            </footer>
        </div>
    );
}
