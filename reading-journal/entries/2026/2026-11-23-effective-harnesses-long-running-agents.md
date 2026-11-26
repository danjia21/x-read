---
format: notes-v1
title: "Effective harnesses for long-running agents"
source_title: "Effective harnesses for long-running agents"
source_url: "https://www.anthropic.com/research/effective-harnesses-for-long-running-agents"
source_language: "en"
entry_language: "en"
published: "2025-11-26"
read_date: "2026-11-23"
authors: ["Anthropic Engineering"]
topics: ["AI Agents", "Software Engineering"]
tags: ["agent-harness", "long-running-agents", "context-engineering"]
---

# Reading guide

“Harness” means the protocol, artifacts, tools, and validation loop around the model. The thesis is that long tasks become tractable when an initializer creates durable structure and each later agent makes one verified increment while leaving explicit handoff state. Follow environment initialization, progress/feature ledgers, and end-to-end testing. The failure taxonomy and quickstart are the strongest evidence; generalization beyond the demonstrated web-app setting remains provisional. Ask: which state must live in the repository because it cannot safely depend on context-window memory?

## Repository as external memory

<!-- x-read-anchor {"heading":"Environment management","passage":""} -->

Git history, the feature ledger, progress log, and executable tests form recoverable external memory. The initializer/coding-agent split mainly stabilizes invariants by converting implicit conversational state into durable, inspectable, machine-checkable state.

## Evidence boundary

<!-- x-read-anchor {"heading":"Agent failure modes and solutions","passage":""} -->

Treat this as an empirical engineering playbook rather than a controlled benchmark. The failure modes are plausible and reproducible, but their frequency and sensitivity to model, prompt, task type, and test quality are not quantified.
