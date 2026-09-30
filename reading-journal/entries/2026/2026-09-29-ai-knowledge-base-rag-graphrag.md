---
title: "企业 AI 知识库翻车复盘：RAG、GraphRAG 与可信 Context（原文注解版）"
source_title: "我自己做了个 AI 知识库，然后翻车了。"
source_url: "https://mp.weixin.qq.com/s/1m0oc8v-POOi1FKo_oriLw"
source_language: "zh"
entry_language: "zh"
published: "2026-09-19"
read_date: "2026-09-29"
authors:
  - "阿颖"
topics:
  - "AI Agents"
  - "Enterprise Knowledge Management"
  - "Retrieval-Augmented Generation"
tags:
  - "rag"
  - "graphrag"
  - "knowledge-graph"
  - "enterprise-search"
  - "context-engineering"
  - "腾讯乐享"
---

# 我自己做了个 AI 知识库，然后翻车了。

> [!NOTE]
> **阅读说明｜来源、证据与利益边界**
>
> 原文来自微信公众号「AI产品阿颖」，作者署名“阿颖”，发布于 2026-09-19。下文保留抓取到的完整实质正文与图片位置。文章是一次单产品、单任务的使用叙事，作者明确称未做横向测评；其中界面截图能证明一次演示结果，但不足以独立证明通用准确率、稳定性或因果机制。产品能力的存在性可由腾讯乐享官方页面交叉核验，性能优越性仍需受控评测。[原文](https://mp.weixin.qq.com/s/1m0oc8v-POOi1FKo_oriLw)；[腾讯乐享官方产品页](https://lexiang.tencent.com/)

我之前还是低估了企业知识库的难度。不知道大家有没有折腾过类似的系统。

上周，我们团队在准备 AI Maker Summit 上海站。特别忙。

我停下来复盘了下，发现大家还是在各种各样的文档之间来回倒腾信息，比如我们有现场的 rundown、预算表、决算表、讲师的分享大纲、PPT、SOP、Checklist，还有之前的用户调查、复盘文档等等。

我当时就在想，要不干脆做一个知识库吧。

恰好这两年，我们组织的大会加起来已经有 100 多场分享。后面可以把这些视频全部转成文本，放进知识库，对外开放给参会用户。

同时，预算、SOP、复盘文档这些内部资料也可以放进去，只要把权限设置好，就能给我们团队用。一举两得。

> [!NOTE]
> **注解｜先定义语料治理，再谈检索**
>
> 这里混合了公开内容、内部财务、流程文档、个人信息与多媒体转写。企业知识库的首要设计对象因此不是 embedding，而是数据分级、文档级与片段级 ACL、保留期限、来源追踪、版本状态和审计。若检索后才做权限过滤，候选集、缓存或生成上下文本身就可能泄露敏感信息；权限应进入索引与检索路径。

一开始，我真觉得这事挺简单。

因为涉及的数据量其实不算大，而且这就是一个非常典型的 RAG 场景。当时我觉得，RAG 这套东西这几年已经很成熟了，基本思路也不复杂。

大致就是文档切块，然后做 Embedding，最后放进 Vector Database。用户提问的时候先做语义匹配，找到相关内容，再把检索结果交给大模型回答。

> [!NOTE]
> **注解｜这是 dense vector RAG 的最小骨架，不是 RAG 的全部**
>
> 生产检索通常还需要解析与表格保真、关键词/稠密混合召回、metadata filter、reranker、查询改写、去重、引用与拒答。更关键的是，问题“这次大会的利润率”同时包含实体消歧（哪一次大会）、时间约束（当前届）、权威版本选择（决算而非预算）和工具计算（收入、成本与公式）；单纯相似度检索并没有被赋予这些约束。

说干就干，我花了 3 亿多 Token，立马做了一个雏形。

![文章图片](https://mmbiz.qpic.cn/mmbiz_jpg/iagroyM7YaBmIGQy9Ky38jNXnJ4GEmWTAdTovIWibBeqKUMOB5Hu4mFkhPaEHxicK87PGic9TsBf4D2icBWHAGwx3PBZQvF49Q0dN5ZWu9lO5EUk/640?wx_fmt=jpeg)

> [!NOTE]
> **注解｜Token 数不是开发投入的可比指标**
>
> “3 亿多 Token”缺少模型、缓存命中、输入/输出比例、代理循环与有效任务完成率，无法换算为工程复杂度或系统质量。适合记录的指标应至少包括：索引成本、单查询成本、p50/p95 延迟、检索 recall@k、答案正确率、引用正确率和失败类型分布。

兴奋的测试了下，发现在一些重要的场景里，表现很差劲。比如我问它，这次大会的利润率是多少。结果它给我找出来的，居然是去年北京站的利润率。

我排查了一下才发现，它其实只是根据这个问题去找语义上最相关的内容，最后命中了几份提到利润率的旧资料。但我问的是今年这一次大会的利润率啊。

虽然这次大会还没有计算过利润率，但我们有决算表，里面写了成本和收入，完全可以计算出来。它并没有这么做。

我继续改，改了半天。没 Token 了。

![文章图片](https://mmbiz.qpic.cn/mmbiz_png/iagroyM7YaBmz7RF2OiasXBaUVvtPROia3Pibs0BUQ1Bn2C33PdXOUtA3yoWdzPNLcszI4OyXIWic0SOnnDGr4SdpLE55RZ3j3JekZx5qK9FPrjw/640?wx_fmt=png&from=appmsg)

> [!NOTE]
> **注解｜失败链条可以拆成四层**
>
> 1. “这次”需要用会话时间与活动实体解析成明确 event ID；2. 检索要按 event、document status、as-of time 过滤；3. 决算表需要结构化抽取而非把单元格任意切块；4. 利润率需要可审计计算，例如 `(收入－成本)/收入`，且先确认作者所用口径。知识图谱可能帮助第 1、2 步，但不能自动保证表格解析、版本权威性和算术正确。

冷静下来复盘了下，我意识到，RAG 的准确率，首先取决于 Retrieval 的质量。如果前面 Retrieval 环节找错了资料，那后面模型推理几乎没有意义。

> [!NOTE]
> **注解｜必要但不充分**
>
> 高质量 evidence retrieval 是必要条件，却不是充分条件。即使证据齐全，生成器仍可能误读表格、混淆利润与利润率、使用错误公式或给出无依据结论。因此应分层评测：候选文档是否召回、证据片段是否覆盖、版本选择是否正确、计算是否可复现、最终答案是否忠实于引用。

周日在机场，我打电话和大学同学讨论了下这些技术路线。发现这事情确实还是比较麻烦。直白点说，我虽然上传了一堆文档、Excel 等等，但他们之间并不完全是孤立的关系。

比如一份预算表对应的是哪一届大会，里面的支出又对应哪些供应商。一个讲师的分享大纲，后面还会关联到他的 PPT、现场视频和最终复盘.......

于是，我开始发朋友圈求助。

![文章图片](https://mmbiz.qpic.cn/mmbiz_png/iagroyM7YaBm7yM0icA22YRXOMQIJI5bbXrMoCStRWduewz4f7w7vx4yYxAhvo6lbzpsVa38hcWjJ8cXiaLokViaKNRDFUcf3iafHSL8m0Kfkrd4/640?wx_fmt=png&from=appmsg)

> [!NOTE]
> **注解｜真正缺失的是显式 schema**
>
> 这段可以写成一个最小数据模型：`Event → Budget/Settlement → LineItem → Supplier`，以及 `Speaker → Outline → Slides → Video → Retrospective`。图只是表达该 schema 的一种存储/索引形式；在规模较小且关系稳定时，关系数据库、文档 metadata 与 hybrid retrieval 也可能更简单、更可控。是否上知识图谱应由查询类型、关系密度、更新频率和治理成本决定。

很快，有朋友回复了我。

避免有同学说这是软广，我提前声明一下，这完完全全是一次真实的使用经验分享，我也没有做过什么横向测评。

只是这个产品确实解决了我当时遇到的问题，所以我想把自己怎么踩坑、最后又怎么解决的，完整分享给大家。

![文章图片](https://mmbiz.qpic.cn/mmbiz_png/iagroyM7YaBnJdn8feOUrC5PlLhpJ7vgYy7n2kyz7VJ8YAA656FTaR0oic80vicmaRiap1qBPnQao01C6U9SBuxmOgO1oC3JwehUOJGwvYTQGnA/640?wx_fmt=png&from=appmsg)

> [!NOTE]
> **注解｜正确的证据标签是“案例报告”**
>
> 未做横向测评意味着后文只能支持“该产品在作者这组数据和提问上给出满意结果”，不能支持“该架构普遍更准”或“优于其他产品”。要验证因果，需要固定语料与问题集，对比 naive vector RAG、metadata/hybrid RAG、GraphRAG 和 agentic retrieval，并报告准确率、引用、延迟、成本与权限违规。

我再梳理下我的需求：

1）做一个成熟可用的知识库。

2）知识库最好自带 Agent 能力，可以生成文档、PPT 等。

3）知识库可以被 Codex 之类的第三方 Agent 调用。

4）需要可以进行权限控制。

5）有成熟的文档治理的能力。

这些需求，腾讯乐享 100% 都可以搞定。截个图，大家看看。

![文章图片](https://mmbiz.qpic.cn/mmbiz_png/iagroyM7YaBnFrLFkKiaOcqxDzowMvmU6MZmm5cPNssKZPib0ZJ9gndNCNT4LK0RjbOXrgXnHj7onpwibtk3XUImtsqhibKYwctneJSl9leoMDmU/640?wx_fmt=png&from=appmsg)

> [!NOTE]
> **核验｜能力存在性与“100%”之间**
>
> 官方页面确实列出多格式知识处理、AI 问答、PPT/报告生成、冲突信息拦截和企业/部门/知识库/文档四层权限，因此功能方向与原文相符。但“100% 搞定”仍是主观判断；第三方 Agent 的鉴权粒度、写入审批、引用溯源、删除传播、审计日志与 SLA 需在真实部署中单独验收。[腾讯乐享官方产品页](https://lexiang.tencent.com/)；[官方版本页](https://lexiang.tencent.com/product-version)

新建团队之类的基础功能，我就不赘述了。很简单。

![文章图片](https://mmbiz.qpic.cn/mmbiz_png/iagroyM7YaBnBicr6YhhZYgvRFEvibTQASaoLwCvf67xb0GsSt7iaLiawFIRWry6HLDPrs6j5e1dggwgZYXmfLcPNcGk97FRiaGXQDkKE0vkMKNWc/640?wx_fmt=png&from=appmsg)

我麻溜的把电脑里所有的文件都传了上来。每个文件夹一个知识库，分门别类。

![文章图片](https://mmbiz.qpic.cn/sz_mmbiz_png/iagroyM7YaBkb4awWRsRYs7YRPXMGw6rIMVYX7Sxy1ibXTCRnicXkgCTlNX1cibVtczicdSU4iaDzY8a1SWRD56qyHKjy8pJicLgib5dj8Jib2SmkhxM/640?wx_fmt=png&from=appmsg)

每个知识库也都可以设置权限。

![文章图片](https://mmbiz.qpic.cn/mmbiz_png/iagroyM7YaBliaicdGH9Rd9ZqCnV8Q5ohvF2AUeEKGdHsj8g1U3pibELUjEep06cToOSlDoqibDibSE6aFl5lyKqUNKtfRbc6eqXHY5Cibbb8iamLdk/640?wx_fmt=png&from=appmsg)

> [!NOTE]
> **注解｜文件夹边界不一定等于治理边界**
>
> “每个文件夹一个知识库”便于启动，却可能把同一实体切散，并让跨库检索与权限继承变复杂。更稳妥的做法是先做 data inventory，再按数据域、所有者、敏感级别和生命周期建边界；公开大会内容与内部财务尤其不应只靠目录习惯区分。

继续，我还是问问刚才的问题，这次大会的利润率。大家看看我在腾讯乐享中得到的回复：

![文章图片](https://mmbiz.qpic.cn/sz_mmbiz_png/iagroyM7YaBm5zaTSaKgZ8El8LFwzSTibOluauZgZEahufqq8oDJUmdD2bJ89zw5l28NIb5GMgIx9xF4oePSXO7pFIkxBxhicdnMOvQAVRelXQ/640?wx_fmt=png&from=appmsg)

我上传的所有文档中，有三个文档提到了支出的情况。其中有两个文档是不同的版本，另外一个文档是具体的支出明细。

大家看，会发现他会逐一的去核对，然后最后推理出来最后那张那个表才是准确的数据。

![文章图片](https://mmbiz.qpic.cn/mmbiz_png/iagroyM7YaBmL7u6w3Se3O4P71QbGSA3tFmZnZEKJ5dTUKGGO9vzjOibVrBeCHmFgNbHpwp1x4ecdbOg19UDId0Y2GVNGNRn56bibNCjiav32jw/640?wx_fmt=png&from=appmsg)

下面这是最终的结论，太牛了这个。可以的可以的。

![文章图片](https://mmbiz.qpic.cn/mmbiz_png/iagroyM7YaBkzkNGBibIqtob6VFfkZnoyQMEeRqczsbptPicQazDlicO4m2e0raV6exYGicFvnFF5YoIpZ5vicRibbeFTRRtlnYhgambdrqIyC7DW4/640?wx_fmt=png&from=appmsg)

> [!NOTE]
> **注解｜一次成功答案仍需可复算**
>
> 这里最重要的产物不是流畅解释，而应是：采用了哪份收入与支出表、为何它们是最终版、具体单元格/行号、计算公式、币种与税费口径。若这些信息能被独立复算，才算从“看起来会推理”升级为可审计的财务问答。

接下来我必须讲一下，为什么它的回答会比我自己做的知识库准这么多。

一个很重要的原因，是它在检索之前，先做了一层知识加工。也就是知识图谱。

腾讯乐享会把知识库里的内容按关系连接起来。随便点开一个节点，就能看到它关联了哪些文档，和其他信息是什么关系。每个知识库，都可以形成自己对应的知识图谱。

比如这里点开 AI Engineer，右边可以直接看到相关文档，以及它和大会设置、演讲嘉宾这些信息之间的关系。这些内容都来自知识库本身。

![文章图片](https://mmbiz.qpic.cn/mmbiz_png/iagroyM7YaBn2jwqQjyxGejczQ0U7mib44tTiaCE2f9VOSKOSFUq2XyJjITShxJbmIrRv1gbYTP0aia7tbkHseXQkPBd7g73NRafD8K4E1msCJk/640?wx_fmt=png&from=appmsg)

> [!NOTE]
> **注解｜图索引能做什么，不能做什么**
>
> GraphRAG 通常在索引阶段抽取实体、关系与 claims，再用于关系扩展或分层汇总。微软官方实现也同时保留 text units、向量表示和图结构，说明“图”通常是混合检索的一层，而非向量检索的替代品。自动抽取还会产生实体合并错误、漏边和错误关系，必须保留 provenance 并允许回到原文。[Microsoft GraphRAG 概览](https://microsoft.github.io/graphrag/index/overview/)；[索引方法](https://microsoft.github.io/graphrag/index/methods/)

前面讲过，我自己搭的那套 RAG，核心还是语义检索。先把文档切块，用户提问以后，再从里面找出语义最相关的内容交给模型。

这个办法在资料比较简单的时候很好用。但企业里的知识，往往没这么规整。

比如一笔支出，年初预算里有一个数字，执行过程中调整过一次，最后决算又有一个数字。这三份文件都在讲同一件事，里面甚至会出现三个不同的答案。

如果只看语义相似度，它们都非常相关。系统很容易把几份资料一起找出来，却不知道它们之间到底是什么关系，更不知道哪一份更新，或者哪一份已经失效。

知识图谱可以很好的解决这些问题。

它会把散落在不同文档里的同一件事关联起来。

系统先知道这些资料讲的是同一个项目、同一笔预算或者同一个人，后面才有机会继续判断它们之间有没有版本变化，有没有信息冲突。

> [!NOTE]
> **注解｜图提供候选关系，版本真值仍需规则**
>
> 把三个数字连到同一支出实体，只完成了 entity resolution；系统还需要 `document_type`、`effective_time`、`supersedes`、审批状态和权威来源规则，才能判断“最新”或“有效”。若图由 LLM 从文件内容推断而没有外部主数据约束，它也可能把错误关系结构化并放大。微软 GraphRAG 自身将项目定位为研究方法，并明确提醒索引成本高、开箱提示未必适配具体数据。[Microsoft GraphRAG 仓库](https://github.com/microsoft/graphrag)

我还发现，腾讯乐享的知识图谱里专门做了一个冲突检测。这个功能很实用。

毕竟企业里的资料经常来自不同部门、不同阶段。同一件事情，可能在不同文档里出现不同版本。冲突检测会自动检测这些冲突。

这相当于在 Retrieval 之前，先把知识本身检查一遍。

![文章图片](https://mmbiz.qpic.cn/sz_mmbiz_png/iagroyM7YaBnaCxLq8MYD62A9jf7dfzMMVtpvbTOAkRWKlOZzZco1S4QFTibK2MHTEXc8rKm9ibPdwtDcjH1EmLaMcdNBH3KJWXq3mAulXiaH0Q/640?wx_fmt=png&from=appmsg)

> [!NOTE]
> **核验｜官方宣称存在冲突拦截，准确率未公开**
>
> 官方首页称可“主动拦截冲突与错误信息”，与作者观察一致；但公开页面没有给出冲突定义、benchmark、precision/recall 或误报处理流程。工程上还应区分真正矛盾、不同生效时间、不同业务口径和合法并存的情景假设；检测器最好生成待审任务，而非静默选一个答案。[腾讯乐享官方产品页](https://lexiang.tencent.com/)

这个设计还挺好的。

另外，腾讯乐享还有一个 LLM Wiki 的功能。

![文章图片](https://mmbiz.qpic.cn/mmbiz_png/iagroyM7YaBmKMIPg0ibNlF4ze3omCwJLuEQPDdy7L3eFnK13LuRUCdjemicmJEsjicibZbb1y3QmhB5uQaZBqNj34VzMcZzEKg1P2dIeDnHvK5E/640?wx_fmt=png&from=appmsg)

我一开始看到 Wiki 这个词，还以为它是在做一个新的知识页面。后来才发现不是。它其实是把前面上传的所有信息，整理成更适合 Agent 理解和调用的知识。

因为企业过去大量资料，本来就是写给人看的。

PDF、Word、PPT 什么格式都有，人看问题不大，但 Agent 真正调用起来，经常会遇到结构乱、版本冲突、上下文缺失这些问题。

LLM Wiki 直接把这些原始资料变成更适合 Agent 读取和调用的知识。

![文章图片](https://mmbiz.qpic.cn/mmbiz_png/iagroyM7YaBnrnPxicUXHV8JAjoqD7AlhyhJY6kGMicVia59dXwHKI6YmWddZVpyYOpBgR154MCUUAneyQH0lgJroibVZj8ju51JIOEbKa8kWa3U/640?wx_fmt=png&from=appmsg)

> [!NOTE]
> **注解｜“Agent-ready”最好视为编译产物**
>
> 将异构文件编译为规范化 Markdown/JSON、实体页、索引和引用，可减少查询时的重复解析；但派生 Wiki 不应覆盖原始资料。稳健设计是 `immutable raw sources → versioned derived knowledge → provenance links → human review`，并在源文件更新或删除时可增量重建。否则“更适合 Agent”的二手表述会成为新的陈旧或幻觉来源。

大家记得Karpathy 今年有条爆火的 LLM 知识库的帖子，其实就是类似的功能。

![文章图片](https://mmbiz.qpic.cn/mmbiz_png/iagroyM7YaBkkxK49d9PfWe35ZBUzoF1yMGB64VZuknt2fW8bDdnE0GEvse0GE3jNMDiaDjbvYfkpN4akFJacDcF1WicsVwibCx6PsaepaoAAUA/640?wx_fmt=png&from=appmsg)

> [!NOTE]
> **核验说明｜无法从正文链接确认原帖**
>
> 抓取正文只保留了截图，没有原帖 URL；公开检索能找到大量“Karpathy-style LLM Wiki”二次实现，但不足以可靠核对原帖的准确措辞与日期。因此这里只把它视为概念类比，不据此补写出处或元数据。

对了，WorkBuddy、豆包工作等等 Agent 也和乐享知识库打通了。大家可以去连接器里找。下面这是豆包工作的截图。

![文章图片](https://mmbiz.qpic.cn/sz_mmbiz_png/iagroyM7YaBnn9Uiasic6OPG0vIkuiajibTMpkEOJ3KiaO1FDDLzJNnqcDb1WaKeGdQt75icQB81ON3icia1Y27Wia9euxChYD2y2addzQYLZHe0ghPV0/640?wx_fmt=png&from=appmsg)

我用熟悉的 WorkBuddy 调用乐享的知识库，给大会做了个复盘的 Slides。就不给大家录屏了，隐私数据比较多。

![文章图片](https://mmbiz.qpic.cn/mmbiz_png/iagroyM7YaBlPYsiah22VH4wNJVLjaqk0oxMG57IribichPBuIJ3ev9jeUUk3XUYEXFJiaHYicj0pFDzfQxzZkWibiaPmP5dcb9OTrE2fibwOibrNA8As/640?wx_fmt=png&from=appmsg)

我们的参会者可以接入进来，随便提问大会涉及到的内容：

![文章图片](https://mmbiz.qpic.cn/sz_mmbiz_png/iagroyM7YaBmykRC6prNTxw823CTGgKcuNxapAnYOZMdToNckZnL59WtGibaor5bwbzw8nTCYa3DRVaia1XciaPNTjBArN9tnMMUtDZmbn4mPUU/640?wx_fmt=png&from=appmsg)

我们还能随手在 WorkBuddy 中更新知识库的内容。

![文章图片](https://mmbiz.qpic.cn/sz_mmbiz_png/iagroyM7YaBlDnK1jAM4ibwibc9WKRQZSGFFkqsmCsZLasMicR8WzALGryBEbVAwOUBQFsGgmibEHKUghPwQBT0TN3ibwWljrAylyOxRWqxR7ka64/640?wx_fmt=png&from=appmsg)

稍等一会就更新好了，WorkBuddy 还顺便整了一个分析出来。

![文章图片](https://mmbiz.qpic.cn/mmbiz_png/iagroyM7YaBkJPCps3ia5NbVBaSNn68ITjHnBogIz5wVicZWlAAcKahM1CiaiaRJqIvJgvicSOmu8MmMMvgKjzibFXFqfgvdibjZ3xTd7OTouN5yGSE/640?wx_fmt=png&from=appmsg)

文件已经可以在后台看到了。

![文章图片](https://mmbiz.qpic.cn/sz_mmbiz_png/iagroyM7YaBkQYeJve2PAy5YicayIHvrFFicUa51nrg7ZUa7bxWbDwZ4mRgOibkngNib1sGLWBS8rhj337hAK18LvOX6AI7jE9wViaL2PxTOLGMeM/640?wx_fmt=png&from=appmsg)

> [!NOTE]
> **注解｜读权限与写权限要采用不同威胁模型**
>
> Agent 生成 Slides 属于派生读取；“随手更新知识库”则会改变后续所有 Agent 的事实基础。写入接口应具备最小权限、来源身份、变更 diff、审批、版本回滚、恶意指令隔离与重新索引状态。外部参会者查询还需验证回答不会通过跨文档推理推断内部预算等敏感信息。

到这里，从写文章到把整个知识库搭起来，前后花了 4 个多小时，这事总算搞定了。

哎，我突然意识到，自己还是把企业知识库理解窄了。

最开始我的想法很简单，就是给同事和用户提供一个更好的信息查询入口。

但真正花时间搭建起来以后，我发现，知识库的用途远远不只是搜索资料。当它可以被 Agent 调用，它就能够成为 Agent 工作时依赖的 Context。

是的，为 Agent 准备可信的 Context，这应该会成为接下来企业落地 AI 最重要的事情之一。

> [!NOTE]
> **总结｜可信 Context 是一条可验证供应链**
>
> 文章最后的判断比“知识图谱更准”更值得保留：企业 AI 的瓶颈往往是 context engineering 与 knowledge operations。所谓“可信”至少包括来源可追溯、权限一致、版本/时效明确、结构化数值可计算、冲突可见、答案可引用、变更可审计和失败时可拒答。GraphRAG、LLM Wiki 与 Agent 都只是这条供应链上的组件。
>
> 若把本文案例转成验收集，最小问题族应覆盖：当前届与历史届消歧、预算/调整/决算优先级、跨表计算、无答案拒答、权限隔离、冲突报告、源文件更新后的传播，以及每个答案的引用与复算。
