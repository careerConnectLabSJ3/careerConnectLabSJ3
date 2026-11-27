// Curated vocabulary: synonyms are stronger evidence than shared field themes.
// Keep themes narrow; unrelated jobs must not match generic words like "work".
const vocabulary = [
    ['software', ['software'], ['software']],
    ['engineering', ['engineer', 'engineers', 'engineering'], ['software', 'mechanical', 'electrical', 'civil']],
    ['developer', ['developer', 'developers', 'programmer', 'programmers', 'software engineer', 'software engineering', 'software developer', 'coding', 'programming'], ['software']],
    ['frontend', ['frontend', 'front end', 'front-end', 'web developer', 'web development'], ['software', 'web']],
    ['backend', ['backend', 'back end', 'back-end', 'server side'], ['software']],
    ['fullstack', ['fullstack', 'full stack', 'full-stack'], ['software', 'web']],
    ['javascript', ['javascript', 'js', 'ecmascript'], ['web']],
    ['typescript', ['typescript', 'ts'], ['web']],
    ['react', ['react', 'reactjs', 'react.js'], ['web']],
    ['node', ['node.js', 'nodejs'], ['software']],
    ['python', ['python'], ['software', 'data']],
    ['cpp', ['c++', 'cpp'], ['software']],
    ['csharp', ['c#', 'csharp'], ['software']],
    ['dotnet', ['.net', 'dotnet', 'asp.net'], ['software']],
    ['java', ['java'], ['software']],
    ['data', ['data analyst', 'data analytics', 'data analysis', 'analytics'], ['data']],
    ['sql', ['sql', 'structured query language'], ['data', 'database']],
    ['database', ['database', 'databases'], ['database']],
    ['postgres', ['postgresql', 'postgres'], ['database']],
    ['mysql', ['mysql'], ['database']],
    ['mongodb', ['mongodb', 'mongo'], ['database']],
    ['ml', ['machine learning', 'ml'], ['data', 'ai']],
    ['ai', ['artificial intelligence', 'ai'], ['ai']],
    ['security', ['cybersecurity', 'cyber security', 'information security', 'infosec'], ['security']],
    ['devops', ['devops', 'site reliability engineer', 'sre'], ['infrastructure']],
    ['cloud', ['cloud'], ['infrastructure']],
    ['aws', ['aws', 'amazon web services'], ['infrastructure']],
    ['azure', ['azure', 'microsoft azure'], ['infrastructure']],
    ['gcp', ['google cloud', 'gcp'], ['infrastructure']],
    ['qa', ['quality assurance', 'qa', 'software testing', 'software tester'], ['software']],
    ['design', ['ux', 'user experience', 'ui', 'user interface', 'product designer'], ['design']],
    ['graphics', ['graphic design', 'graphic designer', 'illustrator'], ['design']],
    ['nurse', ['nurse', 'nurses', 'nursing', 'registered nurse', 'rn'], ['healthcare']],
    ['healthcare', ['healthcare', 'health care', 'medical', 'clinical', 'patient care'], ['healthcare']],
    ['physician', ['physician', 'doctor'], ['healthcare']],
    ['pharmacy', ['pharmacist', 'pharmacy'], ['healthcare']],
    ['accounting', ['accounting', 'accountant', 'accountants', 'bookkeeping', 'bookkeeper'], ['finance']],
    ['finance', ['finance', 'financial', 'banking', 'financial analyst'], ['finance']],
    ['marketing', ['marketing', 'digital marketing', 'advertising'], ['marketing']],
    ['seo', ['seo', 'search engine optimization'], ['marketing']],
    ['sales', ['sales', 'salesperson', 'sales representative', 'account executive'], ['sales']],
    ['support', ['customer support', 'customer service', 'customer care', 'help desk', 'helpdesk'], ['support']],
    ['hr', ['human resources', 'hr', 'human resource'], ['hr']],
    ['recruiting', ['recruiting', 'recruitment', 'recruiter', 'talent acquisition'], ['hr']],
    ['teaching', ['teacher', 'teachers', 'teaching', 'educator', 'instructor'], ['education']],
    ['education', ['education', 'tutor', 'tutoring', 'curriculum'], ['education']],
    ['logistics', ['logistics', 'supply chain', 'warehousing', 'warehouse'], ['logistics']],
    ['mechanical', ['mechanical engineering', 'mechanical engineer', 'mechanical'], ['mechanical']],
    ['electrical', ['electrical engineering', 'electrical engineer', 'electrical', 'electronics'], ['electrical']],
    ['civil', ['civil engineering', 'civil engineer', 'construction'], ['civil']],
    ['legal', ['legal', 'law', 'lawyer', 'attorney', 'paralegal'], ['legal']],
    ['hospitality', ['hospitality', 'hotel', 'hotels', 'guest services'], ['hospitality']],
    ['culinary', ['culinary', 'chef', 'cook', 'cooking'], ['hospitality']],
    ['manufacturing', ['manufacturing', 'production operator', 'machinist', 'assembly'], ['manufacturing']],
    ['janitor', ['janitor', 'janitors', 'janitorial', 'custodian', 'custodians', 'custodial', 'cleaner', 'cleaners', 'cleaning'], ['facilities']],
    ['remote', ['remote', 'work from home', 'wfh', 'telecommute', 'telecommuting'], []],
    ['intern', ['intern', 'internship', 'internships'], []],
    ['junior', ['junior', 'entry level', 'entry-level'], []]
];
const stopWords = new Set('a an the and or for of in on at to with by from as is are be i my me want looking find job jobs work position positions opportunity opportunities hiring role roles'.split(' '));
const words = value => String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').match(/(?:\.[a-z]+|[a-z0-9]+)(?:\.[a-z0-9]+)*(?:\+\+|#)?/g) || [];
const entries = vocabulary.flatMap(([id, aliases, themes]) => aliases.map(alias => ({ id, themes, parts: words(alias) }))).sort((a, b) => b.parts.length - a.parts.length);

