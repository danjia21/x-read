---
format: notes-v1
title: "对阶跃 Step 5 Preview 的真实评价"
source_title: "对阶跃 Step 5 Preview 的真实评价"
source_url: "https://mp.weixin.qq.com/s/gxdmcx08X0-O4J4fQ0fkjQ"
source_language: "zh"
entry_language: "zh"
published: unknown
read_date: "2026-09-28"
authors: []
topics: ["Large Language Models", "AI Agents", "Model Evaluation"]
tags: ["step-5-preview", "stepfun", "moe", "pareto-frontier", "multimodal-agent", "cost-efficiency"]
---

# Reading guide

背景知识：MoE 的总参数量不等于单次推理计算量；每个 token 通常只激活少数专家，因此 600B/27B 同时描述容量与活跃计算。所谓帕累托前沿，也不是“综合排名最高”，而是在能力、成本、延迟等目标之间不存在全面占优的替代方案。

本文借一次模型发布讨论 Step 5 Preview 的真正定位：重点不是单项榜单名次，而是能力、推理成本、开放程度与 Agent 可用性之间的帕累托权衡。阅读时抓住三条线：600B/27B MoE 与 1M 多模态上下文意味着什么；第三方 benchmark 能证明什么；作者的产品体验能否外推为通用能力。建议先看模型基本面和成本判断，再读 Agent 案例，最后回看“开源前三”等表述的核验注解。较可靠的是公开规格与 Artificial Analysis 数据，主观体验和未来开放承诺仍需持续验证。带着这个问题阅读全文：它改善的是绝对能力，还是单位成本下的可用能力？

## 阅读说明

<!-- x-read-anchor {"heading":"","passage":""} -->

