---
title: "Jev 与 Jev-like 开源模型观察（原文注解版）"
source_title: unknown
source_url: unknown
source_language: "zh"
entry_language: "zh"
published: unknown
read_date: "2026-09-29"
authors: []
topics: ["Large Language Models", "Model Evaluation", "Decision Models"]
tags: ["jev", "rlcd", "calibration", "typed-decisions", "openjev", "semif", "laya"]
---

# Jev 与 Jev-like 开源模型观察

> [!NOTE]
> **导读｜阅读路线**
>
> 背景知识：读取生成式 LLM 的下一个 token logits、训练判别式 encoder，以及在 LLM 上加决策头，虽然都能输出选项分数，却有不同的双向上下文、计算路径和校准性质。RLCD 是厂商使用的训练范式名称，公开信息不足以据此还原其具体算法。
>
> 本文比较 Jev 与若干开源“复刻”，关键不在谁最像原模型，而在区分输出接口、推理方式、网络架构和训练目标四个层次。阅读时抓住三类路线：直接读取 LLM 候选 logits，双向 encoder 加决策头，以及 LLM 底座加 adapter/head。建议先理解 typed probabilistic decision，再读分类框架，最后审视个人测试与 RLCD 推断。公开资料能确认 Jev 的接口和部分厂商主张，但底层架构、训练算法和校准证据不足。带着这个问题阅读全文：开源项目复现的是 Jev 的外部行为、模型结构，还是仅仅相似的 API 形状？

> [!NOTE]
>
> ## 阅读说明
>
> - 原文由用户直接提供，没有公开链接、标题、作者和发布时间；标题由本文根据内容拟定。
> - 原文中的图片无法访问，以下以 `[原文图片]` 保留其位置，无法独立检查图片里的榜单、测试结果或交易截图。
> - 原文保持普通 Markdown 和作者叙述；标记为 **注解** 的 callout 是概念解释、事实核验或证据边界，不代表原作者观点。
>
> ## 一分钟概览
>
> 原文关注 TypeSafe AI 的 Jev：一种不生成自由文本、而是返回 `choice`、`score`、`noul` 等 typed probabilistic decisions 的模型。作者将 Jev-like 开源实现分成三类：直接读取现成 LLM 的候选 logits、双向 encoder 加决策头、LLM 底座加 adapter/决策头，并根据个人测试认为 Jev 的通用业务效果明显领先。
>
> 这个分类框架有启发性，但阅读时需要持续区分四层：**输出接口、推理执行方式、底层网络架构、训练目标**。TypeSafe 目前只公开了 Jev 的接口、部分性能主张，以及“强化学习校准决策（RLCD）”这一训练范式名称，没有公开足以复现的架构和训练算法。因此，社区项目复刻的是不同层次的外部行为，不能据此反推出 Jev 本体。

朋友们好呀，这里是「探索AGI」。

6 sol没发布、opus 5.2也没发布。
所有风头都被jev抢了。

开源社区再次梦回openclaw时刻。

[原文图片]
> [!NOTE]
>
> **注解｜文章的语境。** 原文写于 Jev 发布后迅速走红、社区密集推出兼容实现的阶段。`6 sol`、`opus 5.2` 和 `openclaw` 的具体指代依赖原图或发布上下文；由于没有原始链接和图片，本文不猜测其正式产品名，也不核验“没发布”这一时效性陈述。

好了，回到这个模型，这几天已经刷屏了，

简单说几句，这不是一个自回归模式的模型，输出从自然语言，变成了某个类型的概率。

相当于 A or B， Jev就等于这个 or。

输出3种模式，其实就像是多分类感知机。
（梦回上个机器学习时代。）

既可以做二分类，也可以做多分类，也可以输出概率。

跟毒师的叮叮叔一个对话模式。