function concepts(value) {
    const input = words(value);
    const result = new Map();
    for (let index = 0; index < input.length;) {
        const entry = entries.find(candidate => candidate.parts.every((part, offset) => part === input[index + offset]));
        const parts = entry?.parts || [input[index]];
        const literal = parts.join(' ');
        if (entry || !stopWords.has(literal)) {
            const id = entry?.id || literal;
            if (!result.has(id)) result.set(id, { id, literal, themes: entry?.themes || [] });
        }
        index += parts.length;
    }
    return [...result.values()];
}

const fieldWeights = { title: 1, requirements: 0.9, department: 0.85, description: 0.65, location: 0.5, jobType: 0.5, company: 0.4 };

export function scoreSearchMatches(jobs, searches) {
    const uniqueSearches = [...new Map(searches.map(search => [words(search).join(' '), search])).values()];
    const queries = uniqueSearches.map(concepts).filter(query => query.length);
    return jobs.map(job => {
        const fields = Object.entries(fieldWeights).map(([field, weight]) => ({ field, weight,
            literal: ` ${words(job[field]).join(' ')} `, terms: concepts(job[field]) }));
        let score = 0;
        let historyScore = 0;
        let historyWeight = 0;
        const reasons = new Set();
        for (const [index, query] of queries.entries()) {
            let strength = 0;
            let covered = 0;
            let titleStrength = 0;
            for (const term of query) {
                let best = 0;
                let evidence;
                let titleMatch = 0;
                for (const { field, weight, literal, terms } of fields) {
                    // Phrase recognition must not hide literal words inside a title.
                    if (literal.includes(` ${term.literal} `)) {
                        if (weight > best) {
                            best = weight;
                            evidence = term.literal;
                        }
                        if (field === 'title') titleMatch = 1;
                    }
                    for (const candidate of terms) {
                        const similarity = term.literal === candidate.literal ? 1 : term.id === candidate.id ? 0.85 :
                            term.themes.some(theme => candidate.themes.includes(theme)) ? 0.3 : 0;
                        if (similarity * weight > best) {
                            best = similarity * weight;
                            evidence = candidate.literal;
                        }
                        if (field === 'title' && term.id === candidate.id) titleMatch = Math.max(titleMatch, similarity);
                    }
                }
                titleStrength += titleMatch;
                if (best) {
                    strength += best;
                    covered++;
                    reasons.add(term.literal === evidence ? term.literal : `${term.literal} → ${evidence}`);
                }
            }
            const relevance = strength / query.length * (covered / query.length);
            if (index === 0) {
                // Direct latest-title matches outrank accumulated old interests.
                score = relevance + 2 * titleStrength / query.length;
            } else {
                const weight = 1 / index;
                historyScore += relevance * weight;
                historyWeight += weight;
            }
        }
        // Historical evidence is a bounded average, never an unbounded sum.
        if (historyWeight) score += 0.5 * historyScore / historyWeight;
        return { ...job, score, matchedKeywords: [...reasons],
            explanation: `Matches your search words and related fields: ${[...reasons].slice(0, 8).join(', ')}.` };
    }).filter(job => job.score > 0).sort((a, b) => b.score - a.score || String(a._id).localeCompare(String(b._id)));
}
