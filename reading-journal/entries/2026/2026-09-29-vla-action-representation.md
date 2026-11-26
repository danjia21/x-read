---
format: notes-v1
title: "VLA 的 Action 表示难题：数据、跨本体复用与 Scaling"
source_title: "具身智能里，更大的骗局可能是VLA"
source_url: "https://mp.weixin.qq.com/s/c8SHR5bvwrdChiYgvzHv_w"
source_language: "zh"
entry_language: "zh"
published: "2026-09-08"
read_date: "2026-09-29"
authors:
  - "傲慢与偏见"
topics:
  - "Embodied AI"
  - "Robot Learning"
  - "Multimodal Models"
tags:
  - "vla"
  - "action-representation"
  - "robot-foundation-model"
  - "cross-embodiment"
  - "robot-data"
---

# Reading guide

背景知识：VLA 把视觉、语言与动作共同建模，但 Action 不像文本 token 那样天然共享语义；同一数字向量可能代表关节角、末端位姿或控制增量。跨本体复用因此首先是表示与可观测性问题，而不只是扩大数据规模。

本文真正质疑的不是 VLA 是否有用，而是 Action 能否像语言 token 一样获得跨任务、跨数据源和跨机器人本体的统一语义。阅读时沿四层递进：任务相关信息是否被记录，观测与动作是否正确对齐，动作表示在控制直接性与可迁移性之间如何取舍，以及 scaling 能否承担适配成本。建议先读“行动如何变成数据”，再重点读表示层分歧，最后回到 VLA 的扩展论证。可观测性和动作语义问题有坚实技术基础，但“骗局”是修辞，不能替代具体模型比较。带着这个问题阅读全文：真正应该复用的是关节动作、末端轨迹、对象状态变化，还是从数据中学习出的 latent action？

## 标题是修辞，主张是表示问题

<!-- x-read-anchor {"heading":"","passage":""} -->

