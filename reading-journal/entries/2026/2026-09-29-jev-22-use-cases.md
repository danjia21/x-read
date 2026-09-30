---
title: "最新 Jev 模型怎么玩？全网 22 个爆火玩法！（原文注解版）"
source_title: "最新 Jev 模型怎么玩？全网22个爆火玩法！"
source_url: "https://mp.weixin.qq.com/s/oCKSxnxtuXbQBMIPAr_cwQ"
source_language: "zh"
entry_language: "zh"
published: "2026-09-21"
read_date: "2026-09-29"
authors: ["Datawhale"]
topics: ["AI Agents", "Large Language Models", "Model Evaluation", "Decision Models"]
tags: ["jev", "system-one-model", "typed-decisions", "calibration", "agent-routing"]
---

# 最新 Jev 模型怎么玩？全网22个爆火玩法！

> [!NOTE]
> **导读｜阅读路线**
>
> 背景知识：Jev 被描述为返回候选项、分数与拒绝信号的 typed probabilistic decision model，而不是自由生成文本的聊天模型。此类接口的生产价值取决于概率校准、阈值策略和分布漂移表现，而不仅是 top-1 准确率。
>
> 本文罗列 Jev 的 22 个应用案例，真正值得观察的是一种输出结构化概率决策、而非长文本生成的模型接口能否稳定嵌入产品系统。阅读时抓住三条线：哪些任务适合有限标签或动作空间，概率输出如何支持阈值、路由和拒答，以及 demo 如何升级为生产评测。建议先理解 Jev 的 typed decision 接口，再按游戏、浏览器和业务分类浏览案例，最后看证据与风险注解。案例能证明可能性，不能自动证明规模化准确率、校准度或鲁棒性。带着这个问题阅读全文：每个玩法是真的需要专用决策模型，还是普通分类器、规则或 LLM 同样能完成？

