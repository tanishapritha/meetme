import { motion, AnimatePresence } from "framer-motion";

interface AuditHitProps {
    type: "SYNC" | "CONFLICT";
    detail: string;
}

/**
 * Enterprise Audit Feed.
 * Stacks rolling intelligence hits from the RAG engine.
 */
export const AuditFeed = ({ hits }: { hits: AuditHitProps[] }) => {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Neural Grounding</h2>
                <span className="text-[8px] font-mono text-zinc-600 uppercase">Audit_Active</span>
            </div>

            <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                    {hits.map((hit, idx) => (
                        <motion.div
                            key={hit.detail} // Usually would use a unique ID
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={`p-4 rounded-xl border-l-2 ${hit.type === 'CONFLICT'
                                    ? 'border-red-500 bg-red-500/5'
                                    : 'border-zinc-400 bg-zinc-900/50'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-[9px] font-black mono ${hit.type === 'CONFLICT' ? 'text-red-500' : 'text-emerald-500'
                                    }`}>
                                    {hit.type === 'CONFLICT' ? 'CONFLICT_DETECTED' : 'RELEVANT_DOC_SYNC'}
                                </span>
                                <span className="text-[8px] text-zinc-600 mono uppercase">Audit Hit</span>
                            </div>
                            <p className="text-[13px] text-zinc-100 font-medium leading-relaxed italic">
                                {hit.detail}
                            </p>
                        </motion.div>
                    ))}
                    {hits.length === 0 && (
                        <div className="py-8 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-xl">
                            <p className="text-[11px] text-zinc-600 uppercase tracking-widest">Awaiting Contextual Match</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
