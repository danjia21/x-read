---
format: notes-v1
title: "Claude，黑进了 OpenAI：依赖链、SSO 与 AI 辅助漏洞利用"
source_title: "Claude，黑进了OpenAI"
source_url: "https://mp.weixin.qq.com/s/JQF-V1jrjGOtoSeQtFZsNA"
source_language: "zh"
entry_language: "zh"
published: "2026-09-18"
read_date: "2026-09-29"
authors:
  - "机器之心"
topics:
  - "Software Security"
  - "AI Agents"
  - "AI Safety"
tags:
  - "libheif"
  - "memory-corruption"
  - "single-sign-on"
  - "discourse"
  - "ai-assisted-security-research"
---

# Reading guide

背景知识：内存破坏漏洞只有在可控输入、进程权限和隔离条件配合时才会升级为 RCE；SSO 又可能把一个边缘系统的身份扩大到更多内部服务。因此应把漏洞、权限和信任关系视为一条组合攻击链。

本文讲的是一条由第三方图像解析依赖、Discourse 与 SSO 连接起来的攻击链，而不是 Claude 单独“攻破 OpenAI”。阅读时抓住三层：libheif 内存破坏如何变成远程代码执行，论坛身份如何通过 SSO 扩大权限，以及模型在漏洞发现与利用开发中实际承担了哪些工作。建议先读完整攻击链，再看 AI 辅助部分，最后核对披露与修复证据。RCE 与补丁可由安全公告确认，账号接管细节、内部影响、成本和模型贡献主要来自研究团队自述。带着这个问题阅读全文：决定攻击成功的关键是模型能力，还是传统依赖治理与身份边界的失守？

## 来源与证据边界

<!-- x-read-anchor {"heading":"","passage":""} -->

