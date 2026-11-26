---
format: notes-v1
title: "Beyond permission prompts: Claude Code sandboxing"
source_title: "Beyond permission prompts: making Claude Code more secure and autonomous"
source_url: "https://www.anthropic.com/research/claude-code-sandboxing"
source_language: "en"
entry_language: "en"
published: "2025-10-20"
read_date: "2026-11-23"
authors: ["Anthropic Engineering"]
topics: ["AI Agents", "Software Engineering", "Software Security"]
tags: ["sandboxing", "claude-code", "prompt-injection"]
---

# Reading guide

The key distinction is between policy (what an agent is instructed to do) and mechanism (what the operating system can prevent). The article argues that OS-enforced filesystem and network boundaries can reduce approval fatigue while constraining damage. Read the threat model, then the two controls, and finally deployment guidance. The reported 84% prompt reduction is useful internal evidence, but no measurement protocol or independent security evaluation is supplied. Ask: which attacks are blocked, and which are displaced to allowed tools, domains, or exceptions?

## Capability confinement

<!-- x-read-anchor {"heading":"Sandboxing: a safer and more autonomous approach","passage":""} -->

This is capability-oriented security in practical form: grant access only to selected filesystem roots and network endpoints, then allow autonomy inside that envelope. The boundary must be enforced below the model and tool layer; prompts and allowlists alone are not containment. Sandboxing reduces prompt-injection impact rather than preventing injection: allowed credentials, writable roots, and permitted destinations remain attack surfaces.
