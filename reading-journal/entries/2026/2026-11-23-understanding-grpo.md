---
format: notes-v1
title: "Understanding GRPO: PPO without the critic"
source_title: "Understanding GRPO: PPO without the critic"
source_url: "https://huggingface.co/blog/garg-aayush/derive-grpo-loss"
source_language: "en"
entry_language: "en"
published: "2026-01-01"
read_date: "2026-11-23"
authors: ["Aayush Garg"]
topics: ["LLM Post-Training", "Reinforcement Learning"]
tags: ["grpo", "ppo", "policy-optimization"]
---

# Reading guide

GRPO removes PPO’s learned critic and estimates a prompt-local baseline from a group of completions. The article derives that substitution, then adds clipping, reference-policy KL, and outcome/process supervision. Read Sections I–III for the derivation, IV for KL, and VI for RLOO. The algebra and DeepSeekMath link are the strongest support; memory and stability claims depend on implementation, group size, reward noise, and the GRPO variant. Ask: what bias, variance, and compute trade is introduced when the comparison set is only same-prompt samples?

## The critic is exchanged, not free

<!-- x-read-anchor {"heading":"Group-Relative Advantage","passage":""} -->

Removing the value model saves parameter and optimizer-state memory, but group sampling spends rollout compute. Normalization becomes unstable when within-group reward variance is tiny, and its quality depends on reward calibration and completion diversity.

## Baseline dependence matters

<!-- x-read-anchor {"heading":"VI: Connection to REINFORCE Leave-One-Out (RLOO)","passage":""} -->

A leave-one-out baseline excludes sample *i* from its own baseline, whereas common GRPO normalization uses the whole group. That finite-sample distinction affects bias even though both compare completions within a prompt.
