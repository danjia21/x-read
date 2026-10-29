---
title: "Gemini 4 Argon：百万 Token 输出、长周期 Agent 与证据边界（原文注解版）"
source_title: "刚刚，谷歌发布Gemini 4 Argon：单次输出上限达100万Token"
source_url: "https://mp.weixin.qq.com/s/ET4TVpS5S1qONRA_3Wm5yg"
source_language: "zh"
entry_language: "zh"
published: "2026-10-01"
read_date: "2026-10-01"
authors:
  - "机器之心编辑部"
topics:
  - "Large Language Models"
  - "AI Agents"
  - "Model Evaluation"
  - "Software Security"
  - "AI Safety"
tags:
  - "gemini-4-argon"
  - "long-horizon-agents"
  - "output-token-limit"
  - "software-engineering"
  - "cybersecurity"
  - "benchmark-verification"
---

# 刚刚，谷歌发布Gemini 4 Argon：单次输出上限达100万Token

> [!NOTE]
> **导读｜阅读路线**
>
> 背景知识：本文最容易混淆的是**输出上限**、**上下文窗口**与**有效任务时长**。100 万输出 Token 只是服务允许单次生成的最大长度；它不自动意味着模型能在同等长度上保持正确状态，也不等于输入加输出的 context window。长周期 Agent 的瓶颈还包括错误累积、工具调用可靠性、状态压缩、成本与可审计性。
>
> 一句话主旨：Gemini 4 Argon 的真正产品假设，是用极高输出预算和强化的工具使用能力承载软件工程、企业知识工作与防御性网络安全，而不是单纯把聊天回复写得更长。
>
> 阅读时抓住三条主线：百万 Token 输出是否转化为有效任务长度；公开 benchmark 是否能代表真实工程；Google 内部部署与网络安全案例是否有足够可审计证据。建议先读“单次输出上限”，再读内部工程案例，最后用“现实考验”反查 benchmark。发布、价格、数字和多数案例可由 [Google 官方公告](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-argon/)确认，但仍主要是厂商自报；独立复现、完整轨迹、失败率和端到端成本尚未公开。带着这个问题阅读全文：**百万 Token 究竟增加了可验证的有效工作量，还是主要增加了允许模型消耗的推理预算？**

