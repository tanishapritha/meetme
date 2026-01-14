/**
 * Strategic Intelligence Engine
 * Specialized for OpenRouter lightning-fast delivery.
 */
async function generateStructuredInsights(apiKey, transcript, documents, provider = 'openrouter') {
    if (!apiKey || !transcript) return null;

    // OpenRouter Key Detection
    const isOR = apiKey.startsWith('sk-or-');
    const actualProvider = isOR ? 'openrouter' : provider;

    // RAG Context Injection (Top relevant chunks)
    const docContext = documents && documents.length > 0
        ? documents.map((content, i) => `[FRAGMENT ${i + 1}]: ${content}`).join('\n')
        : "No relevant documents found.";

    const prompt = `[TRANSCRIPT]: "${transcript}"
    [DOCS]: ${docContext}
    [TASK]: Return ultra-short JSON for stable UI:
    "pulse": 10-word max strategy.
    "criticalPath": [2 items max].
    "actionItems": [Extract commitments like "I will...", "Let's do..."],
    "sentiment": "CALM" | "TENSE" | "PRODUCTIVE",
    "grounding": { "matchFound": bool, "type": "SYNC"/"CONFLICT", "detail": 15-word max }`;

    try {
        let response;
        if (actualProvider === 'openrouter') {
            response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://meetingiq.local",
                    "X-Title": "MeetingIQ"
                },
                body: JSON.stringify({
                    "model": "xiaomi/mimo-v2-flash:free",
                    "messages": [{ "role": "user", "content": prompt }],
                    "max_tokens": 300,
                    "include_reasoning": false
                })
            });
        } else {
            const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
            response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.1, maxOutputTokens: 300 }
                })
            });
        }

        if (!response.ok) {
            const errBody = await response.text();
            console.error('Provider Error:', errBody);
            return null;
        }

        const data = await response.json();
        let textResponse;

        if (actualProvider === 'openrouter') {
            textResponse = data.choices[0].message.content;
        } else {
            textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        }

        if (textResponse) {
            // Robust Extraction: Find JSON block even if model "yaps"
            const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        }
        return null;
    } catch (err) {
        console.error('Intelligence Engine Error:', err);
        return null;
    }
}

/**
 * Sprint 2: Contextual Flashback
 * Answers questions based strictly on the live meeting transcript.
 */
async function askMeeting(apiKey, question, transcript, provider = 'openrouter') {
    if (!apiKey || !transcript || !question) return "Missing context.";

    const prompt = `[MEETING HISTORY]: ${transcript.slice(-1000)}
    [USER QUESTION]: ${question}
    [TASK]: Answer the question using ONLY the provided meeting history. Be ultra-brief (max 20 words). If unknown, say "Not mentioned yet."`;

    try {
        let response;
        if (apiKey.startsWith('sk-or-')) {
            response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": "xiaomi/mimo-v2-flash:free",
                    "messages": [{ "role": "user", "content": prompt }],
                    "max_tokens": 100
                })
            });
        } else {
            const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
            response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
        }

        if (!response.ok) return "Service busy.";
        const data = await response.json();
        const answer = apiKey.startsWith('sk-or-')
            ? data.choices[0].message.content
            : data.candidates[0].content.parts[0].text;

        return answer.trim();
    } catch (err) {
        return "Insight calculation error.";
    }
}

/**
 * Sprint 3: Executive Briefing
 * Synthesizes all meeting data into a professional executive summary.
 */
async function generateExecutiveBriefing(apiKey, fullTranscript, actionItems, groundedInsights, provider = 'openrouter') {
    if (!apiKey || !fullTranscript) return "No data available for briefing.";

    const prompt = `[MEETING DATA]:
    Transcript snippet: ${fullTranscript.slice(-2000)}
    Pending Actions: ${actionItems.join(', ')}
    Knowledge Syncs: ${groundedInsights.join(', ')}

    [TASK]: Act as a Lead Strategist at an MNC. Draft a 3-paragraph executive summary. 
    Use headers: ## EXECUTIVE SUMMARY, ## STRATEGIC ALIGNMENT, ## NEXT STEPS.
    Keep it formal, punchy, and professional. Return Markdown text only.`;

    try {
        let response;
        if (apiKey.startsWith('sk-or-')) {
            response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    "model": "xiaomi/mimo-v2-flash:free",
                    "messages": [{ "role": "user", "content": prompt }]
                })
            });
        } else {
            const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
            response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
        }

        if (!response.ok) return "Failed to generate briefing.";
        const data = await response.json();
        return apiKey.startsWith('sk-or-')
            ? data.choices[0].message.content
            : data.candidates[0].content.parts[0].text;
    } catch (err) {
        return "Internal briefing compilation error.";
    }
}
