---
format: notes-v1
title: "Lauren Tan 的编程 Agent 工作流：验证、协调与自动合并"
source_title: "Lauren Tan：如何让30多个Agent在你睡觉时提交并合并代码？丨Ai insider"
source_url: "https://mp.weixin.qq.com/s/9vkCXh27MRedLwj2NOAkPw"
source_language: zh
entry_language: zh
published: "2026-11-26"
read_date: "2026-11-28"
authors: ["Capihom"]
topics: ["AI Agents", "Software Engineering"]
tags: ["coding-agents", "verification", "agent-orchestration", "automerge"]
source_access: full
---

# Reading guide

Tan 的经验是先让单个编程 Agent 能用运行时证据判断改动，再扩大并行度。先看浏览器验证与 CLI 封装，理解同一套测量如何供多个 Agent 使用。接着看协调 Agent 如何归并外部反馈，最后看自动合并后的人工抽查。性能调试和 React 巡查给出了具体操作，约 2500 个 PR 则是访谈自报的吞吐量，其中包含大量维护。文章没有给出缺陷逃逸率或人工耗时对照。对于同一类、同等风险的改动，从一名验证者增至多名时，每多消耗一份验证预算，能多发现多少会影响用户的缺陷？

## 固定性能测量的输入和基线

<!-- x-read-anchor {"heading":"验证让Agent真正进入闭环","passage":""} -->

按测量结果选改动，相当于把指标纳入搜索目标。若渲染耗时与缓存状态或输入数据一起变化，循环可能保留一项偶然遇到快样本的改动。把构建产物、输入和基线绑定到运行记录，再对候选做重复测量，能让性能变化更容易归因。

## 让验证工具产出可回溯的证据

<!-- x-read-anchor {"heading":"确定的步骤，交给脚本和CLI","passage":""} -->

稳定的 CLI 可以让协调者把每份证据追溯到提交、运行环境和实际走过的用户路径。把断言失败、工具报错与场景未执行区分开，能避免后续 Agent 将一次采集失败误解为应用回归，或把未覆盖的场景算作已通过。

## 在分派前按可检验的症状归并报告

<!-- x-read-anchor {"heading":"把外部反馈，接进内部开发流程","passage":""} -->

协调 Agent 可以用版本、交互路径、时序和复现条件标记报告，先按这些条件提出共同根因的假设，再安排复现。仅凭自然语言相似度聚合，容易把不同故障并成一项，也会漏掉同一瓶颈在不同页面造成的症状。

## 验证者的覆盖面决定新增价值

<!-- x-read-anchor {"heading":"从逐条审批，转向严格验证后的抽查","passage":""} -->

共享模型、任务说明和测试数据的验证者容易遗漏同一个场景。比较一名与多名验证者时，可以记录每名验证者独立覆盖了哪些交互路径、首次发现了哪些后来确认的缺陷，以及这些发现消耗了多少时间和算力。合并后的抽查能估计遗漏情况，回退则取决于改动是否已产生持久的外部状态。
