---
title: "Effective harnesses for long-running agents — State, Verification, and Handoffs"
source_title: "Effective harnesses for long-running agents"
source_url: "https://www.anthropic.com/research/effective-harnesses-for-long-running-agents"
source_language: "en"
entry_language: "en"
published: "2025-11-26"
read_date: "2026-10-29"
authors:
  - "Justin Young"
topics:
  - "AI Agents"
  - "Agent Infrastructure"
tags:
  - "agent-harness"
  - "context-management"
  - "persistent-state"
  - "end-to-end-testing"
format: "original-sourced-note"
---

# Effective harnesses for long-running agents

> [!NOTE]
> **Reading guide | State, verification, and handoffs**
>
> A harness is the runtime around a model: it manages tools, execution, and state. A context summary is only one representation of that state.
>
> The article argues that durable artifacts, incremental work, and verified handoffs help coding agents continue across context windows. Follow three threads: initial setup, completion criteria, and session recovery. Read the failure-mode discussion first, then environment management, then the startup routine.
>
> The evidence is an engineering experience report about web development, not a controlled demonstration of general long-horizon reliability. Ask: **what observable evidence would let a fresh agent distinguish completed work from a convincing progress report?**

> [!NOTE]
> **Format and source disclosure**
>
> The complete substantive article was accessible and read. This entry uses the repository's copyright fallback: original analysis and a concise source synopsis, rather than full-text reproduction. The original paragraphs, code example, screenshot, and table are not reproduced. All editorial content is marked in callouts.
>
> Source: Justin Young, Anthropic Engineering, November 26, 2025, [Effective harnesses for long-running agents](https://www.anthropic.com/research/effective-harnesses-for-long-running-agents). No external corroboration or execution of the accompanying implementation was performed.

> [!NOTE]
> **Source synopsis | The proposed workflow**
>
> Anthropic describes agents overreaching, stopping early, and accepting insufficiently tested changes. Its first session prepares a startup script, feature inventory, progress notes, and Git baseline. Subsequent sessions inspect these artifacts, check basic functionality, implement one feature, test through the browser, and record a handoff. Feature completion is tracked in JSON. The initializer and coding roles differ in their prompts; they do not establish a benefit from concurrent specialists. Broader applications and multi-agent designs remain future work.

> [!NOTE]
> **Interpretation | Persistent state is a contract**
>
> A useful design separates four kinds of information:
>
> | Artifact | Question it should answer | Failure to guard against |
> | --- | --- | --- |
> | Requirements | What behavior is expected? | The implementation silently narrows the task |
> | Code and configuration | What system currently exists? | Notes describe an earlier version |
> | Test evidence | What behavior was observed, on which revision? | An old pass is treated as current evidence |
> | Handoff notes | What should happen next, and why? | A plausible narrative overrides contradictory artifacts |
>
> This is an editorial design framework, not an additional reported experiment. The key invariant is consistency between these artifacts. Persisting more text does not itself establish that consistency.

> [!NOTE]
> **Interpretation | Completion should be tied to a revision**
>
> A Boolean completion flag loses its meaning when dependencies change. For a production adaptation, associate a passing result with the commit, test command or interaction, environment, and observed outcome. Preserve acceptance criteria separately from the agent's authority to update status.
>
> JSON is a serialization choice, not an enforcement mechanism. If a requirement must remain immutable, enforce that through review, permissions, or validation. Prompt instructions alone cannot provide that guarantee.

> [!NOTE]
> **Interpretation | Test through the relevant boundary**
>
> A useful acceptance test crosses the boundary where failure matters. For a chat application, that could include request submission, server processing, persistence, and visible rendering. For a data pipeline, it could instead require validating downstream records and restart behavior; browser testing would add little there.
>
> A sensible test portfolio combines cheap local checks with a smaller set of representative user journeys. Neither screenshots nor a successful HTTP response alone establish the entire workflow. Coverage should follow failure modes, including persistence, authorization, and recovery, rather than the availability of a particular tool.

> [!NOTE]
> **Interpretation | A handoff resembles a transaction boundary**
>
> Treat each increment as a bounded state transition: inspect the current revision, establish a baseline, change behavior, verify the result, and publish mutually consistent code and notes. This analogy is a design aid, not a claim of database-style atomicity.
>
> Abrupt termination can occur between any two steps. A stronger harness would detect incomplete transitions and preserve an explicit recovery state. A startup script should also be safe to rerun and should report readiness rather than merely launching processes. Git restores tracked files; it does not automatically restore databases, external services, credentials, or deployed state.

> [!NOTE]
> **Evidence assessment | What to measure next**
>
> The article supplies qualitative failure observations and a concrete workflow, but no sample sizes, cost distributions, or controlled ablations. It does not isolate the contribution of each component.
>
> To evaluate a similar harness, compare matched tasks and budgets across repeated runs, then remove one component at a time. Measure independently checked feature completion, regressions, recovery time after interruption, total cost, and disagreement between claimed and observed completion. Keep the evaluator separate from the editable status file.
>
> This proposed evaluation would distinguish better reporting from better execution. It would also reveal whether additional startup checks save more recovery effort than they consume.

> [!NOTE]
> **Practical takeaway | Apply the idea selectively**
>
> For this journal repository, the corresponding durable state is the source URL, entry metadata, saved note, catalog links, and verification results. A new session should discover these before deciding what remains to be done. Repeating a successful entry because the conversation was lost would be a state-discovery failure; declaring it saved without checking the file would be a verification failure.
>
> The transferable design principle is to make progress independently inspectable. The appropriate artifacts and tests depend on the task.