> [!NOTE]
>
> ## 阅读说明
>
> - 原文：[最新 Jev 模型怎么玩？全网22个爆火玩法！](https://mp.weixin.qq.com/s/oCKSxnxtuXbQBMIPAr_cwQ)
> - 作者：Datawhale；编辑及转载账号：极市平台；发布于 2026-09-21。
> - 下文完整保留文章的实质正文、标题层级和图片位置；仅移除关注提示、二维码控件和文末无关推广。
> - 原文保持普通 Markdown 和作者措辞；标记为 **注解** 的 callout 用于解释、核验或限定证据边界。

**极市导读**

Jev 模型近期爆火，本文梳理了最新 Jev 模型在全网走红的 22 个玩法，并讲清了它的三种接入方式——官方控制台、OpenRouter / Vercel 聚合网关，以及官方 Skills 技能包，适合想快速上手这款低延迟决策模型的读者。

Jev这周彻底爆火。创始人Diogo Almeida是前OpenAI研究员，参与过InstructGPT和RLHF，也就是ChatGPT早期对齐技术的核心成员。他这次做出来的Jev，不写长文、不聊天、不写复杂代码，只做一件事，帮你做快速决策。玩游戏时挑下一步往哪走，跑流程时判断哪条规则适用。每百万输入token 0.042美元，输出token免费，有人叫它AI界的蜜雪冰城。

发布不到一周，社区已经跑出二十多种用法。看着很多，底层逻辑完全一致，把眼前的情况拆成有限几个选项，交给Jev挑一个，程序拿了结果接着跑。

![原文图片：Jev 介绍](https://mmbiz.qpic.cn/sz_mmbiz_png/ruv2mHSiaSJAPXUc4e0oUj6GKyJJevkH4icj4BHmbFfmmFw7WawOhyibCOyIRDzNseNeoa0JPPyZgsz6z7QSicyFkWv9PmjXo6CJVbA0hWAcgib8/640?from=appmsg)
> [!NOTE]
>
> **注解｜定位基本准确。** TypeSafe 将 Jev 定义为首个 System One model：输入状态与 typed questions，输出 `choice`、`score` 或 `noul` 等程序可直接消费的结果。官方当前列出的价格确为每百万输入 token 0.042 美元、输出免费，并宣称端到端延迟约 70–500 ms；这些是厂商当前价格与测试口径，不是任意地区和负载下的保证。[TypeSafe 官方发布](https://typesafe.ai/blog/introducing-system-one-models-and-jev)；[官方文档](https://docs.typesafe.ai/introduction)

## 01 爆火的Jev到底是什么

传统的文本大模型是生成式的，抛出一个问题，它一个词一个词往外蹦。这种机制适合创作、推理、写代码，但遇到选择题就显得太重、太贵、太慢。

Jev走的是另一个路子，它是一个轻量的系统一分类与打分模型。每次调用，你给它一段上下文和一组明确的选项，它直接输出每个选项的概率分布，并选出置信度最高的一个。延迟在几十毫秒到几百毫秒之间，成本只有主流大模型的几十分之一。

创始人Diogo Almeida的公告帖在X上拿下了3620万浏览，大家看重的不只是便宜，而是它补齐了Agent工作流里最缺的一块低延迟决策控制面。
> [!NOTE]
>
> **注解｜不要把输出接口直接等同于底层架构。** 可以确认的是 Jev 不生成自由文本，而是并行返回预定义类型的结果；官方还声称使用新架构、parallel sampler 和 RLCD。但网络结构、reward 与训练细节尚未充分公开，不能仅凭 API 断言它就是传统轻量分类网络。“低延迟控制面”则是合理的系统定位：让 Agent 热路径中的局部判断不必每次调用生成式旗舰模型。

## 02 社区整理的20+ 个玩法

我们把官方示例和社区开发者探索出来的玩法全盘梳理了一遍，按照从好玩的玩具到真正进生产的光谱，逐个列在下面。

### 1. 官方：Doom实时游戏操控

官方在发布博文里演示了让Jev玩初代《毁灭战士》（Doom）。Jev每秒大约做10次动作决策，实时控制角色走位和开火。连续跑一小时花费大约7美元，比工程师预期的还要低，验证了高频实时决策的可行性。

### 2. 官方：Wikiracing超长列表跳转

从一个维基百科词条，只靠点击页面里的超链接跳到目标词条。每一步面临几百甚至几千个候选链接，Jev需要挑出离目标语义最近的那一个。这个测试用来验证模型在高基数选项下不会产生幻觉。
> [!NOTE]
>
> **注解｜两项均可由官方发布核对，但有限制。** Doom 输入的是带文本的结构化状态，不是图像；官方也承认专用非 AI bot 可以玩得更好。Jev 单个 `choice` 的基数上限是 255，更多链接使用“先独立打分、再选择”的两阶段方案。“不会产生幻觉”只能解释为输出不会落在候选集合之外，不代表不会选错。[TypeSafe 官方发布](https://typesafe.ai/blog/introducing-system-one-models-and-jev)

### 3. 同时跑50局地铁跑酷

开发者 @_MaxBlade搭建了自动化环境，让Jev同时控制50局《地铁跑酷》。换道、跳跃、下滑都是单次小判断，高并发下调用次数迅速叠加，但50局跑完总费用不到1美分。

![原文图片：50 局地铁跑酷](https://mmbiz.qpic.cn/sz_mmbiz_png/ruv2mHSiaSJBkj0MMA9a2YCzOTg7sA1QSJ6xgLuAbJwC455bt7YRSrk9heknX8IqMic1DyaKRgFDs24JA1Fvicq0Sl0EcKlHvgGt0yrdrEEMiaU/640?from=appmsg)

### 4. 超级马里奥开源控制器

开发者 @faadilhshaik为经典《超级马里奥》开发了Jev驱动的控制器。它直接读取结构化的游戏内存状态，由Jev决定起跳和加速时机，项目已经在GitHub开源。

![原文图片：超级马里奥控制器](https://mmbiz.qpic.cn/mmbiz_png/ruv2mHSiaSJCNgNr6m59IXibWfwrISGJLUUaZsJiajFpb6MIXlpoyXARCYfwulW1EbkYB1OWxZWAgzrs3VQvpicGJiaJTVHRnLwXlc1oRw1szyXU/640?from=appmsg)

### 5. 杀戮尖塔2极速代打

中文开发者paulwei拿Jev跑策略卡牌游戏《杀戮尖塔2》。此前用大模型打牌，单步思考明显卡顿；换成Jev之后，单次出牌决策仅需0.7秒，人类还没看清出牌动画，下一步指令已经给出。

![原文图片：杀戮尖塔 2](https://mmbiz.qpic.cn/mmbiz_png/ruv2mHSiaSJAYmhM3LiawIY7ksXSv3tTwQFJgUhm9OIRwelrnMWnnygaSWKhXBl9BRuuCXDOP6uchupIJDAsQSLxAAcJvdX1kKYtOKFh4qslg/640?from=appmsg)
> [!NOTE]
>
> **注解｜共同点是有限动作空间，不是通用游戏智能。** 外部程序先枚举换道、跳跃、出牌等动作，Jev 只判断当前一步。这种 reactive policy 很快，却不自动具备长时规划或搜索。原文未附仓库、计费记录、成功率或对照协议，因此“不到 1 美分”和“0.7 秒”属于案例报告，不是可迁移 benchmark。

### 6. 3D城市自动驾驶仿真

开发者 @jpschroeder在3D城市仿真环境里接入Jev。车在虚拟街道中行驶，Jev根据前方传感器和路况判定行驶方向，车辆移动后再把新状态传回，整个系统不到一小时就搭建完成。

![原文图片：3D 城市仿真](https://mmbiz.qpic.cn/sz_mmbiz_png/ruv2mHSiaSJDQYjqvwy2VSNUtaJ5uXxic8yKwZia1ojJ1KibteMj2icCKeT2ibp37CFgM8M93IFfC4DauY17laEUbuSBaAUEib7Hhm2kX0ovntTLEU/640?from=appmsg)

### 7. MuJoCo物理仿真火箭回收

开发者 @uttkarsh_42在MuJoCo物理引擎中训练火箭垂直起降。何时点火、开启几台发动机、何时切换着陆姿态完全交由Jev判断。经过12次试验后成功着陆，单次完整试验消耗245次调用，成本仅约0.04美元。

![原文图片：MuJoCo 火箭回收](https://mmbiz.qpic.cn/sz_mmbiz_png/ruv2mHSiaSJAb7YAgREGD2oqcXZPZZudPvAg01hf6gMBiaKdoiaVDRgvRl7mUuykhfCZOvcAqMYk0Bb5Ufzibew7Jnexuq3HH8cZric6D85NkzQg/640?from=appmsg)

### 8. 逐像素概率选色拼图

开发者 @anshuc把图像生成拆解为逐像素的分类选择。给每个像素位置分配颜色选项与概率，程序按照Jev给出的高概率颜色逐步涂抹，拼成完整的低保真图像。

![原文图片：逐像素拼图](https://mmbiz.qpic.cn/mmbiz_png/ruv2mHSiaSJCO3TGUcQfV8OKyw0ZyLAQoibVrW1H0icjIkpDGy2L6r1w1hKI2IVibfZucGbEuv4nl7kwlXhoJI9Vkia8AEKIyhIO0uH4UPjgqjiag/640?from=appmsg)
> [!NOTE]
>
> **注解｜关键工程量在模型之外。** 状态编码、动作离散化、物理约束与失败复位都由外围程序完成。火箭案例还需区分“在线训练”与重复调用固定策略；原文未给出算法或代码，无法判断 12 次试验之间是否发生学习。逐像素选色则是顺序分类生成实验，不宜与专门图像生成模型直接比较。

### 9. Browser Use官方集成jev-ultrafast

Browser Use团队在Jev发布三天内推出了官方集成库jev-ultrafast，两天狂揽2700颗Star。它把网页操作抽象为操作和目标两组选择题，全程无截图、不消耗多模态token，单次往返输出两个决策。

![原文图片：jev-ultrafast](https://mmbiz.qpic.cn/sz_mmbiz_png/ruv2mHSiaSJDrfeUwu7m5INKMHPNuJBiaaWiadf3ew733ZWHBeE0G9icnhAUM6o7OCgAiaeYzAM9keWBftsy4y2rG3wFfcWILf7Vdjc1NgTgsmVQ/640?from=appmsg)

### 10. 真实航班查询7秒实测

Browser Use创始人Gregor Zunic放出一段无剪辑实测视频。Jev驱动浏览器在真实航司官网完成一次完整的单程航班查询，耗时7秒，调用花费仅0.0039美元。
> [!NOTE]
>
> **注解｜开源实现支持核心描述，但需准确限定。** `jev-ultrafast` 将可见 DOM 转为索引表，Jev 一次选择 operation 与 target；遇到 `TYPE_TEXT` 时仍由小型生成模型写文本。仓库记录的是 Google Flights 搜索而非购票，计时 7.073 秒。作者只在单任务、单浏览器 profile 下各做 3 次对照，明确称其不是通用可靠性 benchmark。[Browser Use：jev-ultrafast](https://github.com/browser-use/jev-ultrafast)

### 11. Vercel命令安全审查分类器

Vercel工程师Pranit Sharma将内部运行的Shell命令安全审查分类器从OpenAI大模型替换为Jev。处理速度提升了5到18倍，由于误判率下降，实际准确率反而更高。

### 12. BryoAI商业邮件高频分类

BryoAI CTO Nikhil Mudholkar拿Jev与Gemini跑商业邮件意图分类测试。Gemini在绝对准确率上略有优势，但单次调用成本贵了10到20倍；更重要的是，Jev输出的是经过校准的真实概率分布，便于下游业务系统设定置信度阈值。

### 13. 工单分派与自动化路由

面向客户支持场景，系统将每条新进工单的关键描述提取出来，由Jev从十几个业务小组中选择最合适的主管团队，取代了之前脆弱的手写正则匹配。

### 14. 自动化PR合并资格预审

在持续集成（CI）流水线中，Jev读取改动文件清单和自动化测试报告，快速对该PR是否具备合并资格给出初步判断，高风险PR直接打上待人工复查标签。

### 15. 重复扣费与紧急客服分类

针对金融和电商业务，Jev被用来快速识别重复扣费等高危客诉。遇到客户情绪激动或涉及退款申请，系统在100毫秒内打上紧急度标签，优先推送人工客服坐席。
> [!NOTE]
>
> **注解｜最贴近生产，也最需要业务评测。** 原文未链接 Vercel 与 BryoAI 的原始报告，也没有样本量、类别分布、阈值或 latency 分位数，因此 5–18 倍、10–20 倍和 100 ms 不宜外推。“校准的真实概率”也过强：应在目标分布上用 Brier score、ECE、reliability diagram 与 risk–coverage 检查。退款、命令执行和合并资格的硬规则仍必须由代码强制执行。

### 16. jev-mcp事实核验与注入检测

社区开源了基于模型上下文协议（MCP）的扩展包jev-mcp。开发者可以调用Jev完成多来源事实交叉核验、检测用户Prompt中潜藏的Prompt Injection越狱攻击，并为检索召回内容打语义相关度分。

### 17. fast-jev-compaction长上下文压缩

在Coding Agent运行长任务时，上下文会迅速膨胀。fast-jev-compaction利用Jev快速判断每一轮工具调用的保留价值，剔除无效日志，仅保留关键状态，该项目获得了Jev官方团队的转发赞赏。

### 18. Jev Codex Router任务难度分流

一个多模型路由项目，在任务发起前由Jev预判该代码编辑任务的逻辑复杂度，简单改动直接路由到便宜的小模型，复杂跨文件重构才激活大模型，整体调用开销压降60%以上。

### 19. Armin Ronacher评价的大模型前置分流

Earendil CTO、Sentry创始人Armin Ronacher指出，用主流生成式大模型自己来做分流决策在经济上不合算。Jev的极低延迟和极低成本，让应用在入口层部署高密度的实时流量路由成为可能。
> [!NOTE]
>
> **注解｜这些是元决策。** 相关性、注入检测、日志保留和模型分流都能用同类 primitive 表达，但风险不同：安全漏检和上下文误删可能造成不可恢复的错误。“节省 60%”取决于任务分布、价差、误路由和重试，应比较端到端成本与成功率。原文未提供相关仓库链接，具体数字无法独立核验。

### 20. LangChain博客：Agent外挂决策框架

LangChain官方发表专题博客《Building a Harness with Jev》。文章指出，以往Agent框架的分类决策逻辑往往深埋在闭源系统的定制逻辑中，现在有了通用、便宜且确定性极高的分类模型，这套Harness决策层可以推广到每一个开源Agent。

![原文图片：LangChain Harness](https://mmbiz.qpic.cn/sz_mmbiz_png/ruv2mHSiaSJBPRjic8FVOv99H0yAGrQ8ykicpo41qfejn75UiakKazf5EbHdqichSlHAF7BGPXWFmxDlVRMIfkpB68QjkXJtj7ItqoHo6ANtBfqI/640?from=appmsg)
> [!NOTE]
>
> **注解｜文章存在，但“确定性极高”不是严格结论。** LangChain 展示了 `TypeSafeClassifier`、模型路由与工具风险检查，并将 Jev 定位为生成式 Agent 的补充。风险分类器只是工具执行前的语义 guardrail，不能替代权限、sandbox 与人工批准。[LangChain：Building a Harness with Jev](https://www.langchain.com/blog/building-a-harness-with-jev)

### 21. 链上订单簿自动化交易

部分Web3开发者将Jev接入去中心化交易所。模型高频读取买卖订单簿深度数据，仅输出买入、卖出或观望三个动作。社区普遍评价这是目前最具噱头、但在真实行情里风险最高的用法。
> [!NOTE]
>
> **注解｜三类动作不等于预测优势。** 订单簿是非平稳、对抗性环境，离线校准可能在 regime shift 后失效。没有时间顺序样本外回测、手续费、滑点、仓位和回撤控制，不能把“能输出买卖动作”等同于可盈利策略。

### 22. PrimeLine预注册对比测试：置信度决定胜负

在独立测试机构PrimeLine开展的双盲预注册评测中，两项真实任务上，Claude Opus 5和Haiku 4.5的初始绝对准确率原本追平甚至领先Jev。然而，一旦规则允许模型跳过自身最不确定的样本，Jev在两项任务上全部实现逆转。原因在于Jev输出的置信度具备数学统计意义，而通用生成大模型自我评估的概率常常存在严重过自信。

![原文图片：PrimeLine 对比测试](https://mmbiz.qpic.cn/mmbiz_png/ruv2mHSiaSJBWicSSGvDAKrt9t79qsD4ibeGUvgJAiautFm4wD9ME703w9uS2mY9aZFbzJaegKkmCrbHlKItiacDQ7rFUlTSxL3aRlOlhWDcxXE8/640?from=appmsg)
> [!NOTE]
>
> **注解｜selective prediction 的逻辑成立，具体结果待核验。** 允许拒答时应比较 risk–coverage curve：只处理最高置信度的一部分样本时错误率如何变化。但原文未提供 PrimeLine 报告、预注册页面、数据、样本量或统计区间，本次检索也未找到足以核对设计的第一手公开材料；“两项任务全部逆转”暂不能视为独立证实。

## 03 如何用上Jev

不少开发者看了一圈，最关心的是去哪里才能直接上手调用，以及官方有哪些现成的开发者工具。目前官方和主流聚合网关都已经在第一周内开通了入口：

### 官方控制台与文档入口

TypeSafe官方提供了在线控制台（Playground）与完整的开发者文档，支持通过HTTP API、Python SDK和JavaScript SDK直接发起调用。输入价格统一为每百万token 0.042美元，输出免费。

- 官方文档：https://docs.typesafe.ai/introduction

- 官方控制台：https://console.typesafe.ai/playground

![原文图片：TypeSafe 控制台](https://mmbiz.qpic.cn/sz_mmbiz_png/ruv2mHSiaSJDXLiaMdW5hINovRwlNBGVA1oBjgRfaIuYBNBnjqqwyUobDyBL6mKibB0ricLBB7zuepMiaxRfbic0ybqEv6Xn1YvpLpYPphTc1HH9k/640?from=appmsg)
> [!NOTE]
>
> **注解｜官方接入信息可确认。** 文档给出 HTTP API、Python 和 TypeScript 路径，三种问题可混在同一次调用中并行评估。模型 ID、限额和价格应以实时文档为准。[TypeSafe 文档索引](https://docs.typesafe.ai/llms.txt)

### OpenRouter与Vercel AI Gateway聚合平台

如果你已经在使用现有的模型聚合层，不需要重新申请专属SDK：

- OpenRouter：已在官方模型库上线，模型标识为typesafe/jev，现有接入OpenRouter的代码只需修改模型名称即可切换。

- Vercel AI Gateway：在发布72小时内完成了直连集成，支持全球边缘低延迟分发。

![原文图片：聚合平台](https://mmbiz.qpic.cn/sz_mmbiz_png/ruv2mHSiaSJB4qgjctF2MHs79WCgEUoCzicX7B56hwQADicKM4ll8mQib0syQmTV4TawNzx7ZgOYjribpB6EUXxia4faSmNGV3vZrO0ib9Xxj4XWAk/640?from=appmsg)
> [!NOTE]
>
> **注解｜Vercel 入口可确认。** [Vercel AI Gateway 的 Jev 页面](https://vercel.com/ai-gateway/models/jev)已存在。聚合网关能否完整保留多问题、概率与 confidence 语义，需要按各自 API 实测；OpenRouter 的实时可用性和价格也应在接入时重查。

### 官方Skills技能包：教Agent一次多问

除了基础调用接口，TypeSafe官方还在GitHub开源了 typesafe-ai/skills 仓库。这是一套专门注入给Coding Agent的能力规范，重点纠正Agent喜欢一次只问一个问题的低效模式，指导它在拿到模糊需求时一次性将歧义点列清并附带候选选项。

![原文图片：TypeSafe Skills](https://mmbiz.qpic.cn/mmbiz_png/ruv2mHSiaSJDjVBw7N9It1DautDofxRd2G4GeeHAS3g9758ZgG7icIfiaibCM3pqP7q8NOeHXKyPTQvvcul4WOIAHiaTib8LFcGKUUkpXkSxgpNn0/640?from=appmsg)
> [!NOTE]
>
> **注解｜Skill 是设计指导，不是自动调用器。** 官方 skill 帮助 Coding Agent 查找文档、设计 typed questions 和工作流；安装它不会替代 API key，也不会自动把模糊请求发给 Jev。并行多问适用于共享状态、相互独立的问题；依赖前序答案的问题仍需分阶段调用。[TypeSafe 官方 Skills](https://github.com/typesafe-ai/skills)

## 04 写在最后

Jev从上线第一天引发的推特狂欢，到一周内被塞进各种生产级流水线，给整个开发者生态上了一堂关于分工的课。

对日常做Agent开发的人来说，能带走的启发很明确。一是别指望小模型拥有天马行空的推理能力，它的长处在于把判断压缩成有限选项后的确定性与高吞吐；二是当业务需要接入安全拦截、分流路由、工单分拣这类非生成式任务时，把重型大模型换成轻量决策器，往往既能省下真金白银，又能把响应延迟拉回可用的毫秒级水平。
> [!NOTE]
>
> **注解｜值得保留的是系统分工。** 确定性代码处理权限、额度与硬约束；Jev 处理有限候选上的语义判断；生成式模型处理开放式规划与表达；低置信度或高风险样本交给人工。真正的工程成本常在状态抽取、候选覆盖、动作验证和漂移监控，而不只在模型调用。

> [!NOTE]
>
> ## 读完应该记住什么
>
> 1. Jev 的公开创新首先是面向软件的 typed probabilistic decision interface。
> 2. 22 个案例主要复用闭环控制、高基数选择、业务分类和元路由四类模式，并非 22 次独立能力验证。
> 3. 类型安全只保证输出落在 schema 内，不保证语义正确。
> 4. 概率输出不自动等于校准概率；生产环境应测 ECE、Brier、risk–coverage 与分布漂移。
> 5. 最可靠的分工是代码掌握规则与副作用，决策模型处理窄语义判断，生成式模型处理开放任务。
>
> ## 参考资料
>
> - [原文](https://mp.weixin.qq.com/s/oCKSxnxtuXbQBMIPAr_cwQ)
> - [TypeSafe：Introducing System One Models & Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev)
> - [TypeSafe 官方文档](https://docs.typesafe.ai/introduction)
> - [TypeSafe 文档索引](https://docs.typesafe.ai/llms.txt)
> - [TypeSafe 官方 Agent Skills](https://github.com/typesafe-ai/skills)
> - [LangChain：Building a Harness with Jev](https://www.langchain.com/blog/building-a-harness-with-jev)
> - [Browser Use：jev-ultrafast](https://github.com/browser-use/jev-ultrafast)
> - [Vercel AI Gateway：Jev](https://vercel.com/ai-gateway/models/jev)
