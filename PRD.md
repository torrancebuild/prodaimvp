# ProDAI MVP – Product Requirements Document

## 1. Overview

**Product Vision:** Help product managers transform development team meeting notes into concise, structured summaries that make key decisions, action items, and blockers obvious within seconds.

**MVP Goal:** Deliver a single-page web app that accepts raw development team meeting notes (≤1000 chars) and outputs a multi-section intelligence report powered by Anthropic Claude 3 Haiku, with optional demo mode for onboarding without API keys.

## 2. Target Users & Needs

| Persona | Needs | Pain Points |
| --- | --- | --- |
| Product Manager (Primary) | Quickly share key decisions, action items, and blockers with development teams | Manual note cleanup is slow; important decisions get lost in long meeting notes |
| Development Team Lead | Get clear visibility into decisions, progress, and upcoming work | Hard to track what was decided and who's responsible for what |
| Engineering Manager | Ensure meetings have clear outcomes and follow-up actions | Meetings often lack structure and clear next steps |

## 3. Success Metrics

- **Activation:** 80% of new users reach “Generated Summary” at least once.
- **Perceived Quality:** ≥70% of manual evaluations rate outputs “useful” or better across a set of sample notes.
- **Cycle Time:** Summaries returned in <3 seconds for 90% of requests (excluding demo mode).
- **Retention Proxy:** Auto-save last 10 notes and reload within <500 ms.

## 4. Scope & Requirements

### 4.1 Functional Requirements

1. **Input Experience**
   - Textarea with live character count, min/max enforcement (10–1000 chars).
   - Color-coded warnings for >80% and >95% of limit.
   - Prevent submission if validation fails; show inline error.

2. **Processing UX**
   - Button `Analyze Meeting Notes`; disabled while loading.
   - Progress indicator with 6 stages; resets when API completes or fails.

3. **AI Summarization**
   - Default provider: Anthropic Claude 3 Haiku via `/api/summarize` POST.
   - Request structured JSON covering: `summaryPoints`, `actionItems`, `openQuestions`, `developmentTeamSections`, `riskAssessment`, `followUpReminders`, and `meetingQuality`.
   - If Claude response is invalid, surface a friendly error; heuristics are optional stretch goals.
   - Demo mode (no `ANTHROPIC_API_KEY` or `NEXT_PUBLIC_DEMO_MODE=true`) returns mock content matching the structured schema above.

4. **Output Presentation**
   - Display sections in a responsive, condensed multi-column layout on desktop while stacking on mobile.
   - Headings: "Key Decisions & Progress", "Action Items with Ownership", "Blockers & Next Steps", "Open Questions".
   - Bullet formatting: sentence case, no trailing punctuation, highlight blockers with icon (⚠️).
   - Meeting quality shows per-area scores with bars and recommendations.
   - Copy-to-clipboard mirrors the section structure, including meeting type and scores.

5. **History Management** *(Nice-to-have)*
   - If enabled, save each successful summary to Supabase (`meetings`, `meeting_outputs`) and trim to last 10; otherwise stub out with an empty history list in demo mode.

6. **Error Handling**
   - API should return actionable message for: missing key, insufficient credits, rate limiting, model timeout.
   - UI displays dismissible error card on failure; progress indicator stops.

### 4.2 Non-Functional Requirements

- **Performance:** End-to-end response (client click → rendered summary) <3 s average with Claude; demo mode within ~3.5 s simulated delay.
- **Reliability:** Surface clear messages for credit/key/timeouts; retries are optional stretch.
- **Security:** Keys stay server-side; `SUPABASE_SERVICE_ROLE_KEY` never exposed to client.
- **Accessibility:** Components keyboard accessible; color choices meet AA contrast.
- **Responsiveness:** Layout adapts to mobile (≤375px) and desktop screens.

## 5. Constraints & Assumptions

- Anthropic credits available; fallback demo mode required for local testing.
- Users paste text snippets (no file uploads or audio transcription in MVP).
- Supabase history can be disabled without blocking launch.
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
3. Should history entries include structured metadata for downstream automation?

## 8. Milestones

| Milestone | Deliverables | Target |
| --- | --- | --- |
| M1: Baseline UX | Input form, validation, progress indicator, demo mode output | Week 1 |
| M2: Claude Integration | API route with improved prompt + three-section UI | Week 2 |
| M3: Optional Persistence | Supabase save/load, history panel (if kept) | Week 2 |
| M4: Quality Pass | Prompt tuned against sample notes, docs updated, smoke tests | Week 3 |

## 9. QA & Acceptance Criteria

- ✅ Submit sample development team meeting notes → response renders three critical sections with 2–5 bullets each.
- ✅ Each section appears even if empty ("No blockers noted").
- ✅ Claude errors display friendly message; demo mode works without `.env` keys.
- ✅ If Supabase enabled: history saves only on success and never exceeds 10 entries.
- ✅ README and PRD kept current with provider and setup steps.

---

_Last updated: 2025-09-28_

