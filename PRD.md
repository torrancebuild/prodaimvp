# ProDAI MVP – Product Requirements Document

## 1. Overview

**Product Vision:** Help customer-facing teams transform messy meeting notes into concise, structured summaries that make action items, SOP gaps, and follow-up questions obvious within seconds.

**MVP Goal:** Deliver a single-page web app that accepts raw notes (≤1000 chars) and outputs four clean sections powered by Anthropic Claude 3 Haiku, with optional demo mode for onboarding without API keys.

## 2. Target Users & Needs

| Persona | Needs | Pain Points |
| --- | --- | --- |
| Customer Success Manager | Recap calls quickly, assign ownership, share follow-ups | Manual note cleanup is slow; next steps get lost |
| Operations Leader | Ensure meetings follow SOP/QA standards | Hard to check consistency across teams |
| Product Manager (secondary) | Capture key decisions & risks from discovery calls | Sifting through transcripts is time-consuming |

## 3. Success Metrics

- **Activation:** 80% of new users reach “Generated Summary” at least once.
- **Perceived Quality:** ≥70% of manual evaluations rate outputs “useful” or better across sample set of messy notes.
- **Cycle Time:** Summaries returned in <3 seconds for 90% of requests (excluding demo mode).
- **Retention Proxy:** Auto-save last 10 notes and reload within <500 ms.

## 4. Scope & Requirements

### 4.1 Functional Requirements

1. **Input Experience**
   - Textarea with live character count, min/max enforcement (10–1000 chars).
   - Color-coded warnings for >80% and >95% of limit.
   - Prevent submission if validation fails; show inline error.

2. **Processing UX**
   - Button `Summarize Notes`; disabled while loading.
   - Progress indicator with 6 stages; resets when API completes or fails.

3. **AI Summarization**
   - Default provider: Anthropic Claude 3 Haiku via `/api/summarize` POST.
   - Prompt must request JSON response in the following shape:

```json
{
  "meetingType": "string",
  "keyDiscussionPoints": ["bullet", "bullet"],
  "nextSteps": [
    { "owner": "string", "action": "string", "due": "string | null" }
  ],
  "sopChecks": [
    { "category": "Goals", "status": "pass|gap", "note": "string" }
  ],
  "openQuestions": ["bullet", "bullet"],
  "risksOrIssues": ["bullet"]
}
```

   - On malformed JSON, fall back to heuristic extractors (existing action item & SOP utilities) and mark response as partial.
   - Demo mode (no `ANTHROPIC_API_KEY` or `NEXT_PUBLIC_DEMO_MODE=true`) returns mock content matching schema.

4. **Output Presentation**
   - Display sections with consistent headings: “Key Discussion Points”, “Next Steps & Owners”, “SOP Checks”, “Risks & Issues”, “Open Questions”.
   - Bullet formatting: sentence case, no trailing punctuation, highlight gaps/errors with icon (⚠️).
   - Copy-to-clipboard concatenates sections with headings.

5. **History Management**
   - Save each successful summary to Supabase (`meetings`, `meeting_outputs`).
   - Auto-trim to last 10 records, newest first.
   - `Load History` button fetches entries and lists title, note preview, date.

6. **Error Handling**
   - API should return actionable message for: missing key, insufficient credits, rate limiting, model timeout.
   - UI displays dismissible error card on failure; progress indicator stops.

### 4.2 Non-Functional Requirements

- **Performance:** End-to-end response (client click → rendered summary) <3 s average with Claude; demo mode within 3.5 s simulated delay.
- **Reliability:** API retries once on transient network failure; server logs errors with request ID.
- **Security:** Keys stay server-side; `SUPABASE_SERVICE_ROLE_KEY` never exposed to client.
- **Accessibility:** Components keyboard accessible; color choices meet AA contrast.
- **Responsiveness:** Layout adapts to mobile (≤375px) and desktop screens.

## 5. Constraints & Assumptions

- Anthropic credits available; fallback demo mode required for local testing.
- Users paste text snippets (no file uploads or audio transcription in MVP).
- Supabase schema fixed to `meetings` / `meeting_outputs`; future analytics out of scope.
- No authentication in MVP; assume single-team internal usage.

## 6. Out of Scope for MVP

- Email/slack integrations or exports beyond clipboard.
- Multi-user accounts or permissions.
- Real-time collaborative editing.
- Model fine-tuning or multi-model comparison in production.
- Analytics dashboard or admin panel.

## 7. Open Questions

1. Should we store Claude’s raw JSON response for audit purposes?
2. Do we need to cap Anthropic usage per day to control cost?
3. Should history entries include structured next steps for easier downstream automation?
4. Are there compliance requirements for SOP categories beyond the current heuristics?

## 8. Milestones

| Milestone | Deliverables | Target |
| --- | --- | --- |
| M1: Baseline UX | Input form, validation, progress indicator, demo mode output | Week 1 |
| M2: Claude Integration | API route with Claude prompt + parser, structured output UI | Week 2 |
| M3: Persistence | Supabase save/load, history panel, trimming logic | Week 2 |
| M4: Quality Pass | Prompt tuned against evaluation set, docs updated, smoke tests | Week 3 |

## 9. QA & Acceptance Criteria

- ✅ Submit sample messy notes → JSON response matches schema and renders correctly.
- ✅ Each section appears even if empty (“No risks noted”).
- ✅ Claude errors display friendly message; demo mode works without `.env` keys.
- ✅ History saves only on success and never exceeds 10 entries.
- ✅ README and PRD kept current with provider and setup steps.

---

_Last updated: 2025-09-28_