![image](https://mmbiz.qpic.cn/sz_mmbiz_png/KmXPKA19gW889cR13aBX42evqQIRibKlicoCrHPEpT0tQiceNphESCa2eJTqstP8G0yqMTkeMFrOGue6kOyCKdTkA/640?wx_fmt=png&from=appmsg)

机器之心编辑部

刚刚，Google 宣布推出新一代前沿模型 Gemini 4 Argon。

Google 将 Argon 定位为面向复杂、长周期工作流的模型，重点覆盖软件工程、法律与金融等企业知识工作，以及网络安全防御。

与以往直接面向公众开放的方式不同，Argon 将采用分阶段发布策略。该模型将通过 Fairwind Program，首批提供给受信任的网络安全防御者。

价格方面，Argon API 的初始定价为每百万输入 Token 2 美元、每百万输出 Token 10 美元，缓存输入 Token 的价格比标准输入价格低 95%。

> [!NOTE]
> **注解｜发布状态与定价已获一手确认。** Google 公告确认了 Fairwind 分阶段开放、美国政府预发布自愿流程和上述 introductory price。这里的“发布”应理解为受限 rollout，不是公共 API 已全面可用。若一次任务真的生成 100 万输出 Token，仅输出标价即约 10 美元；Agent 的工具、重试、输入回灌与缓存命中率会进一步决定总成本。[Google 官方公告](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-argon/)

单次输出上限扩至 100 万 Token

Gemini 4 Argon 最受关注的变化，是将输出 Token 上限从此前的 6.4 万提升至 100 万。

这里的 100 万 Token 指单次输出上限，和上下文窗口是两个指标。更高的输出空间意味着，模型可以在一条任务轨迹中持续推理，并生成数十万甚至接近百万 Token 的结果。这类能力主要面向大型代码迁移、深度研究和多步骤企业流程。

![image](https://mmbiz.qpic.cn/sz_mmbiz_png/5L8bhP5dIqF1eR7YvzECibJrd1LS9vua7h9I9fMHzVREZaeIIibDaNNiaACKl67wD8NaWbAUFMK2K4TByiaMXfAXBBysfBGH1AiatFtHtRAwamMM/640?wx_fmt=png&from=appmsg)

> [!NOTE]
> **注解｜上限不是能力曲线。** 这一段正确地区分了 output cap 与 context window，但“可以持续推理”仍是待测推论。应报告随轨迹长度变化的成功率、首次不可恢复错误位置、有效输出比例、检查点恢复能力和每个成功任务的 token/时间成本。否则 1M 只说明 API 容量，不说明百万 Token 范围内的推理质量。

有网友指出，多数前沿模型的输出上限大约为 12.8 万 Token。相比之下，Argon 单次生成 100 万 Token 的能力挺罕见。

![image](https://mmbiz.qpic.cn/sz_mmbiz_png/5L8bhP5dIqGz6TE690IGrNJdsGxk3a67vr9Y5TmI4Z2lJX9fClf978PvZIaHVogC4JCNFBoxyo7aaflby6Mu0KEe0rk5lACVZH3atBWnx44/640?wx_fmt=png&from=appmsg)

Google 称，Argon 在 DeepSWE v1.1 软件工程评测中的得分为 77.9%，达到当前最高水平。该评测主要衡量模型处理真实、长期软件工程任务的能力。

![image](https://mmbiz.qpic.cn/sz_mmbiz_png/5L8bhP5dIqEgSoLg3FXLz6iaFOXoVkpmIiaM7W6k6gJzt0S8wH22uhWXQOl9yy9Y5LwxpfMYCZVkjaLicDAG0DywjRUGGicqKf2fbRpic6nhkhLo/640?wx_fmt=png&from=appmsg)

在企业知识工作方面，Argon 位列 Vals Index 第一。该指数覆盖金融、编程、法律和税务等领域，并按照各行业对美国国内生产总值的贡献进行加权。

![image](https://mmbiz.qpic.cn/sz_mmbiz_png/5L8bhP5dIqEZqElYVt5T21ajDXJRb9TIbeQD5DBsv3uCQua4khN6hDz6Q0TyTU7bbV542CjOW1G7B0lkTJcyxtfr2yyusDm6gLsjxMicicl1M/640?wx_fmt=png&from=appmsg)

Argon 还在 Vals Finance Agent v2、Harvey Legal Agent Benchmark 和 Zapier 的 AutomationBench 等评测中取得领先表现，AutomationBench 得分为 51.3%。

![image](https://mmbiz.qpic.cn/sz_mmbiz_png/5L8bhP5dIqHd9ZQdYVLjibd9RwvZQia2sWwdf6M8mV1ibBxjE31wegLyFZPkrwlHxiappacIVaExW2gCwJ2nWMia3FMHHO2n8Kbibju7JwW0V4U2k/640?wx_fmt=png&from=appmsg)

![image](https://mmbiz.qpic.cn/mmbiz_png/5L8bhP5dIqGcQABmY3PYmXNOCMtNsernr3YSfc4WQCgA2L7QfSaDBj5GygHJODILxqse7A4y7ibyUB0nUuwj7cQhdzEL5SDbQUEL0AFTkURM/640?wx_fmt=png&from=appmsg)

![image](https://mmbiz.qpic.cn/mmbiz_png/5L8bhP5dIqGqiabAdWmGhXn5jv4qvtZibE5ulTRss9UzFDhJvSEDDZcia0tyEXmb5Re55mUK3AXdOtY4hsRZPibV5gJZEtH1gDCDwn4qspnJpHs/640?wx_fmt=png&from=appmsg)

Argon 也强调视觉理解能力。Google 表示，模型可以分析专业图表、理解长视频，并根据多份文档采取行动。在长视频理解评测 LVBench 中，Argon 得分 91.7%。

> [!NOTE]
> **注解｜排名可确认，独立可复现性有限。** 上述名称和数字均出现在 Google 公告中，但一篇发布博客及其图表不是独立评测。关键缺项包括模型快照、Agent scaffold、工具权限、每题预算、重试策略、完整轨迹、方差和失败分类。作为参照，公开的 [SWE-bench](https://github.com/SWE-bench/SWE-bench) 明确提供任务、容器化 harness 与结果报告；DeepSWE v1.1 若不开放同等级材料，77.9% 不能直接与其他软件工程榜单横比。AutomationBench 51.3% 即使排名第一，也意味着在其计分口径下仍有大量任务未完成。

已进入 Google 内部工程流程

Google 表示，已有数千名员工在日常工作中使用 Argon，应用场景包括代码调试、算法设计和大型代码库迁移。

在量子计算领域，Argon 帮助研究人员优化量子算法中的时空资源，也就是量子比特数量与门操作数量的乘积。Google 称，在一项测试中，Argon 仅用几分钟就将已发表的基准结果提升了 40%。

在数据中心内存优化项目中，Argon 代理分析了全网的性能监控数据，并自动识别和实施优化方案。相关方案上线后已释放超过 300 TiB 内存，预计总节省量将达到 500 TiB 至 1 PiB。

Argon 还参与了 Google 内部 C/C++ 代码库向 Rust 的迁移工作，覆盖 re2、libgav1 等核心库，并延伸至超过 80 万行代码的 Fuchsia Zircon 内核。由于涉及关键基础设施，这些迁移仍需经过自动化审计、人工评审和仿真测试。

在开源视频解码器 libgav1 项目中，Argon 代理通过多轮性能测试和编译器分析，重写了约 3.2 万行 SIMD 代码。新的 Rust 版本在保持视频输出一致的情况下，运行速度达到原 Rust 版本的 2.7 倍。

> [!NOTE]
> **注解｜内部案例证明可用性，不足以估计因果贡献。** Google 官方逐项给出了 40%、300 TiB、800K+ LOC、32K LOC 和 2.7×，并明确大型迁移仍需自动/人工审计、仿真和评审。缺少的是对照组、工程师时长、候选方案淘汰数、缺陷密度、回滚率及变更记录。尤其 LOC 是迁移规模而非质量指标；libgav1 的恰当对照还应包括优化后的 C++、端到端吞吐、不同 ISA 与功耗，而不只是旧 Rust port。[Google 官方公告](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-argon/)

网络安全能力与现实考验并行

网络安全是 Argon 首批落地的重点领域。Google 称，该模型能够自主发现、验证并修复关键软件漏洞。

网络安全公司 Wiz 已通过「Scan for Good」计划使用 Argon，为公共基础设施免费排查高风险暴露面。Google 表示，Argon 曾发现一项影响全球医院所用医疗软件的严重漏洞，该漏洞可能暴露敏感个人信息，此前的前沿模型没有识别出这一风险。

在 CWE-bench v1 漏洞修复评测中，Argon 以 68% 的成绩并列第一。

![image](https://mmbiz.qpic.cn/sz_mmbiz_png/5L8bhP5dIqHicjXE8n63honDutTD84jRXlWQmhSN0BwiaMLLoiaqXZmLe0XR9bXOKnmkWNgT6VV7yvVCFsa95iblicTDd44icMNW8uBMMuzUBF3yc/640?wx_fmt=png&from=appmsg)

Google 还称，在覆盖 20 种编程语言的内部漏洞测试，以及不提供源代码的黑盒渗透测试中，Argon 的表现均优于 Gemini 3.8 Flash Cyber。

![image](https://mmbiz.qpic.cn/mmbiz_png/5L8bhP5dIqEsaTTpwqiahvvz9icNOXyV0ZfJn7yeAonLPoyu5U7C1GaiaolItZiap7vAxicprkupGFomIfP2gzYWFByZibnI4JibHVTZOLMIQLALiaA/640?wx_fmt=png&from=appmsg)

> [!NOTE]
> **注解｜安全成效与双重用途必须同时评估。** 68% 是漏洞修复 benchmark 结果，不等于真实环境中的安全发现精确率或修复可上线率。医院软件案例尚无 CVE、受影响版本、披露时间线或独立技术报告，因此只能归类为厂商与合作方叙述。真实部署还需分别报告误报、漏报、重复发现、验证沙箱、补丁回归、人工确认成本与披露合规；“无源代码黑盒渗透”尤其需要严格的授权范围和执行隔离。

随着模型能力提升，Google 也在同步强化安全机制。Argon 会对网络攻击以及化学、生物、放射性和核相关滥用请求进行限制，并通过内部激活监测、自动化红队测试和人工评估识别潜在风险。

针对间接提示注入攻击，Google 通过对抗训练和自动化测试提升模型的防护能力。公司还部署了针对模型失配的监控机制，跟踪模型的推理过程与行动轨迹，必要时中止任务执行，并对高风险训练和评测环境进行隔离。

![image](https://mmbiz.qpic.cn/mmbiz_png/5L8bhP5dIqHKRwicVLhKkfoBk8cttSwC9407ib2VUgvWjicAsKXEtoG2nOmyUQBayVIhPblGq98FvibNWzKUVBp4D5kp3yic0iaiampIe4ywVia3Siak/640?wx_fmt=png&from=appmsg)

> [!NOTE]
> **注解｜运行时控制比模型拒答更关键。** 对可调用工具的长周期 Agent，提示注入防御不能只靠对抗训练；还要有最小权限、域名/动作 allowlist、数据来源标记、凭据隔离、不可变审计日志、危险动作审批与可回滚执行。监控“推理过程”也不是可靠的完整解释器：应以外部可观察的工具调用、状态改变和策略违规为主证据，并公开监测器自身的漏检与对抗鲁棒性。

不过，评测成绩与真实工作体验之间仍存在差距。

彭博社报道称，Google 内部对 Gemini 4 在编码等关键任务中的表现仍有疑问。知情人士表示，模型虽然在行业基准测试中表现突出，但员工真正使用时，部分编码任务依然难以稳定完成。

![image](https://mmbiz.qpic.cn/mmbiz_png/5L8bhP5dIqEmqAAFBJFlicVSOgjnthDgaKKtVrqwW6C3gvjQfGRe4FCaUawOhchRgEcBT7gslib85SrxSEHnuR1G0Sk6cdEic7QMiaCWfrcQqDs/640?wx_fmt=png&from=appmsg)

Argon 能否兑现其长周期推理和复杂任务执行能力，还需要更多真实场景验证。

> [!NOTE]
> **注解｜这里是全文最重要的校准。** benchmark 通常有封闭任务、明确验收器和固定环境；日常工程则包含含混需求、私有依赖、跨团队约束与不可逆操作。应优先观察生产分布上的 acceptance rate、返工率、故障逃逸率、人工监督分钟数、端到端 lead time 和每个合格变更的成本，而不是仅用解题通过率外推“长周期能力”。彭博原文有付费墙，本文对匿名内部意见的转述无法在此独立核实。

Google 表示，公司正在参与美国政府推动的模型预发布自愿流程，首批测试者将帮助 Google 评估模型表现，并进一步完善安全防护措施。

在完成早期测试后，Argon 将逐步向开发者、企业和消费者开放。首批公开用户将包括付费 API 客户和 Google AI Ultra 订阅者。

参考链接：

https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-argon/

https://www.bloomberg.com/news/articles/2026-09-30/google-grapples-with-employee-skepticism-about-new-gemini-model?srnd=phx-ai

> [!NOTE]
> **结语｜可证伪的观察清单**
>
> 后续判断 Argon 是否兑现承诺，最有信息量的不是更多精选 demo，而是四类材料：公开可重放的长轨迹；固定预算下随任务时长变化的成功率；Google 内部迁移的合入、回滚和缺陷数据；安全案例的协调披露与补丁记录。若这些证据出现，百万 Token 才能从容量规格升级为工程能力结论。
