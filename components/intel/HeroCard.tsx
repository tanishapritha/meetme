import { motion } from "framer-motion";

interface HeroCardProps {
    entity: string;
    bullets: string[];
    relevance: number;
}

/**
 * Enterprise Micro-Briefing Card.
 * High-fidelity visual for instant context injection.
 */
export const HeroCard = ({ entity, bullets, relevance }: HeroCardProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-5 bg-zinc-900 shadow-2xl border border-zinc-800 rounded-2xl relative overflow-hidden group"
        >
            <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-100 transition-opacity">
                <span className="text-[8px] font-mono font-bold tracking-tighter">REF_{relevance}%</span>
            </div>

            <div className="space-y-4">
                <div>
                    <span className="text-[10px] uppercase tracking-[0.3em] text-blue-500 font-black">Entity Match</span>
                    <h3 className="text-xl font-black tracking-tight mt-1">{entity}</h3>
                </div>

                <ul className="space-y-3">
                    {bullets.map((bullet, idx) => (
                        <li key={idx} className="flex items-start gap-4">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                            <p className="text-[13px] text-zinc-400 font-medium leading-relaxed">{bullet}</p>
                        </li>
                    ))}
                </ul>
            </div>
        </motion.div>
    );
};
