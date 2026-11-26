---
format: notes-v1
title: "A guide to reinforcement-learning post-training for LLMs"
source_title: "A Guide to Reinforcement Learning Post-Training for LLMs: PPO, DPO, GRPO, and Beyond"
source_url: "https://huggingface.co/blog/karina-zadorozhny/guide-to-llm-post-training-algorithms"
source_language: "en"
entry_language: "en"
published: "2026-01-19"
read_date: "2026-11-23"
authors: ["Karina Zadorozhny"]
topics: ["LLM Post-Training", "Reinforcement Learning"]
tags: ["ppo", "dpo", "grpo", "preference-optimization"]
---

# Reading guide

The article organizes LLM post-training around on-policy rollouts and offline preference objectives, with KL regularization as the bridge. Compare where each method obtains samples, baselines, and preference signals; finish with the KL section because “KL penalty” covers non-equivalent estimators and placements. This is a pedagogical synthesis, not an empirical ranking. Ask: for each loss, which distribution generated the data, and does the implemented gradient match the written objective?

## Three choices often collapsed into one

<!-- x-read-anchor {"heading":"GRPO","passage":""} -->

A KL term requires a direction, a sampling distribution, and a choice between reward shaping and a differentiable loss. Two implementations may both say “KL penalty” while producing different gradients.

## Choose by bottleneck

<!-- x-read-anchor {"heading":"Summary","passage":""} -->

The choice depends on rollout cost, reward reliability, whether preference data are static or online, critic memory, and tolerable off-policy drift. Algorithm names conceal consequential implementation variants.
