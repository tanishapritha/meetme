/**
 * Smart Search utility enhancing Fuse.js with weighted multi-term queries.
 */
function performSmartSearch(fuse, context) {
    if (!fuse || !context) return [];

    // Construct a weighted query string
    // Topics (3x), entities (2x), keywords (1x)
    const topicQueries = context.topics.map(t => t);
    const entityQueries = context.entities.map(e => e);
    const keywordQueries = context.keywords.map(k => k);

    // Fuse.js supports extended search if initialized with { useExtendedSearch: true }
    // But since we are using basic Fuse, we can just join terms or use multi-term queries

    // We'll create a single query string but prioritize topics
    const queryParts = [
        ...topicQueries, ...topicQueries, ...topicQueries, // 3x
        ...entityQueries, ...entityQueries,                // 2x
        ...keywordQueries                                   // 1x
    ];

    if (queryParts.length === 0) return [];

    const query = [...new Set(queryParts)].join(' ');
    const results = fuse.search(query);

    // Limit to top 5 and include score mapping
    return results.slice(0, 5).map(res => ({
        ...res,
        relevanceScore: Math.round((1 - res.score) * 100),
        matchCount: calculateMatchCount(res.item, context)
    }));
}

function calculateMatchCount(item, context) {
    let count = 0;
    // Handle both Docs (with titles) and Fragments (only content)
    const title = item.title || "";
    const content = item.content || "";
    const tags = item.tags ? item.tags.join(' ') : "";
    const fullText = (title + ' ' + content + ' ' + tags).toLowerCase();

    [...context.topics, ...context.entities, ...context.keywords].forEach(term => {
        if (fullText.includes(term.toLowerCase())) {
            count++;
        }
    });

    return count;
}
