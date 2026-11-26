---
format: notes-v1
title: "Harness engineering in an agent-first codebase"
source_title: "Harness engineering: leveraging Codex in an agent-first world"
source_url: "https://openai.com/index/harness-engineering/"
source_language: "en"
entry_language: "en"
published: "2026-02-11"
read_date: "2026-11-23"
authors: ["Ryan Lopopolo"]
topics: ["AI Agents", "Software Engineering"]
tags: ["codex", "agent-harness", "repository-design"]
---

# Reading guide

This production case study treats repository structure, documentation, tests, observability, and cleanup automation as the primary engineering surface. Its thesis is that agent throughput compounds when intent and constraints become discoverable, executable feedback loops. Focus on repository knowledge, architectural enforcement, autonomy, and entropy control. The practices are strong first-party evidence; the “0 manually-written code,” million-line, and 10× estimates are not independently audited or general benchmarks. Ask: which pieces of human judgment can be encoded once and continuously verified without flattening design quality?

## Legibility as an interface property

<!-- x-read-anchor {"heading":"Agent legibility is the goal","passage":""} -->

Documentation must be findable at the moment of action, invariants executable, and failure output useful for the next decision. These properties benefit humans too; agents amplify ambiguity costs through parallelism and repetition.

## Continuous governance

<!-- x-read-anchor {"heading":"Entropy and garbage collection","passage":""} -->

High generation throughput needs a matching reclamation process. “Golden principles” work when they are narrow enough to check mechanically and retain an exception path; otherwise automated cleanup can fossilize local preferences into global constraints.