- 原文：[《对阶跃 Step 5 Preview 的真实评价》](https://mp.weixin.qq.com/s/gxdmcx08X0-O4J4fQ0fkjQ)
- 作者、发布时间：未知；用户提供的正文未包含这些信息。
- 微信原页当时无法由自动化工具访问；这些注解依据用户提供的正文生成，图片和视频未能独立检查。
- 本条记录只保存背景解释、事实核验和阅读提醒，不代表原作者观点。

### 先认识两个关键词

**Step 5 Preview 是什么？**

Step 5 Preview 是中国 AI 公司阶跃星辰（StepFun）在 2026 年 9 月推出的大语言模型。你可以把它理解为与 GPT、Claude、Kimi、GLM 类似的“底层模型”：聊天产品、编程助手或自动办事的 Agent 可以把它当作大脑。`Preview` 表示预览版；发布时 API 已可调用，但模型权重尚未公开。

**帕累托前沿是什么？**

它不是 AI 专有名词，而是一种比较多个目标的方法。买电脑时，我们既想要性能高，又想价格低、重量轻、续航长，但通常不能每项都最好。那些“想继续改善一项，就不得不牺牲另一项”的选择，构成帕累托前沿。本文主要比较两个目标：模型能力越高越好，完成任务的成本越低越好。

## 先拆开这句话。

<!-- x-read-anchor {"heading":"","passage":"想聊聊阶跃这周发布的 Step 5 Preview，官方放出来的 Benchmark 数据看起来很不错，在 Artificial Analysis Intelligence Index 里进入了全球开源模型前三。"} -->

`Benchmark` 是统一试题；Artificial Analysis 是独立模型评测机构；Intelligence Index 是它将多项测试合成的综合分。Step 5 Preview 当前得分为 44。需要纠正的是“已经进入全球开源模型前三”：发布方承诺 10 月 15 日开放权重，但截至阅读日 9 月 28 日，权重还未发布，Artificial Analysis 仍将它标成 **Proprietary（专有模型）**。更准确的说法是：“它在计划开放权重的模型中，发布时成绩处于前列。”[Artificial Analysis](https://artificialanalysis.ai/models/step-5)

## 这些规格是什么意思？

<!-- x-read-anchor {"heading":"","passage":"先说下模型的基本面。Step 5 Preview 采用 MoE 架构，总参数 600B，激活参数 27B，支持 100 万 Token 上下文，原生多模态。"} -->

- **MoE（Mixture of Experts，混合专家）**：模型内部有很多“专家”模块，但处理每个 token 时只调用少数几个，以较少计算换取较大的总容量。
- **600B**：`B` 是 billion，即 10 亿；600B 是 6000 亿总参数。
- **27B 激活参数**：每处理一个 token，大约只有 270 亿参数参与主要计算。粗略地说，它拥有 600B 的专家库，每一步只叫一部分专家工作。
- **Token**：模型阅读和生成文字时使用的基本单位，不严格等于汉字或单词。
- **100 万 Token 上下文**：一次请求最多容纳约 100 万 token 的输入与输出。窗口很大，不等于模型在每个位置都能同样准确地记住和推理。
- **多模态**：不只处理文字。官方 API 文档列出文字、图片和视频输入，输出仍是文字。[StepFun API 文档](https://platform.stepfun.com/docs/zh/guides/models/step-5-preview)

## 参数变少不等于退步。

<!-- x-read-anchor {"heading":"","passage":"那阶跃为什么这一次反而没有继续往万亿参数堆？"} -->

`Scaling` 是通过增加模型规模、数据或训练计算量提升能力的路线。作者的限定“架构、数据和训练质量差不多”很关键，但现实中这些条件不会保持不变。更好的数据、专家路由、训练目标、强化学习和推理系统，都可能让较小模型做得更好。对 MoE 还要同时看总参数、激活参数和专家通信，不能只比较 1T 与 600B。

## Release blog 是厂商发布说明。

<!-- x-read-anchor {"heading":"","passage":""} -->

它适合了解厂商想强调什么，却不是完整技术证据。比较稳妥的顺序是：发布说明了解主张，API 文档确认规格，技术报告了解训练细节，第三方复测判断能否重现。Step 5 Preview 发布时尚无完整 Technical Report。

## 这个解释基本准确。

<!-- x-read-anchor {"heading":"","passage":"所谓帕累托前沿，就是在当前技术条件下，你已经没办法让一个指标继续变好，同时又不牺牲其他指标。"} -->

“支配”只针对选定指标成立。若只看能力和价格，某模型可能在前沿；加入速度、稳定性、隐私或能否本地部署，前沿可能改变。模型降价、评测更新或新模型发布也会改变前沿，它不是永久头衔。

## 这段无法完整核验。

<!-- x-read-anchor {"heading":"","passage":""} -->

Karpathy 是知名 AI 研究者 Andrej Karpathy。原文中的 `Jev` 可能是产品名，也可能是转录或输入误差；因为图片和原帖不可读，不宜猜测。

## 可以确认 Step 5 的价格，无法从缺失图片确认具体比较。

<!-- x-read-anchor {"heading":"","passage":""} -->

Artificial Analysis 记录的第一方 API 价格为每百万 token 输入 1 美元、输出 2.70 美元，缓存输入另有折扣。[Artificial Analysis](https://artificialanalysis.ai/models/step-5)

## 对数坐标是什么？

<!-- x-read-anchor {"heading":"","passage":""} -->

普通坐标中从 1 到 2 和从 10 到 11 距离相同；对数坐标关心倍数，从 1 到 10 与从 10 到 100 距离相同。所以图上横向移动一小段，成本可能不是多一点，而是变成数倍。

## “单任务成本”不是 API 单价。

<!-- x-read-anchor {"heading":"","passage":""} -->

Artificial Analysis 实际运行评测，将输入、缓存、推理和回答 token 的费用按任务加权。Step 5 当前约为 0.72 美元/任务，确实有竞争力；但它在整套评测中生成了 160M 输出 token，高于中位数 88M，说明它比较“话多”。低 token 单价不一定在每种工作流中都自动变成最低总价。

## API 可用、权重开放和开源不是一回事。

<!-- x-read-anchor {"heading":"","passage":""} -->

API 可用表示付费调用厂商服务器；释放权重后才可能自己部署。即使发布权重，也要查看许可证是否允许商用、修改和再分发。10 月 15 日是发布承诺，截至阅读日尚未发生。[StepFun 官方发布帖](https://www.linkedin.com/posts/stepfun-ai_introducing-step-5-preview-advancing-the-activity-7507280047326662656-NfUG)

## Case 与 Benchmark 各有用途。

<!-- x-read-anchor {"heading":"","passage":"我们觉得 Step 5 Preview 的 Coding 和长程任务能力确实还是很有竞争力。"} -->

Benchmark 便于统一比较，却可能离真实工作较远；Case 更贴近体验，却容易只展示成功样本。文章没有公开任务清单、失败率、完整 prompt、对照模型或评分标准，所以这说明“有经验的团队形成了积极印象”，不能证明它普遍优于其他模型。`长程任务` 指模型长时间多次读文件、调用工具、修改结果并检查，而非一次问答结束。

## 这是“视觉理解 + Coding Agent”。

<!-- x-read-anchor {"heading":"","passage":"一共和模型交互了三轮（提了一些优化建议），它就搞定了。"} -->

模型从截图推断布局和交互，再在 Claude Code 这类 agent 工具中写代码、启动网页、观察并修改。结果来自 Step 5、Claude Code 的工具与提示、浏览器反馈和作者三轮意见。三轮完成说明交互效率可能很好，但没有源码、测试和对照过程，无法单独判断模型优劣。

## 这个案例至少有三层难度。

<!-- x-read-anchor {"heading":"","passage":""} -->

从视频识别规则；把规则表示成三维几何和状态机；实现并验证程序。“做了验证”是好信号，因为外观相似不等于规则正确。但原文没有测试代码和结果，无法判断覆盖了多少旋转、展开方向和边界情况。

## 这是知识库/RAG 工作流。

<!-- x-read-anchor {"heading":"","passage":"核心思路是，把我们大会过去的视频，以及 YouTube 上我长期关注的一些重要科技博主的视频都放进系统里，把这些视频的 Transcript 变成可以直接调用的 Context。"} -->

`Transcript` 是视频语音转成的文字稿；`Context` 是本次调用中提供给模型的材料。系统通常保存文字稿，提问时检索相关片段，再交给模型回答，而不是让模型凭记忆回答。

## 这里比较的不是纯模型。

<!-- x-read-anchor {"heading":"","passage":""} -->

Codex 与 Claude Code 是不同编程 agent 环境，工具、上下文管理、额度和默认提示都可能不同。Codex 因额度耗尽没有开始修复，不能说明 Step 5 更强。安全修复也不能按“措施数量”验收；需要重放攻击、检查鉴权与限流、跑回归测试，并确认没有误伤正常用户。

## 这体现了 Agent 闭环。

<!-- x-read-anchor {"heading":"","passage":""} -->

人提供错误现象，模型读取截图或日志、改代码、再次运行，直到页面恢复。它比一次生成代码更接近真实开发；不过“页面能打开”只是最低验收，还需自动化测试确认盗刷、播放和其他功能都正确。

## Personal Agent 是什么？

<!-- x-read-anchor {"heading":"","passage":"今年甚至直接发布了自己的终端品牌 STEPX、智能体操作系统 Step AOS 和 Personal Agent Amoo。"} -->

它不是只回答问题的聊天机器人，而是长期了解用户、能调用应用和设备、替用户持续执行任务的个人智能体。`终端` 是手机、电脑、汽车、可穿戴设备或机器人；`IoT` 是物联网。作者对公司路线差异的概括属于战略判断，不能只凭产品名称判断领先程度。

## 这部分有官方资料支持。

<!-- x-read-anchor {"heading":"","passage":"Meta 9 月刚刚发布了一款产品叫 Muse，就是一个非常典型的 Personal Agent。它可以帮你发邮件、订旅行、填表、购物，甚至你关掉 App 以后，它还可以继续在云端工作。"} -->

Meta 称 Muse 运行在专属云端虚拟机中，可使用浏览器、填写表单、协助邮件和旅行任务，并在 App 关闭后继续工作；发送邮件或购买等敏感操作前会请求确认。[Meta 官方发布](https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/)

## 需要来源，也不能直接推断因果。

<!-- x-read-anchor {"heading":"","passage":""} -->

本次找到的 Meta 官方材料没有提供 App Store 排名或“股价因 Muse 上涨”的证据。即使排名和股价变化属实，同期发生也不代表前者导致后者；股价还受财报、宏观市场和其他产品影响。

## 这是全文最后的推论，不是已经发生的事实。

<!-- x-read-anchor {"heading":"","passage":"到那时候，也许阶跃这家公司过去的一些非共识判断会逐步的浮出水面。Coding Agent 之后，Personal Agent 会成为下一轮 AI 产品竞争的重点。"} -->

Muse 的发布说明大公司正在投入 Personal Agent；它能否成为“主战场”，还取决于权限安全、隐私、支付责任、跨应用连接、后台任务可靠性以及用户是否愿意长期授权。阶跃的提前布局可能有经验优势，也可能面对分发与生态劣势，需要用活跃用户、留存、成功率和安全事件判断。

## 读完应该记住什么

<!-- x-read-anchor {"heading":"","passage":""} -->

1. **Step 5 Preview 是面向编程、长任务和多模态输入的 StepFun 旗舰模型预览版。** 卖点不是绝对最强，而是能力与价格的平衡。
2. **帕累托前沿是一种取舍边界。** 本文讨论在能力更高与成本更低之间，哪些模型不容易被同时超过。
3. **600B 总参数和 27B 激活参数是两个概念。** 总参数像专家库总容量，激活参数更接近每一步实际工作的部分。
4. **文章案例值得参考，但不是严格评测。** 它说明 Step 5 在作者工作流中表现不错，不能证明它普遍胜过其他模型。
5. **“开源前三”目前说早了。** 权重发布是未来承诺，之后还要看许可证和第三方复现。
6. **Personal Agent 是作者对下一阶段的判断。** 趋势有现实信号，商业与安全上的胜负仍未确定。

### 参考资料

- 原文：[《对阶跃 Step 5 Preview 的真实评价》](https://mp.weixin.qq.com/s/gxdmcx08X0-O4J4fQ0fkjQ)
- StepFun：[Step 5 Preview 官方产品页](https://www.stepfun.com/step-5-preview)
- StepFun 开放平台：[Step 5 Preview API 文档](https://platform.stepfun.com/docs/zh/guides/models/step-5-preview)
- StepFun 官方发布帖：[Introducing Step 5 Preview: Advancing the Pareto Frontier](https://www.linkedin.com/posts/stepfun-ai_introducing-step-5-preview-advancing-the-activity-7507280047326662656-NfUG)
- Artificial Analysis：[Step 5 Preview — Intelligence, Performance & Price Analysis](https://artificialanalysis.ai/models/step-5)
- Meta：[Introducing Muse: The World’s First Personal AI Agent Built for Everyone](https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/)
