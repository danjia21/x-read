---
format: notes-v1
title: "Always-on Personal Agent：持久状态、上下文与安全边界"
source_title: "斯坦福新课直接讲 personal agent，Grok Bot 工程师分享如何打造出 always-on agent"
source_url: "https://mp.weixin.qq.com/s/gz8ZjplJ40agZKsgbFAXSA"
source_language: "zh"
entry_language: "zh"
published: "2026-10-20"
read_date: "2026-11-23"
authors: []
topics: ["AI Agents", "Agent Infrastructure"]
tags: ["personal-agent", "durable-workflows", "context-engineering"]
---

# Reading guide

本文整理 Stanford CS146S 分享，把 personal agent 扩展为可休眠、唤醒、恢复并持续数周的服务。抓住事件路由、虚拟机与 durable workflow、稀疏主上下文与子 Agent、模型—产品—评测飞轮。课程可由官方页面确认；具体架构主要来自演讲转述。应追问：恢复执行进度后，如何证明系统仍保留正确意图、权限边界和最新外部状态？

## 基础设施恢复不等于语义恢复

<!-- x-read-anchor {"heading":"","passage":"为什么 agent 要跑在服务器上，用什么保证不掉链子"} -->

VM 快照可恢复进程与文件，durable workflow 可恢复步骤；它们不能自动保证外部操作幂等、凭证仍有效或目标未变化。长任务仍需 idempotency key、版本检查与补偿逻辑。
