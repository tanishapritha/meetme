/**
 * Context Extraction using Compromise.js
 * Extracts topics, entities, keywords, and questions from transcript text.
 */
function extractContext(text) {
    if (!text || !window.nlp) return { topics: [], entities: [], keywords: [], questions: [] };

    const doc = nlp(text);

    // 1. Entities (People, Places, Organizations)
    const people = doc.people().out('array');
    const places = doc.places().out('array');
    const orgs = doc.organizations().out('array');
    const entities = [...new Set([...people, ...places, ...orgs])].slice(0, 10);

    // 2. Topics (Nouns and Noun Phrases)
    const topics = doc.nouns().toSingular().out('array');
    const uniqueTopics = [...new Set(topics)]
        .filter(t => t.length > 3)
        .slice(0, 10);

    // 3. Questions
    const questions = doc.questions().out('array').slice(0, 3);

    // 4. Keywords (Verbs and Adjectives that might be important)
    const keywords = doc.verbs().out('array').concat(doc.adjectives().out('array'))
        .filter(k => k.length > 4)
        .slice(0, 10);

    return {
        topics: uniqueTopics,
        entities: entities,
        keywords: keywords,
        questions: questions
    };
}