[原文图片]
> [!NOTE]
>
> **注解｜接口描述大体正确，架构结论需要收窄。** TypeSafe 将 Jev 描述为“非结构化状态输入、typed probabilistic decisions 输出”，公开接口包含三种 primitive：`choice`、`score`、`noul`。它一次返回预定义类型的判断，而不是逐 token 生成回答字符串。[TypeSafe AI 官方介绍](https://typesafe.ai/blog/introducing-system-one-models-and-jev)
>
> 但“不是自回归模式”至少有两层含义：底层网络是否是 causal autoregressive architecture，以及本次推理是否运行 autoregressive decoding loop。官方表示 Jev 并行产生输出，却没有公开网络层结构，所以只能确认**外部执行不表现为逐 token 文本生成**，不能从接口断言底层架构。
>
> “Jev 就等于这个 or”是不错的产品直觉：它像软件里的模糊条件判断。不过它不只是传统固定类别的多分类感知机。问题和候选描述可以在请求时用自然语言定义，模型需要理解状态、问题与候选之间的语义关系。真正的新意是把这种开放文本判断封装成可直接进入程序控制流的概率接口。

ai时代学习相对论：学的越快，学的越慢

昨天还需要waitlist的Jev，今天对有所人免费开放了。

上周还闭源的Jev，几天就一堆jev-like的开源模型了。

[原文图片]
我这几天有测试这类开源模型，以及jev的效果。
给朋友们分享一下一下观察与思考。
> [!NOTE]
>
> **注解｜“开源 Jev”更准确地说是开源 Jev-like。** OpenJev 项目明确声明，它复刻的是 Jev 的接口模式，并不复现 Jev 未披露的模型或训练方法。[OpenJev 仓库](https://github.com/rkendel1/open-jev) 在缺少 Jev 权重、架构和 RLCD 训练细节的情况下，社区能快速复制的是：输入状态与 typed questions，输出候选概率；无法证明复制了 Jev 的能力来源。

首先，聊一下，jev-like的开源模型是怎么整的？

[原文图片]
分为3类。
> [!NOTE]
>
> **注解｜三分法有用，但不是能力等级。** 后文三类可以概括成：LLM logits readout、bidirectional encoder + decision head、LLM + adapter/head。它们在开放域语义能力、时延、上下文长度、训练成本和校准方式上取舍不同，不能简单理解为从“低级”到“高级”。

最轻的一种模式，如semlf ，直接取现成的模型的选项分数。

把背景、问题、选项都给qwen，处理完之后，直接取代表ABC选项的logits，转成概率。

（差不多是2023年的老玩法了）

[原文图片]
> [!NOTE]
>
> **注解｜这里应为 SemIf，机制描述正确。** SemIf（早期名为 OpenJev）把候选项映射成 A、B、C 等单 token，执行一次 Qwen forward，读取最后位置上这些 token 的 logits，再只在候选 token 集合内做 softmax。它不调用 `.generate()`，没有答案句子和 JSON 修复。[SemIf 项目说明](https://jevforagents.com/builds/semif-openjev)
>
> 若候选 token 的 logits 为 \(z_i\)，返回的是：
>
> \[
> p_i=\frac{e^{z_i}}{\sum_{j\in C}e^{z_j}},
> \]
>
> 即**以候选集合 \(C\) 为条件的分布**。这不等于模型对现实中所有可能答案的完整概率：若正确答案不在候选中，softmax 仍会把 100% 概率分给现有选项。因此生产使用通常需要 `other`、abstain 或低置信度升级路径。
>
> 还要注意：Qwen 底座本身依然是自回归 causal LM，只是这里没有执行多 token 自回归生成。这正说明“自回归架构”和“自回归解码”不能混为一谈。

另一个路线是，laya，用cross-encoder加决策头。
laya家族有3个版本。

基本都是mmBert-base/large。总参数量最大在421M。

（嗯，大概是bert时代的label embeding ,或者 label match玩法）

这真属于是，Make BERT Great Again了。

但效果也是真拉，真的不要相信这些小镇做图家。

[原文图片]
> [!NOTE]
>
> **注解｜架构方向判断基本正确，型号表述需修正。** Laya 把状态、问题和候选文本交给双向 encoder 与 typed decision head，一次 forward 输出 `choice`、`score`、`noul`。三个公开 checkpoint 中，英文版 `laya` 与 `laya-typed-decisions` 使用 421M 的 ModernBERT-large；多语言版使用 322M 的 mmBERT-base。因此“最大 421M”正确，“基本都是 mmBERT”不准确。[Laya 仓库](https://github.com/Dancing-coin/l-aya)
>
> 它确实与 BERT 时代的 label-semantic matching / cross-encoder 有亲缘关系，但不是固定 \(K\) 类线性头：候选标签及描述可以在运行时传入，模型比较状态、问题和选项表征。
>
> 原文“效果拉”的个人观察，与项目方后来公开的零样本限制方向一致：Laya 基础 checkpoint 在其 typed-decisions 数据上接近随机或低于多数类基线，能力主要来自专域 fine-tuning；高基数选项、`score`、`noul` 和跨语言路由也有已知失败模式。与此同时，项目报告专域微调能显著改善结果。因此更准确的定位是：**它是低时延、适合专门化的决策底座，不是开箱即用的通用 Jev 替代品。**

最往深一层，就是保留大模型底座，重新训练决策头了。

在qwen 0.6b的基础上，加lora训练一个adater + 一个小的决策头。

决策头，会把题目的表征+选项的表征，一起比较，算选项的分数。

但是这些更复杂，所以现在基本都是挂名rl，只做了sft。

[原文图片]
> [!NOTE]
>
> **注解｜这是能力与成本之间的折中路线，但不能按项目标签判断训练方法。** 小型 LLM 保留较强的开放域语义表征，LoRA/adapter 与 head 学习 typed decision，可避免完整文本生成，也可能比纯 encoder 更善于处理隐含语义。
>
> “挂名 RL、实际只做 SFT”需要逐项目检查 loss、采样和更新代码才能成立。交叉熵蒸馏、监督式概率匹配、proper scoring rule 和 policy-gradient RL 是不同训练方法；仓库名称里出现 RLCD 不能证明其实现了 TypeSafe 的 RLCD，反过来，不使用 RL 也不意味着模型不能经过后处理校准。
>
> 一个独立 JevRL 实验公开了“两次采样 + proper reward”的小型原型，但它只使用冻结的 Qwen2.5-0.5B、142K 参数 head、合成数据和单随机种子，并明确声明不复现外部 Jev。[JevRL 项目页](https://jevrl.github.io/) 这说明社区仍在探索怎样训练校准决策，而不是已经获得了 Jev 的配方。

好了，最后说说使用感受。

我在一些弱智吧题目上测试了下。

laya的速度最快，但是基本不对。 英语版本比中文版本好一点点。基本就是掷硬币的概率。

openjev/qwen3.5-4b的表现大概是最好的，简单题都能对，但是批量的延迟明显高于Jev。

harshatheg/Qwen-2.5-1B-RLCD的表现会比laya好一些，但是不如4b的结果。

[原文图片]
> [!NOTE]
>
> **注解｜这是有价值的体验报告，不是可推广 benchmark。** 这组结论缺少完整题集、样本量、prompt、硬件、量化方式、批大小、延迟分位数和评分规则，无法据此建立模型排行榜。特别是 Laya 与 Qwen 路线的目标不同：前者用较小的双向 encoder 换低延迟，后者保留 4B causal LM 的语义能力，prefill 成本自然更高。
>
> 此外，应该分别测量：
>
> - argmax accuracy / balanced accuracy；
> - Brier score 或 log loss，衡量整条概率分布；
> - ECE 与 reliability diagram，衡量置信度校准；
> - selective risk / coverage，衡量只处理高置信度样本时的风险；
> - p50/p95 latency、吞吐和单位决策成本；
> - 改写问题、交换选项顺序和增加 `other` 后的稳定性。
>
> 只比较“答对多少题”会错过 Jev 所声称的关键价值：概率是否可信，以及能否据此安全地自动执行或升级人工复核。

大概就这个样子：

洗车店离我家只有 50 米，我要去洗车，应该开车去还是走路去？

[原文图片]
> [!NOTE]
>
> **注解｜这是测试隐含目标恢复，而不是距离常识。** “走路”符合短距离出行常识，但任务目标是洗车，车辆必须到达洗车店，因此应选“开车”。模型需要从“我要去洗车”恢复未显式写出的约束。
>
> 要把这道趣味题变成更可靠的诊断，可以构造最小对照组：把洗车改成买咖啡或取快递；改变距离；显式写出“车必须到场”；交换选项顺序；增加“叫人代驾”或“以上都不是”。这样才能区分语义理解、位置偏置、模板记忆和偶然命中。

当然，我觉得这些都能理解，毕竟以前这些case，对于大模型来说本身就很难解决。

那怎么可能只是换个名字，加一点点策略就变好了呢？
> [!NOTE]
>
> **注解｜关键不只是改输出头，而是底座表征与训练分布。** 如果任务依赖常识、语用反转和隐含目标，小 encoder 即使输出格式完美，也可能没有足够的开放域表征。相反，从强 LLM 读取 logits 可以继承部分语义能力，却不自动获得概率校准。输出头、底座、训练数据、objective 和校准过程缺一不可。

我自己真实的业务实测，Jev可以做到7，80分，但是开源的只有20多。

所以Jev确实也是有2把刷子的，感兴趣的朋友一定要去试试看。
> [!NOTE]
>
> **注解｜真实业务评测很重要，但数字仍需实验设计。** 私有业务数据通常比公开 quiz 更能预测部署价值，不过“70–80 分”和“20 多分”需要说明分母、类别分布、是否按置信度拒答、是否调过 prompt、是否使用相同输入预算，以及评测数据是否接近某个模型的训练分布。最有信息量的发布方式是匿名化任务定义、完整失败类型、置信度分桶和成本—覆盖率曲线，而不一定要公开敏感业务文本。

但jev也不是万能的，x上有人用jev做交易，目前已经亏了1390%。

[原文图片]
> [!NOTE]
>
> **注解｜无法核验，而且“亏损 1390%”需要解释计算口径。** 没有原帖、策略、杠杆、时间窗口和基准，不能把截图归因于 Jev。即使数字真实，它也更多说明：概率决策接口不会自动提供因果预测能力、风险管理或执行纪律。模型信心不是交易胜率，经过静态 benchmark 校准的概率也可能在非平稳市场中迅速失效。

最后

我觉得Jev的RLCD到底是啥不重要，最重要的还是这个方向，

就类似当初的o1，迟早会有一个梁叔叔的R1一样，把所有的秘密都开源出来。
> [!NOTE]
>
> **注解｜方向重要，RLCD 细节同样决定能否安全落地。** 原文抓住了一个重要系统趋势：Agent 内部有大量高频、小粒度、有限动作空间的判断，用旗舰生成模型逐个生成和解析字符串，往往浪费延迟与成本。typed decision model 可以成为“模糊 if 语句”，负责工具路由、证据判断、风险分级和人工升级。
>
> 但若概率要决定是否退款、是否执行工具或是否跳过人工复核，RLCD 的细节就不能忽略。TypeSafe 只公开表示 RLCD 优化“calibrated decisions”，尚未披露足以复现的 reward、parallel sampler、训练数据构造或跨域校准实验。[TypeSafe AI 官方介绍](https://typesafe.ai/blog/introducing-system-one-models-and-jev) 应继续追问：reward 是否为 strictly proper scoring rule，soft targets 如何产生，校准能否跨领域保持，分布漂移如何监控。
>
> **注解｜“不能 hallucinate”也需要窄化。** Jev 的 schema 约束能保证不会生成候选集合以外的值，即避免类型错误；这不代表不会做出语义错误。如果正确选项缺失，模型仍可能在错误候选中给出一个格式完全合法、甚至高置信度的结果。类型安全解决的是输出空间，不能替代事实正确性和风险控制。

以上，既然看到这里了，如果觉得不错，随手点个赞、在看、转发三连吧，如果想第一时间收到推送，也可以给我个星标🌟～

谢谢你看我的文章，我们，下次再见。
> [!NOTE]
>
> ## 读完应该记住什么
>
> 1. **Jev 的公开创新首先是面向软件的 typed probabilistic decision interface。** 它输出 choice、score 或二元概率，而不是自由文本。
> 2. **单次 forward、不生成文本，不等于底座不是自回归模型。** SemIf/OpenJev 使用 Qwen causal LM，却不运行多 token decoding。
> 3. **社区三条路线复刻的是不同层次。** logits readout、双向 encoder 决策头、LLM + adapter/head 各有取舍，都不能证明复现了 Jev 本体。
> 4. **概率输出不自动等于校准概率。** 应同时报告 Brier、ECE、selective risk、分布漂移和任务级可靠性。
> 5. **Laya 快，但基础 checkpoint 的通用零样本能力有限。** 它更适合作为专域微调的低时延底座。
> 6. **类型安全不等于事实正确。** schema 内的错误判断仍然是错误，生产系统必须保留 abstain、阈值和升级机制。
> 7. **真正值得关注的是系统分工。** 规则处理确定条件，typed decision model 处理高频模糊判断，生成式 LLM 处理开放式规划与表达，高风险和低置信度结果交给人工。
>
> ## 继续跟踪的问题
>
> - TypeSafe 是否会公开 Jev 的网络结构、RLCD objective、sampler 和训练数据构造？
> - Jev 的校准能否跨语言、领域和候选数量保持，还是每个 decision site 都需单独校准？
> - 当候选集合不完备时，`other` 或 abstain 能否有效降低 selective risk？
> - 在同等准确率与校准水平下，三类开源路线的延迟—成本—能力 Pareto frontier 如何？
> - 线上分布漂移时，怎样低成本监控概率失真？
>
> ## 参考资料
>
> - 用户提供的中文文章正文（无公开链接；原图不可访问）
> - [TypeSafe AI：Introducing System One Models & Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev)
> - [OpenJev：直接读取 Qwen3.5-4B typed option logits](https://github.com/rkendel1/open-jev)
> - [SemIf 项目说明](https://jevforagents.com/builds/semif-openjev)
> - [Laya 源代码仓库、benchmark 与已知限制](https://github.com/Dancing-coin/l-aya)
> - [JevRL：冻结小型 LLM 与决策头的校准奖励实验](https://jevrl.github.io/)