本文核心 RCE 可由 [Discourse 官方安全公告](https://github.com/discourse/discourse/security/advisories/GHSA-vhm9-85gw-x335) 和 [Debian DSA-6417-1](https://lists.debian.org/debian-security-announce/2026/msg00328.html) 交叉核验；账号接管、内部仓库 PR、模型表现、成本与检测情况主要来自 [Hacktron 技术复盘](https://www.hacktron.ai/blog/hacking-openai)，应视作研究团队的一手叙述，而非全部经过目标方公开确认的事实。

## 组合攻击链

<!-- x-read-anchor {"heading":"","passage":"Hacktron 博客给出的九步攻击链示意图"} -->

更准确的拆分是：论坛图片处理 RCE → 论坛控制面 → OpenAI SSO 身份边界 → ChatGPT/Codex 会话 → 已连接的 GitHub 权限。公开公告独立确认第一步；后续身份跃迁和内部仓库访问主要由 Hacktron 报告。标题把多层信任边界压缩成一句话，隐藏了真正应修复的权限组合问题。

## 公开证据与版本口径

<!-- x-read-anchor {"heading":"","passage":"最值得安全从业者警觉的是这个漏洞的来历：相关代码上游在前一年就已经改过，但那次提交没有被标记为安全修复，也没有分配 CVE。结果是 Debian 12 和 Debian 13 都没有及时拿到这个安全 backport。Discourse 的"} -->

Discourse 将问题登记为 [GHSA-vhm9-85gw-x335 / CVE-2026-32882](https://github.com/discourse/discourse/security/advisories/GHSA-vhm9-85gw-x335)，CVSS 8.8，并确认恶意 HEIF 上传可导致 RCE。Debian 的 [DSA-6417-1](https://lists.debian.org/debian-security-announce/2026/msg00328.html) 确认 2026-08-08 为 Debian 13 发布安全更新。运维判断应依据发行版安全状态而非只比较上游版本号，因为 backport 可能保留旧版本号。

## 连接器放大身份缺陷

<!-- x-read-anchor {"heading":"","passage":"据《华尔街日报》转述知情人士的说法，这个 monorepo 存放的是让模型更快更高效的算法机密，相当于公司的配方，但不包含模型权重；研究人员提交的改动落在一份文档文件上，内容包含「Hacktron AI Team PoC」字样和两位研究员的"} -->

被接管的主体可以继续调用已授权连接器，因此风险不止于聊天记录。安全设计应把 SSO session、agent 执行权限和各连接器 OAuth scope 分开约束，并对高影响写操作增加再认证、显式确认和审计。内部 PR 和仓库内容细节没有公开原始证据，本文也明确图片是示意图。

## 修复是两层的

<!-- x-read-anchor {"heading":"","passage":"时间线密度很高。7 月 25 日 UTC 凌晨 5 点到 6 点之间拿到论坛的 RCE 和管理员权限；8 点到 10 点通过 Bugcrowd 提交报告；13 点半到 15 点半完成员工账号接管与 PoC 提交，同时在推特上直接找 Open"} -->

依赖升级消除已知漏洞，沙箱限制下一次解析器漏洞的爆炸半径。Discourse 公告确认新版镜像包含修补后的 `libheif`，并为图像处理增加纵深隔离；仅更新 Web 应用代码不一定替换容器系统包。

## 能力证据强，但不是受控 benchmark

<!-- x-read-anchor {"heading":"","passage":"模型的安全护栏确实触发了，但它拦住的只是「远程」这个词。"} -->

模型据称承担了漏洞筛查、exploit 调试和跨架构移植等高难工作；但人类仍选择目标、提供镜像、切分会话、调整提示、包装环境、验证结果并控制披露。不同模型的比较缺少固定轨迹、失败次数、预算和复现实验，不能从单次战役估计一般成功率。

## 成本和“未检测”缺少分母

<!-- x-read-anchor {"heading":"","passage":"被点名的不只是 Claude——他们同时提到，在对目标系统一无所知的盲打场景中，从 Opus 5 到 GPT-5.6 Sol 又出现了一次明显的能力跃升。这不是单家模型厂商的问题。"} -->

“不到 3000 美元”“一两天”和“没有察觉”是项目运营观察，不是可复现指标。严谨比较至少需要模型版本、token 与工具账单、人类工时、目标复杂度、失败尝试和防守方遥测；研究者未获知检测，也不等于防守日志中不存在告警。

## 护栏评估不能只看单点拒绝率

<!-- x-read-anchor {"heading":"","passage":"他最扎人的一问指向 Anthropic：既然 Hacktron 正是用 Anthropic 的模型完成了这次入侵，那么 Anthropic 那套网络安全护栏的公共安全 ROI 究竟是多少——它给合法的防守方增加了实实在在的摩擦，而攻击方稍加"} -->

若攻击者能通过目标重述或环境伪装绕过拒绝，护栏的有效指标应是端到端攻击成本增量、可审计性、误伤合法研究的成本，以及它与身份验证、工具权限和异常检测的组合效果。一次绕过不足以单独推导某套护栏的总体 ROI。

## 相邻事件不是同一类证据

<!-- x-read-anchor {"heading":"","passage":"xkcd 2347「Dependency」，Hacktron 博客引用图"} -->

这些案例涉及评测隔离、供应链滥用、自主 agent 外逸和主动红队测试，威胁模型并不相同。并列能说明“高权限 agent + 不充分隔离”的共同风险，但不能仅凭时间接近建立因果关系。

## 可辩护的结论是经济边界移动

<!-- x-read-anchor {"heading":"","passage":""} -->

案例并未证明 AI 消除了漏洞利用复杂度，而是表明在专家引导下，模型可降低搜索、调试与目标适配的边际人力，使更多“已知但尚未武器化”的缺陷进入经济可利用集合。直接的防守含义是缩短补丁延迟、隔离不安全解析器、收紧 SSO 与连接器 scope，并对重复解析崩溃建立告警。

## 要点

<!-- x-read-anchor {"heading":"","passage":""} -->

1. 技术层：媒体解析器缺陷经容器依赖、论坛、SSO 和 agent 连接器被放大为跨系统权限链。

2. 证据层：RCE 和修复有公开公告；OpenAI 内部影响、模型成本及检测情况主要依赖团队披露。

3. 治理层：AI 辅助 exploit 正在改变攻击经济学，但系统安全不能押注于模型“拒绝一次”，而应依赖最小权限、隔离、审计和快速修补。