原文来自微信公众号「后见之偏」，署名“傲慢与偏见”，发布于 2026-09-08。本条记录只保存阅读注解；正文、图片与参考文献请在[原文](https://mp.weixin.qq.com/s/c8SHR5bvwrdChiYgvzHv_w)查看。文章并非证明 VLA “无效”，而是质疑：共同训练 V、L、A，不等于 Action 已获得类似语言 token 的跨本体统一语义。这个较窄且可检验的命题，比标题的“骗局”更值得对待。
一个新的长文，从行动到数据:具身智能究竟需要保存什么？

## 全文的四层问题

<!-- x-read-anchor {"heading":"","passage":"从数采，到VLA，我们在尝试解决什么问题，又忽略了什么问题。"} -->

可把后文压缩为四个递进问题：① 任务相关信息是否被记录或可从历史中识别（observability / identifiability）；② 观测、控制与结果是否正确对齐；③ Action 表示在控制直接性与跨 embodiment 复用之间如何取舍；④ VLA 扩展能否用足够的数据覆盖、适配与端侧计算来承担这笔复杂性。

## 这是部分可观测问题，不只是“数据多少”

<!-- x-read-anchor {"heading":"","passage":"如果两个真实状态要求机器人采取不同的动作，而在保存下来的全部数据里，它们却没有留下任何可以区分的差异，那么模型再强，也不会凭空知道这两个世界其实不一样。参数可以越来越多，信息不会因此从不存在的地方长出来。"} -->

若潜在状态 $s_1,s_2$ 在已保存的观测历史上不可区分，却对应不同最优动作，单纯增大 policy 容量不能消除这个不可识别性。工程上的处方只能是增加传感、保留更长的 action–response 历史、主动探测，或改变任务/安全约束；“更大模型”只能更好利用已存在的痕迹。

## 数据 schema 不等于物理语义

<!-- x-read-anchor {"heading":"","passage":"格式可以重新编码，丢掉的关系却未必能够重新创造。"} -->

把数据转成统一 tensor 形状，只解决 syntactic interoperability。可学习的 semantic interoperability 还要求坐标系、单位、采样时钟、命令与实测状态、控制器闭环、延迟与安全裁剪都有可追溯语义。这也是跨数据集合并中最容易被“统一格式”掩盖的部分。

## 把这条“表示轴”改写成可测的系统问题

<!-- x-read-anchor {"heading":"","passage":"所以这些路线并不是简单地从落后走向先进，它们更像是在一条表示轴上移动。越靠近具体机器人，控制意义越明确，跨身体复用越困难，越往抽象层移动，可利用的数据来源越广，跨任务和跨身体共享的空间也越大，但重新落回具体控制接口的距离随之增加。把哪一部分"} -->

不同表示可用三组指标比较：① 可执行性（落到特定控制器后的 tracking error、latency、constraint violation）；② 可迁移性（新机器人/任务需要的示范量与参数更新量）；③ 充分性（对任务结果与风险的信息保留）。只报 success rate 很难区分“学到了跨本体结构”与“在有限本体集上做了高容量适配”。

## 已有跨本体正证据，但“统一 Action”仍不成立

<!-- x-read-anchor {"heading":"","passage":"所以VLA统一的首先是模型接口，不一定是行动本身。"} -->

Open X-Embodiment / RT-X 证明了多机器人联合训练可以产生正迁移，它将一类操作动作标准化为 $x,y,z,roll,pitch,yaw,gripper$ 或其变化率；这是有用的 common denominator，却不覆盖力矩控制、灵巧手、移动底盘与 whole-body control 的全部语义。因此它支持“共享能带来迁移”，也同时支持原文较窄的警惕：dataset schema 的统一不等于 embodiment-independent action semantics。[Open X-Embodiment 项目页](https://robotics-transformer-x.github.io/)

## “在 VLM 上增加 Action”是可观察的架构事实，但不是能力否定

<!-- x-read-anchor {"heading":"","passage":"今天很多所谓机器人的 foundation model，更准确地说仍然带有很强的 VLM foundation 上机器人化的色彩。它们已经拥有越来越强的行动能力，却还没有证明 Action 本身已经形成一套类似语言 token 那样，可以跨"} -->

RT-2 明确从预训练 VLM 出发，把离散机器人动作表成可由语言 tokenizer 处理的字符串，再对 web 任务和机器人数据联合微调。这验证了 web-scale 语义知识向控制迁移的价值，却没有单独证明动作 token 在任意机械结构上共享同一物理语义。与此类似，π₀ 在 VLM 基干外使用专门的连续动作生成机制：这可视为对不同模态结构需求的工程回应，不应简化为 VLA 失败的证据。[RT-2 官方介绍](https://deepmind.google/blog/rt-2-new-model-translates-vision-and-language-into-action/)；[π₀ 论文](https://www.physicalintelligence.company/download/pi0.pdf)

## 端侧部署约束已在反向塑造 VLA

<!-- x-read-anchor {"heading":"","passage":"所以端侧算力也不只是一个等待下一代芯片自然解决的问题。模型可以被量化、蒸馏，可以做得更小，也可以把一部分计算放到云端，但这些选择同样是在重新分配复杂性。模型变小以后可能牺牲能力，计算放到云端以后要重新面对通信延迟和连接可靠性，更大的板卡则意"} -->

Google DeepMind 的 Gemini Robotics On-Device 2 模型卡明确将本地推理、网络约束和对新 embodiment 的少量数据适配列为设计目标；同时也披露了分布外任务与高自由度机器人控制的局限。这直接支持原文“计算边界是模型设计条件”的论点，但还不支持对广义 VLA scaling 上限的定量结论。[Gemini Robotics On-Device 2 模型卡](https://deepmind.google/models/model-cards/gemini-robotics-on-device-2/)

## 最值得保留的判断

<!-- x-read-anchor {"heading":"","passage":"Gemini Robotics On-Device 2 专门面向本地机器人部署，对网络延迟、连接可靠性、端侧计算资源和新 embodiment 适配进行优化。它为第四部分最后关于「LLM 的 Scaling 主要可以发生在数据中心，而机器人"} -->

1. 具身数据的基本单位不应只是“小时”或 episode 数，而应同时描述信息覆盖、动作语义、时间对齐、任务条件与评价约束。
2. VLA 已经证明了 VLM 知识向机器人控制迁移、跨任务学习和一定程度跨本体迁移的实际价值；把它整体称为“骗局”并不准确。
3. 原文最强的批评仍成立：共享网络接口、离散动作 token 或统一数据 schema，并不自动产生跨 embodiment 的统一 Action 语义。
4. 下一步关键实验不是再展示一个漂亮 demo，而是报告跨本体适配的样本效率、动作表示的消融、语言条件的必要性、闭环延迟/安全约束，以及在未见形态与动力学上的受控外推。

**开放问题：**是否存在一个不依赖特定形态、又足够接近闭环控制的 action representation？更现实的答案也许不是单一“通用动作 token”，而是分层表示：共享的任务/对象变化表示，加上 embodiment-specific 的动力学与控制适配器。
