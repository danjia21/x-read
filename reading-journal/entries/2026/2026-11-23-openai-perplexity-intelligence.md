---
format: notes-v1
title: "OpenAI 预训练困惑度指标：可比性、涌现与研发上限"
source_title: "刚刚，OpenAI首次公开预训练核心指标"
source_url: "https://mp.weixin.qq.com/s/naPnZnOTCEMixOAsHG4OWQ"
source_language: "zh"
entry_language: "zh"
published: "2026-11-23"
read_date: "2026-11-23"
authors: ["机器之心编辑部"]
topics: ["Large Language Models", "AI Safety", "Model Evaluation"]
tags: ["perplexity", "pretraining", "scaling", "pacing"]
---

# Reading guide

后半编译 OpenAI 首席科学家 Jakub Pachocki 的《Perplexity and Intelligence》：用 held-out cross-entropy 追踪预训练，并据此讨论能力涌现、研发加速与共同上限。数字由 [OpenAI 官方原文](https://openai.com/index/perplexity-and-intelligence/)确认，但数据集是内部代码快照，能力阈值是相关性与外推。应追问：数据、tokenizer 和后训练不同时，怎样构造可审计且不可被策略性优化的跨实验室指标？

## 实际报告的是交叉熵损失

<!-- x-read-anchor {"heading":"","passage":"GPT-3.5 在我们当前主要评测数据集上的对数困惑度约为 0.99，已经能够进行流畅对话，并成为最初 ChatGPT 的基础。"} -->

官方脚注明确说明实践中跟踪的是 log perplexity，即 cross-entropy loss；0.99、0.91 不能直接当作通常大于 1 的 perplexity。该数据来自内部代码库固定快照，也不能直接跨实验室比较。
