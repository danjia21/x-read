---
format: notes-v1
title: "Gemini Antigravity 桌面版：Agent 工作流与证据边界"
source_title: "Gemini 桌面版，干活有点猛啊。"
source_url: "https://mp.weixin.qq.com/s/kp3GclpjFt9iP8gh-svQIg"
source_language: "zh"
entry_language: "zh"
published: "2026-11-20"
read_date: "2026-11-23"
authors: ["沉默王二"]
topics: ["AI Agents", "Software Engineering"]
tags: ["gemini", "antigravity", "multi-agent"]
---

# Reading guide

本文基于界面与作者体验，覆盖多 Agent 协作、远程执行、代码化工作流、旁路上下文、需求澄清和生成式 UI。建议先读 `/swarm` 与 `/run-workflow` 的边界，再看 SSH、`/btw` 和 `/grill-me`。截图与步骤是直接产品证据；生产力提升与内部实现仍是体验性或未逐项核验的主张。应追问：可靠性究竟由模型、Harness、隔离环境还是人工验收提供？

## 确定性控制面与概率性执行面

<!-- x-read-anchor {"heading":"03、Dynamic Workflows","passage":""} -->

Python 固定依赖图、并发和 JSON Schema，让确定性程序承担控制流、模型处理语义节点。Schema 只能约束返回形状，不能保证内容正确，仍需测试与外部证据。
