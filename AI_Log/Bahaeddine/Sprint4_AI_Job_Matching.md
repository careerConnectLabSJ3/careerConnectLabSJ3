# Sprint 4 AI usage — Issue #68

Date: 2026-11-25

Tool: OpenAI Codex coding assistant.

Request: Implement personalized AI job matching with explicit confirmation, combine recent searches with professional profile and resume, and use search-only algorithmic recommendations when AI is not confirmed.

Contribution: Implemented a protected recommendation endpoint, search-recency ranking, per-run Anthropic confirmation, profile/PDF matching, response validation, dashboard controls and filters, reuse of existing save/apply details flow, automated server/client tests and setup documentation.

Verification: Automated tests use mocked provider responses and fictional qualifications. No real API key is included in source, logs or test fixtures. The provider document format was checked against official Anthropic documentation. Human review of recommendation quality with representative resumes remains useful before release.

Follow-up: Expanded search-only ranking to whole words, phrases, common abbreviations, curated synonyms and job-field themes. Added field weighting, coverage scoring, modest recency preference and explainable term matches. Targeted tests cover synonym/theme order, punctuation, substring avoidance, coverage, field weighting, repetition and deterministic ties.

Follow-up: Persist the last 10 searches across sessions without a time-based expiry. Return at most four recommendations in both modes, retaining weak thematic matches below strong matches. Added history-retention and four-result-limit regression tests.

Follow-up: Increased retained history to 100 searches. Separated fast read-only listing refreshes from history saves after 1.2 seconds of idle typing. AI now examines every eligible open posting in batches of 40 with full saved search history, accepts reasonable partial matches, merges the best four, and reports batch failures without presenting incomplete results as a full review.

Bug fix: Reproduced Frontend and Janitor exact-title jobs falling to fifth place because scores from many older searches were summed without a bound. Prioritized direct title matches for the latest search, bounded historical relevance, retained literal words within recognized phrases, and added janitor/custodian/cleaner vocabulary. Added ranking and API regressions for both reported searches.

Follow-up: Treat four cards as a target rather than just a maximum. Fill remaining slots using search matches and then honestly labeled broader open opportunities when history or AI matches exist. Keep ranked reserves to refill after filters or applications. No history and no AI matches still produces an empty list; unavailable or already-applied postings remain excluded.
