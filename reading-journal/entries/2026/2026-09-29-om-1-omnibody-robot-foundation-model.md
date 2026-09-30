---
title: "OM-1 与 Omnibody：从人类示范到跨本体机器人策略（原文注解版）"
source_title: "李飞飞学生推机器人模型，Jim Fan：太流畅了"
source_url: "https://mp.weixin.qq.com/s/WGcYBknuaFxObeg13v6ljA"
source_language: "zh"
entry_language: "zh"
published: "2026-09-15"
read_date: "2026-09-29"
authors:
  - "钟宸"
topics:
  - "Embodied AI"
  - "Robot Learning"
  - "Robot Data Collection"
tags:
  - "om-1"
  - "omnibody"
  - "cross-embodiment"
  - "imitation-learning"
  - "human-demonstrations"
---

# 李飞飞学生推机器人模型，Jim Fan：太流畅了

> [!NOTE]
> **阅读说明｜证据主要来自厂商自述**
>
> 原文来自微信公众号「机器人前瞻」，作者钟宸，发布于 2026-09-15。下文保留抓取到的完整实质正文与图片位置，只剔除微信页面控件和推广尾图。OM-1 截至阅读日的公开依据主要是 Reward AI 的技术博客和演示视频；未见论文、模型权重、训练集规模、评测协议或第三方复现。因此，“任何机器人”“零样本泛化”和“少于 30 分钟学会新任务”应读作公司声明，而非已独立验证的结论。[原文](https://mp.weixin.qq.com/s/WGcYBknuaFxObeg13v6ljA)；[Reward AI 技术博客](https://www.rewardai.com/blog/OM-1/)

![image](https://mmbiz.qpic.cn/sz_mmbiz_png/VTDicfIxpXWsRbB5lq7QQW1gmKnEbGlAIOlHJpYibicFryYu31wtsBZJBTpk5sOeQTYhiaQUTbC4H35Orugvc9LG8dcokJ2KVRUoUzd3ibRyPyY0/640?from=appmsg)

实现跨本体泛化。

作者 | 钟宸

编辑 | 漠影

机器人前瞻9月15日报道，今天，由两位斯坦福学生Zipeng Fu和Chen Wang创办的Reward AI，推出其首款机器人基础模型OM-1，该公司称，这一模型可实现任何机器人的零样本泛化，包括桌面机械臂、工业机械臂和人形机器人等。

从演示效果看，OM-1能独立完成调酒、叠衣物、拔网线等精细操作，还可实现多机器人协作，双机械臂可协作包装手机。

同时，当途中出错时，OM-1会自我纠正，受到干扰也能停下或重试，搭载该模型的人形机器人还能完成开冰箱取饮料的全身操作。

Reward AI称，不到30分钟的数据输入，它就能学会一项全新任务，包含复杂的动态和长程任务。

> [!NOTE]
> **注解｜三个容易混淆的泛化轴**
>
> 这里同时涉及任务泛化、环境泛化与 embodiment 泛化。多个任务和机体的演示并不自动证明对“未见过机体”零样本部署；后者至少需要明确训练/测试本体划分、统一观测与动作接口、适配器是否训练，以及每类机体上的成功率和失败分布。官方博客也没有公开这些评测细节。

核心思路上，OM-1不用遥操作和机器人数据，而是通过自研的Omnibody Hand直接采集人的操作数据，以“手”为通用接口，经统一的数据管线训练出跨本体通用的模型。

控制层则在仿真中强化学习训练，按自身节拍运行。

![image](https://mmbiz.qpic.cn/mmbiz_png/VTDicfIxpXWt7Kcbic1bPXqVm2Vj0iaGMAjeRm41cpq6uzf6dnUCpLjNYmqA0GX6NH3wU27XfFiaib5OILesU5yePTTj92DonVjywPF2ehoZSHIQ/640?from=appmsg)

Reward AI的联合创始人兼CEO Zipeng Fu博士毕业于斯坦福大学AI Lab，曾在Google DeepMind公司担任研究员。也是Mobile ALOHA的共同第一作者。

![image](https://mmbiz.qpic.cn/sz_mmbiz_png/VTDicfIxpXWu46UYeVibBT4Jlc0kmGlicCyjlAL3Axjib3x1FEn2AY04QhcayTOH6wIvxc2Ye7w1ich6S0lFjg5DHLVdg4faxF4KFrhkPMnJKAt0/640?from=appmsg)

联合创始人兼CTO Chen Wang博士毕业于斯坦福计算机科学专业，曾师从李飞飞和Karen Liu。

![image](https://mmbiz.qpic.cn/sz_mmbiz_png/VTDicfIxpXWuX0JEQiaqojCCliaBxAlwv5tjkT2FSspgooGwPEbjt0Pl3iayXmj8uERUsIiaqsQsoRPmHdLLNwo0rq63dN4EoDkfLUjmyJl0nB7A/640?from=appmsg)

目前，在X（原推特）上，这一帖子已获得超过2000点赞。

![image](https://mmbiz.qpic.cn/sz_mmbiz_png/VTDicfIxpXWtXaya5TYP7wicpdgGuDTeTYEDkF1JLB4wGF2fJAK75317Z7sEVnR1472ulcUA1AvyXmLCic4k115Uiaqo1qsRSkqjWorhttEmF9Y/640?from=appmsg)

大多数网友对这一成果表达了赞叹，包括英伟达高级AI研究科学家Jim Fan，他评论道：“恭喜两位创始人！！（演示）太流畅了！”

> [!NOTE]
> **注解｜团队履历不是模型证据**
>
> Zipeng Fu 确为 [Mobile ALOHA](https://mobile-aloha.github.io/) 共同第一作者；该工作使用低成本全身遥操作和行为克隆，和 OM-1 宣称的“无遥操作、无机器人数据”形成鲜明对照。社交媒体点赞或专家对视频流畅度的评价不能替代可重复评测。

01.

可调酒、打包手机、拔网线，实现快速操作

在Reward AI展示的视频中，最值得关注的就是OM-1展现的长程能力。在视频中，两双机械臂配合对手机进行包装，有意思的是，其中一对机械臂在盖上手机包装盒盖子时，选择首先倾斜一角盖上，在一定程度上体现了拟人性。

该模型还可以独立完成调酒工作，完成从倒入酒液、冰块到摇晃调酒杯、拔开瓶塞、将鸡尾酒倒入杯中等动作，从视频来看，动作均为一次性完成，并未出现失败情况，机械臂运行过程甚至看起来有一些“果断”。

这一模型还可以完成叠衣物的任务，视频中，机械臂先将衣物平摊，随后通过拿起中间部分实现对折、甩动实现卷曲衣物的目标，整个过程仅花费17秒钟。

Reward AI还测试了拔掉以太网线的任务。与USB不同，以太网连接器牢牢锁定，只有在非常精确地按下锁扣时才会松开。OM-1解决了这一精细操作任务。在视频后半段，机械臂还能够意识到自己按错部位，对按压位置进行调整。

OM-1还表现出多种涌现行为，会弥补此前犯下的错误。Reward AI称，这一模型知道何时重试，何时适应对抗扰动，何时在环境剧烈变化时停止。

从视频来看，当上一机械臂没能完成任务时，下一机械臂会帮助其完成任务，面临人类对任务状态进行干扰时，机械臂也能对此进行调整：当人类将酒杯拿走时，模型会选择停止执行倒酒液的任务；当酒杯瓶塞无法拧开时，模型也会重新进行任务，而非报错。

此外，OM-1还可以为人形机器人提供全身操控和导航的能力。在视频中，人形机器人完成了打开冰箱、拿取饮料的操作，且Reward AI表示，所有演示视频均为实时画面，未做加速处理。

> [!NOTE]
> **注解｜演示能说明什么，不能说明什么**
>
> 视频对闭环反应、接触操作与动作速度提供了存在性证据，但未给出试验次数、成功率、初始化分布、人工介入、挑选规则和失败片段。“自我纠正”应通过扰动矩阵验证：扰动类型与强度、恢复成功率、停止的精确率/召回率，以及恢复是否依赖训练中相似轨迹。

02.

实现跨本体泛化，采用电磁感测技术

Reward AI还在技术博客中表达了自己的理念，即基于一个核心原则，构建Omnibody系统：一个模型，一个数据接口，适用于任何形态。

Omnibody将整个处理流程集成到一个系统中。它能够以人们实际工作的速度收集操控行为的数据，并从这些行为中学到通用的机器人策略。

这种策略还能在不同的机器人形态中应用，Reward AI以手作为连接这些不同形态本体的通用接口，从而实现跨形态的操作学习。

![image](https://mmbiz.qpic.cn/sz_mmbiz_gif/VTDicfIxpXWtdvDKbWlfL9T6Mt0S9wQMz29ib5XY8YxZlwrjftxKXjVSNAeWz9S2qTicRBWStBOg1NsEeBTnfOC89Bc59DL8icj7VWMbR92nOIU/640?from=appmsg)

在Reward AI展示的视频中，不同形态的机器人均可完成分拣物料的工作，视频也未经加速。但值得注意的是，不同形态的本体使用的皆为具有相似形态的夹爪。

> [!NOTE]
> **注解｜“手”是共享任务坐标，不是免费的 embodiment 对齐**
>
> 手部中间表示能把采集与某台机器人的关节空间解耦；但映射到不同夹爪、机械臂和人形全身控制，仍需处理可达域、自由度、接触几何、力限、时延和动力学。各本体末端夹爪相似，说明当前演示更接近“共享末端接口下的跨机体迁移”。

![image](https://mmbiz.qpic.cn/mmbiz_gif/VTDicfIxpXWurWqvIcTU0vYwe9N0b9BhNvaHGMM8iay3B3mIfXKqLgs2jico7nkIDQhjFIYmMc0j7vdIedJgS84uzzm71eO2jkNFJ3sic4CWNtw/640?from=appmsg)

为实现对人类操作动作数据的收集，Reward AI基于之前在DexCap项目上的研究成果（一种可扩展、便携的动作捕捉技术），开发了Omnibody Hand可穿戴设备。OM-1正是基于人们在佩戴Omnibody HAnd时收集到的非机器人环境中的人类数据进行学习。

![image](https://mmbiz.qpic.cn/sz_mmbiz_gif/VTDicfIxpXWumHDGFKmJ3UXhtZjNXpqLZLgAfibcpOjRHAictQcnbuLAMoLQdleD39tude3bSsicKEe6jYBPgQHPnbIJ3H3Jqgurf1BZfQfDY3s/640?from=appmsg)

在RewardAI展示的视频中，Omnibody Hand采用紧凑的七自由度设计，能够完成拧螺母、拿取以及放下水管的操作。

该公司表示，Omnibody Hand能让人们在数据采集中自然地展示操控能力，而无需根据机器人的运动学要求调整自己的行为。

这一设备还配备了集成的远端屈曲机制（integrated distal flexion mechanism），可以吸收手指长度差异带来的影响，从而降低数据采集对精确的关节对齐的敏感性，无需针对不同大小的人手进行单独的调整。

为收集迅速的动作数据，Reward AI在该设备上集成了高频触觉反馈、用于判断接触前距离的接近感应功能，以及能够随着动作快速提供视觉上下文的全景相机。

Reward AI还结合使用了电磁感测（electromagnetic sensing）技术来补充视觉惯性追踪在技术上的不足，这种技术能够提供高精度的位置信息，并且不受视觉信息更新时间的限制。

![image](https://mmbiz.qpic.cn/mmbiz_png/VTDicfIxpXWtL8PZsHic7gllRtEmKhYoibW5dTov3aIfZhCyKgtlAYWzYianBjUZczfz8yG4GLEhqRfuRw42Tia43xATWBDV1Q79cic05AMnMTy1U/640?from=appmsg)

该公司表示，其跟踪算法还能补偿环境中的电磁干扰。经过对每种速度下的十次测试进行平均分析，Reward AI发现，在高速运动时，这一方法能够将平均超调误差降低了60%。

> [!NOTE]
> **核验｜DexCap 是已发表前置工作，OM-1 不是其简单延伸**
>
> [DexCap 论文（RSS 2024）](https://www.roboticsproceedings.org/rss20/p043.pdf)公开了结合 SLAM、电磁跟踪和环境 3D 观测的便携式、抗遮挡捕捉系统，并用 DexIL 将人类 mocap 数据映射到灵巧手策略；其六项任务评测和[开源代码](https://github.com/j96w/DexCap)支持团队的技术积累。但 OM-1 新硬件、多模态接口、跨本体模型与“60%”数字仍只有公司材料，不能直接继承 DexCap 的同行评审证据。

03.

输入多模态数据，控制层依靠自我节拍运行

OM-1支持多种需要接触的任务，而且随着人类数据的规模与多样性增加，其性能也会不断提升。

![image](https://mmbiz.qpic.cn/mmbiz_png/VTDicfIxpXWtzVLXf3QL3MMdKkocicicN9IO5o6UWdD7RFtgseeP99wKufdQiaC69yjkDetaMqqoWA7ZvBoh8fxRg7otlDcckTfXSKFykDfianw0/640?from=appmsg)

Reward AI称，该模型能够直接从人类的动作中学习生成机器人的行为，它可以将人们在进行需要频繁接触的工作时，所拥有的直觉和潜意识中的物理智能（intuition and subconscious physical intelligence）直接传递给机器人（无中转环节）。

训练数据则以同一形式经One Data Interface传入，预训练和后训练之间没有明确分割。

因此，对于新机器人来说，无需重新收集任何数据，也无需将某些数据视为错误的数据进行训练，扩展OM-1的规模只需添加人类收集的数据即可，而无需为每个机器人、任务或部署场景设计单独的训练阶段。

也就是说，最新收集的数据仍然可以用于训练那些尚未设计完成的机器人本体。

Reward AI还指出，Omnibody Hand和One Data Interface能够收集到人们以自身节奏进行工作的数据，OM-1则通过模仿这些操作，来学习如何在不同的机器人本体之间执行任务。

> [!NOTE]
> **注解｜统一数据接口不等于统一可执行动作**
>
> “One Data Interface”统一的是训练样本语法；跨本体执行仍要把输出落到各机器的约束集合中。新机体即使不需任务示范，仍可能需要 URDF/几何、标定、低层控制器或仿真资产。因此“无机器人数据”更精确的理解是：高层策略不用真实机器人示范；低层控制仍由特定机体的仿真强化学习承担。

OM-1的输入包括由Omnibody Hand采集的多模态数据：图像、触觉信号、手指间的间距以及手的姿态轨迹，每种模态数据都提供了关于交互的详细信息。

OM-1输出的动作包含运动方向、速度、力量以及诸如抓取和移动等关键事件的时机。

OM-1的控制层则将那些用于移动机器人操控与导航的指令，转化为实际的动作执行，同时也能适应特定机械设备的特性。

![image](https://mmbiz.qpic.cn/sz_mmbiz_gif/VTDicfIxpXWs5Sf4qQHfXkm7m7JUcPwANu9YNAZt1B1Bn5ic1my3YBic05EaKYKj2K4Zx12JSvRIBdDEia6Sq1pSvTPaicUTwvRXCnwJqoFYg7KI/640?from=appmsg)

该控制层通过仿真中的强化学习（reinforcement learning in simulation）进行训练，以处理与速度和加速度相关的动态变化、外部干扰以及系统延迟等问题。

Reward AI认为，按照现实的操作速度，在执行过程中，模型无法暂停，因为需要不断计算新的动作。

因此，OM-1的控制层依靠自己的节拍（clock）运行，即使在模型生成新动作时，控制层也能持续高速运行。这样就能确保推理延迟的波动不会干扰机器人的运动。

不过，Reward AI承认，依靠自己的时钟运行也带来了一些挑战：当新的预测结果出现时，连续的动作可能无法平滑地衔接在一起。

虽然在低速操作下不连续性几乎察觉不到，但这在高速下会影响执行。因此，控制层会在线优化连续预测之间的转换，通过抛掷和摆动等动态行为保持动作平滑连续。

> [!NOTE]
> **注解｜异步 policy 与实时控制的系统分层**
>
> 这是双速率系统：较慢且延迟抖动的 learned policy 生成参考动作，高频控制层持续插值、跟踪并处理扰动。优势是把推理延迟从伺服回路解耦；风险是新旧预测切换、陈旧指令与安全约束。除任务成功率，还应报告 policy 延迟分布、控制频率、jerk、跟踪误差、约束违反和紧急停止表现。

该公司还认为，要达成快速操作，需要策略来保持这些信号的时间顺序。所以，OM-1以传感器本身的采样率来处理每种模态，而不是将每个数据流降频处理，高频的触觉和运动信号与低频的视觉信息一起被保留下来。

此外，OM-1会记录这些数据流的时间历史，从而能够理解接触、运动以及任务进展如何随时间演变。

> [!NOTE]
> **注解｜原生采样率之后仍需跨模态对齐**
>
> 不统一降频可避免丢掉短时接触事件，但模型仍需处理传感器时钟偏差、不同延迟、缺帧和带宽差异。关键证据应包括异步融合机制及消融：触觉/接近感应的任务增益、历史窗口长度，以及时钟漂移或丢包时的退化曲线。官方材料尚未公开这些实验。

04.

结语：展现无本体数据采集潜力，后续仍待实际落地验证

从调酒、打包手机到拔掉以太网线，OM-1展示的能力并不在于某个单一动作有多炫，而在于同一条策略能落到不同形态的本体上，并且是在没有遥操作、没有机器人数据的情况下，直接从人的操作里学出来的。

按Reward AI的说法，新机器人不再需要单独采集数据、单独设计训练阶段，最新的人类数据甚至能喂给还没造出来的本体。

当然，视频里的顺畅是一回事，可复现的评测和真实产线的稳定性，是另一回事。“零样本泛化”“任何机器人”这类表述，最终要靠开放测试和第三方验证来兑现。但至少，OM-1指了一条清晰的路：不去迁就机器人的运动学，而是让机器人学习人干活时的操作。

这无疑是对ego、UMI无本体数据采集路线潜力的又一次证明。如果这条路走通，可想而知数据采集的成本将实现几何倍数的下降，只不过眼下，它仍然只是一个值得认真对待的开始。

Reward AI技术博客：https://www.rewardai.com/blog/OM-1/

> [!NOTE]
> **总结｜最值得关注的是接口假设，而不是 demo 流畅度**
>
> OM-1 的研究赌注是把“人手—物体交互”设为跨本体共享层：高层策略从自然人类示范中学习，特定机体的低层控制在仿真中解决动力学落地。这可能降低逐机器人遥操作成本，也把难题转移到动作重定向、接口充分性、仿真控制器和统一评测。下一步最有信息量的材料是训练数据规模、动作表示、留出本体零样本协议、多次试验成功率、失败视频，以及与同量 robot data、UMI/ego 路线的受控比较。
