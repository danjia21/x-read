---
format: notes-v1
title: "Gemini 4 Pro ‘首测封神’：未发布模型、Demo 证据与安全事件"
source_title: "谷歌憋了三年的大招！Gemini 4 Pro 首测封神"
source_url: "https://mp.weixin.qq.com/s/7YhSJkFqMZhLyohOz9ZwWw"
source_language: "zh"
entry_language: "zh"
published: "2026-09-20"
read_date: "2026-09-29"
authors: ["FreeAI"]
topics: ["Large Language Models", "Model Evaluation", "AI Agents", "AI Safety"]
tags: ["gemini", "gemini-4-pro", "benchmark-verification", "creative-coding", "cybersecurity"]
---

# Reading guide

背景知识：模型 demo 的可归因性至少需要明确端点版本、prompt、采样参数、工具环境与完整输出；视觉效果的单次对比也不等同于 benchmark。产品名、内部实验型号和正式发布模型若未被一手材料连接，应视为不同对象。

本文最适合作为“传闻模型如何被 demo、榜单和安全故事包装成发布事实”的案例，而不是 Gemini 4 Pro 的可靠测评。阅读时把三条证据链拆开：模型是否已正式发布，创意编码 demo 能否归因并复现，安全事件是否来自同一型号。建议先读开头的发布状态核验，再浏览 demo 段落，最后单独处理 benchmark 与安全叙事。官方模型卡能确认的内容最强；匿名截图、未给 prompt 的对比和“全球第一”结论最弱。带着这个问题阅读全文：每个性能判断是否都能追溯到明确模型端点、输入、输出和评分方法？

## 核心结论。

<!-- x-read-anchor {"heading":"","passage":""} -->

本文适合作为“模型传闻如何被包装成首测”的样本，不能作为 Gemini 4 Pro 已发布或性能领先的可靠证据。截至 2026-09-29，Google DeepMind 官方模型卡目录最高列到 Gemini 3.8，没有 Gemini 4 Pro；Google 9 月正式发布的是 Gemini 3.8 Flash 与 3.8 Flash Cyber。[Google DeepMind 模型卡目录](https://deepmind.google/models/model-cards/)；[Google 官方发布说明](https://blog.google/innovation-and-ai/models-and-research/gemini-models/3-8-flash-and-3-8-flash-cyber/)

原文没有给出 demo 作者、原帖、模型端点、prompt、代码、可交互页面或 benchmark 记录。本条记录只保存阅读注解，并区分不可归因的 demo、不可复核的性能结论，以及确有报道但缺失关键上下文的安全事件。

## 三条证据链被混在了一起。

<!-- x-read-anchor {"heading":"","passage":""} -->

“Gemini 4 Pro 首测”“若干前端 demo”“某 Gemini 模型的安全事故”必须分别证明。同期报道仍把 4 Pro 称作尚未发布的预期模型。[TechRadar，2026-09-08](https://www.techradar.com/ai-platforms-assistants/i-also-want-to-feel-the-frontier-gemini-users-are-starting-to-think-that-gemini-pro-4-wont-ever-see-the-light-of-day-thanks-to-the-release-of-chatgpt-6-astra-and-claude-fable-5.1) “杀回第一”也缺少任务集、评分函数和重复实验。

## 截图不是模型归因证据。

<!-- x-read-anchor {"heading":"","passage":"以前我们说谷歌的模型 \"会做题不会审美\"，这回，谷歌用一只蝴蝶把 \"审美\" 两个字焊在了自己脸上。"} -->

可复核比较至少要公开原始 prompt、全部追问、模型快照、系统提示、工具、生成代码、失败样本和选样规则。单张成品图无法排除人工修改、多轮择优或预算不一致。Three.js 作品还应分别检查几何、动画、交互、帧率、控制台错误、响应式布局及代码质量，并对多次运行做匿名盲评。

## 更多精选案例仍不是独立证据。

<!-- x-read-anchor {"heading":"","passage":"以前是 \"文能跑分、武能写码\" 的时代，现在 Gemini 4 Pro 告诉你：我还会画画、会建模、会做动画。"} -->

手表、机器人、SVG 都处于相近的前端视觉生成分布。GPT-6 Astra 与 Claude Fable 5.1 有正式产品页：[OpenAI](https://openai.com/index/gpt-6-astra/)；[Anthropic](https://www.anthropic.com/claude/fable)。但被测的 Gemini 4 Pro 没有官方模型卡，原文也无实验材料，因此这里只能算未经归因的作品比较。“会建模”也应收窄为“生成程序化图形代码”，不等于输出生产可用的 3D/CAD 资产。

## 最强断言恰好最缺证据。

<!-- x-read-anchor {"heading":"","passage":"谷歌这次交出的，不是一款 \"追赶型\" 产品，而是一款 \"反超型\" 产品。"} -->

原文没有 Terminal-Bench 4.0 分数、日期、榜单链接、agent harness、reasoning effort、成本、成功数或置信区间。同一模型换 harness、工具权限、时间预算或重试策略，结果会改变。Google 官方目录又不存在 Gemini 4 Pro model card；在出现可追溯榜单记录前，“TB 4.0 SOTA”“长上下文突破”和“全线登顶”都应视为未证实。

## 事件属实，但上下文改变了解读。

<!-- x-read-anchor {"heading":"","passage":"谷歌高管还罕见地公开表态：Gemini 4 让内部嗨翻了。注意，谷歌高管一般不吹自家产品，这次直接破例 —— 说明连自己人都被震到了。"} -->

Google 确认：2026 年 5 月，Irregular 运行 CTF 测试时，本应隔离的环境因配置错误可访问公网；Gemini 将同名真实公司误作测试目标。一个案例猜中密码，另两个使用公开仓库暴露的凭据；模型识别到目标真实后停止。[The Record](https://therecord.media/gemini-google-cyber-breach)；[Axios](https://www.axios.com/2026/09/19/google-safety-incidents-testing-hacks)

真实公司并未授权攻击，所以“在授权测试里干的”不准确；具体 Gemini 型号也未公开，不能把事故归到 Gemini 4。攻击手法并不新颖，严重性在于 agent containment 失效：网络 egress、凭据使用、作用域校验和监控不能只靠提示词。所谓高管表态没有姓名、原话或链接，也不能作为性能证据。

## “创造力”未被操作化。

<!-- x-read-anchor {"heading":"","passage":"#Gemini#谷歌#OpenAI#GPT6#Claude#大模型#人工智能#AI创作"} -->

几个 demo 不能证明训练时“不卷算力”，也不能推出总能力排序。严肃的 creative-coding 比较应预注册任务集、保留全部输出、对齐 token/时间/工具预算，用匿名成对偏好测审美，同时自动测试功能正确性，最终报告偏好胜率、不确定性、成功率、成本和延迟。

## 读完应该记住什么

<!-- x-read-anchor {"heading":"","passage":""} -->

1. 截至 2026-09-29，没有 Google 官方证据表明 Gemini 4 Pro 已发布；本文“首测”缺少可识别端点和原始记录。
2. 漂亮 demo 能提出假设，不能单独建立模型归因、总体排名或 SOTA。
3. Gemini 误入三家公司是确认过的安全事故，但具体型号未公开，关键原因包括环境误配置和目标混淆；它说明最小权限与 containment 的重要性，不证明 Gemini 4 的能力。
4. 每遇到“第一、碾压、SOTA、突破”，都应追问完整配置、对照组、原始链接与失败样本。
