import { useState, useEffect } from 'react';
import { analyzeMeetingContext } from '@/app/actions';

/**
 * Enterprise Orchestrator.
 * Connects live transcript stream to server-side intelligence.
 */
export function useMeetingProcessor(transcript: string) {
    const [intel, setIntel] = useState<{
        pulse: string;
        criticalPath: string[];
        actionItems: string[];
        sentiment: string;
    } | null>(null);

    useEffect(() => {
        if (transcript.split(' ').length > 10) {
            const debounce = setTimeout(async () => {
                const result = await analyzeMeetingContext(transcript, []);
                setIntel(result);
            }, 1000);
            return () => clearTimeout(debounce);
        }
    }, [transcript]);

    return intel;
}
