---
title: "FluxVLA Engine：从数据到真机部署的工程闭环与证据边界（原文注解版）"
source_title: "从数据、仿真到真机部署：一文看懂 FluxVLA 具身智能开源工程底座"
source_url: "https://mp.weixin.qq.com/s/tAFTeleT790ZmVYZ7AT0rA"
source_language: "zh"
entry_language: "zh"
published: "2026-09-30"
read_date: "2026-10-02"
authors:
  - "CV开发者都爱看的"
topics:
  - "Embodied AI"
  - "Robot Learning"
  - "Robotics Infrastructure"
  - "Model Evaluation"
tags:
  - "fluxvla"
  - "vision-language-action"
  - "real-time-chunking"
  - "robot-deployment"
  - "libero"
  - "robocasa"
---

# 从数据、仿真到真机部署：一文看懂 FluxVLA 具身智能开源工程底座

> [!NOTE]
> **导读｜阅读路线**
>
> 背景知识：本文的重点不是提出新的 VLA，而是把数据 schema、transform、模型构造、checkpoint、闭环评测、异步 action chunk 执行和本体接口收敛为共享 contract。最容易混淆的是“接口统一”与“组件可任意互换”：注册表只统一构造边界，张量形状、坐标系、动作语义、时序和安全约束仍须逐项对齐。
>
> 一句话主旨：FluxVLA Engine 试图把具身策略从 checkpoint 变成可复现、可审计、可部署的系统 artifact，并以统一管线支撑仿真与多本体真机闭环。
>
> 阅读时抓住四条线：数据/模型接口是否真正复用；评测是否从 artifact 完整重建；加速、RTC 与轨迹后处理如何共同处理实时性；真机数字能否区分平台能力与策略能力。建议先读 2.1–2.2 理解 contract，再读 2.4–2.7 看运行时，最后回到第 3 节审视证据。论文与公开仓库能支持平台架构、集成范围和报告中的主要点估计；但加速基准缺少完整计时协议，部分真机实验未披露 trial 数或置信区间，且多数结果来自项目团队自身，尚不能证明跨团队、跨版本的普遍可复现性。
>
> 带着这个问题阅读全文：当策略性能变化时，FluxVLA 是否记录了足够的配置、数据版本、随机性、运行时和本体条件，使我们能把改进归因到算法而非工程差异？

> [!NOTE]
> **阅读说明｜来源与核验范围**
>
> 原文来自微信公众号「极市平台」，署名“CV开发者都爱看的”，内容来源为 FluxEngine，发布于 2026-09-30。下文保留抓取到的完整实质正文、标题层级、列表与图片位置，仅剔除关注提示、交流群、资源推广及页尾推荐。主要核验依据为 [FluxVLA 技术报告](https://arxiv.org/abs/2609.17210)、[官方代码仓库](https://github.com/FluxVLA/FluxVLA)与[项目主页](https://www.limxdynamics.com/zh/products/fluxvla)；它们都属于项目方一手材料，适合核对“报告了什么”，不能替代独立复现。[原文](https://mp.weixin.qq.com/s/tAFTeleT790ZmVYZ7AT0rA)

来源丨FluxEngine

编辑丨极市平台

极市导读

具身智能落地的最大痛点往往不是算法本身，而是如何跨越从“跑通模型 Checkpoint”到“真机平滑执行”的巨大工程鸿沟。本文分享逐际动力开源的 FluxVLA Engine： 提供一站式具身智能工程底座。

在具身智能领域，VLA、WAM与离线强化学习正在快速扩展机器人策略的设计空间，但一个算法checkpoint并不等于一个能跑的机器人系统。数据格式、训练栈、评测协议、推理运行时与本体接口的碎片化，让"从策略到真机"的路径远比跑模型本身更难，甚至让人分不清一次性能提升究竟来自算法创新还是外围系统的差异。

本文介绍逐际动力（LimX Dynamics）FluxVLA团队发布的技术报告FluxVLA Engine。FluxVLA Engine不是又一个VLA模型，而是一个面向具身智能科研创新、应用开发与落地的标准化VLA工程底座，以统一配置、标准接口、模块解耦、加速部署为核心设计理念，将数据处理、模型训练、仿真评测到真机部署的每个环节标准化，把异构的具身策略组件整合为一条可复现的"数据到部署"工作流。平台以注册表机制打通数据集、视觉-语言骨干、动作头、奖励加权学习、分布式训练、仿真评测、优化推理与机器人操作符之间的标准化接口，并结合Real-Time Chunking（RTC）、推理加速后端与轨迹后处理支撑响应式真机执行。

实验表明，14个策略集成在同一管线完成LIBERO闭环评测——其中包括以inference-only方式接入的GPT-6 API策略，13个checkpoint策略中11个平均成功率超过95%；推理加速在数据中心、桌面与边缘GPU上带来2.3–9.6倍的推理速度提升；真机侧，GR00T N1.5与π0.5经同一部署路径完成ALOHA五任务与Oli三任务闭环benchmark，配套ARM研究进一步将真机毛巾折叠成功率从62.1%提升至99.4%，验证了"数据-奖励-训练-部署"的完整闭环。

> [!NOTE]
> **注解｜平台证据与策略证据要分开**
>
> 这些数字可在技术报告和官方仓库的结果表中核对，但回答的是不同问题：14 种策略进入同一管线支持“接口容纳能力”；11/13 超过 95% 仍受训练数据与 checkpoint 影响；2.3–9.6× 是特定模型—硬件—执行图组合的路径加速；真机成功率同时混合策略、数据、本体、后处理和协议。四类证据不能合并成无条件的“平台已验证”。

-

论文题目：FluxVLA Engine: A One-Stop VLA Engineering Platform for Embodied Intelligence

-

论文链接：https://arxiv.org/abs/2609.17210

-

代码仓库：https://github.com/FluxVLA/FluxVLA

-

项目主页：https://www.limxdynamics.com/zh/products/fluxvla

## 01 引言

当前具身策略学习横跨多个互补范式：VLA模型将视觉观测、语言与机器人状态直接映射为动作；WAM进一步利用预测的视觉动力学与时序世界表征；离线强化学习则从历史经验中改进策略。然而，把研究成果转化为可重复的物理行为，需要在模型架构之外做大量工程决策，而这些决策往往埋藏在项目专属的代码里。在具身智能落地的研发链路中，三类结构性工程瓶颈普遍存在：

-

数据格式碎片化：训练、仿真与部署阶段通常依赖不同的数据格式与处理逻辑，不同方法之间缺乏统一数据规范，数据格式需要反复转换与适配，工程成本远高于算法本身。更进一步，不同实现对相机顺序、坐标系、动作表征、归一化统计的假设各不相同，通过不同预处理管线或评测协议得到的结果难以比较。

-

代码架构高耦合：数据处理、模型定义与训练评测逻辑往往深度绑定。无论是替换视觉编码器，还是接入新任务或新数据集，均需对现有框架代码进行深入修改，既耗费时间，也容易引入新的错误，造成"换个模型就要重新造轮子"的困境。

-

仿真到真机的迁移鸿沟：仿真环境中的理想条件无法覆盖真实系统中的延迟、噪声与硬件约束，导致模型在真实机器人上的性能显著下降。对action-chunking策略而言，模型推理可能慢于机器人控制回路，异步执行一个chunk的同时预测下一个chunk，还会在chunk边界产生动作不连续。

弥合这些瓶颈需要一个闭环工程回路：采集并标准化数据、训练可互换的策略、在仿真中验证、经优化的本地或远程推理执行、捕获失败与人类纠正、并将经验回流训练。FluxVLA Engine正是围绕这个回路设计的——以统一配置与标准化接口，将数据、训练、仿真到真机部署的每个环节规范化，为开发者提供可自由替换和组合的模块，无需每次从头适配。

## 02 本文方法

FluxVLA Engine的整体架构如下图所示。平台以统一配置、标准接口、模块解耦、加速部署为核心设计理念，对应报告中的四条工程原则：

-

统一配置（Unified） 为VLA、WAM或离线策略实验的完整生命周期提供统一的配置接口——数据处理、奖励/样本加权、模型构建、优化、评测与推理都放进同一份实验描述；训练与部署复用同一套预处理管线、模型定义与checkpoint约定，用户无需维护多套脚本即可切换各类模型，也减少了阶段之间的重复实现与不一致；

-

模块解耦（Modular） 以基于注册表的抽象把视觉-语言骨干、时序与世界模型组件、projector、动作头、runner与机器人操作符彼此解耦，研究者可以单独组合或替换任一组件，而不必复制整套模型专属的技术栈，显著降低集成与对比新策略方法的工程成本；

-

加速部署（Deployable） 提供连接仿真与物理机器人的统一运行时：本地推理与基于ZMQ的远程服务共享同一套语义；基于Triton融合算子、CUDA Graph与定制CUDA算子的模型专属加速，覆盖数据中心、桌面与边缘硬件；Real-Time Chunking协调异步预测与动作执行、减少相继chunk之间的不连续；独立的轨迹后处理阶段把预测chunk适配到执行侧的运动要求并衔接前后命令。配合共享的runner与operator抽象，把离线策略开发与异构本体上的响应式部署连接起来；

-

可复现（Reproducibility） 通过安全的权重序列化、可恢复训练、显式的随机种子与确定性评测控制、结构化的结果聚合，把实验artifact与评测流程标准化，让实验更容易跨模型、跨benchmark、跨部署环境复现、比较、审计与扩展。

![image](https://mmbiz.qpic.cn/sz_mmbiz_png/SWiaIiacqbficia0tVHgzEd5ZoZjaZa435TPRLttw7HjBniaOkoicNgHxVLdIwKiaFTWyn5IOzK3o3cKejbcYlFCCfWzL6y0OS5fd445tlDIF28P1M/640?wx_fmt=png&from=appmsg)

### 2.1 配置即实验规格：All-in-one配置、注册表与自包含artifact

FluxVLA Engine采用All-in-one配置机制，通过单一配置文件统一管理数据、模型、训练、评测、推理与部署参数，并以类型键控的注册表作为配置与实现之间的构造边界：从tokenizer、transform、数据集，到骨干网络、动作头、runner、机器人操作符，各类组件都在配置中以type字段声明、由注册表解析构造。

这一机制把模型选择从训练与推理入口中剥离：launcher只请求构造数据集或runner，而不为每个策略家族保留分支。新增一个实现只需注册组件并提供满足约定的配置，而不是复制整套工作流。需要注意的是，注册建立的是构造接口而非任意互换性——组件之间仍需在张量形状、时序与动作语义上达成一致。

机器人学习系统的一个常见部署失败是：训练checkpoint只包含任务相关的参数更新，却隐式依赖原始预训练权重与预处理资产。FluxVLA将完整的训练后模型状态、解析后的配置与推理所需元数据打包为自包含的artifact，评测与部署可以直接从运行artifact重建策略，无需找回原始预训练权重，从而减少配置与版本错配。

> [!NOTE]
> **注解｜自包含 artifact 仍需供应链信息**
>
> 权重、解析后配置与推理元数据解决运行重建；强复现还需要代码 commit、依赖/驱动版本、数据版本与校验和、外部资产许可、硬件及确定性开关。官方仓库公开了配置、依赖分层、测试与 checkpoint 链接，但文章没有证明每个实验都冻结了上述全部要素。

### 2.2 数据管线与模型层约定

数据管线承担两个容易混淆的职责：接入不同来源的轨迹，以及向每个模型呈现其假定的观测、语言、状态与动作语义。FluxVLA把两者拆分为面向存储的数据集层与配置定义的transform层：原始轨迹统一转换为兼容LeRobot格式的Parquet表示，训练样本从episode一致的时序窗口构造，transform列表完全通过配置组合与重排；归一化统计随模型artifact保存，保证训练侧预处理与推理侧动作恢复的一致性。

![image](https://mmbiz.qpic.cn/sz_mmbiz_png/SWiaIiacqbfich2dkyGTdIL2kiaLBPNwpnkUaNtnPib3dFaMwhQ1pXpxytRzu4Y1Slfu4iaJgkC8EIjPQM8icE1xHibpibz8kAiappSpVHPibHmOXS8UDI/640?wx_fmt=png&from=appmsg)

模型层的设计目标是保留差异巨大的VLA算法的原生结构，同时向系统其余部分暴露一个小接口。平台已集成Qwen、GR00T、π系列以及DreamZero等主流VLM/VLA/WAM模型架构：可自由组合的模型走BaseVLA定义的插槽（视觉骨干、语言骨干、集成VLM、projector、动作头）；像π0这样包含耦合action expert的架构、包含video VAE与多个DiT流的WAM，则由模型专属的原生wrapper持有。以flow-matching策略为例，在π0采用的约定下，对干净动作块 、噪声 与采样时间 ，插值输入与目标速度为：

模型学习预测速度场，训练在有效时间步与动作维度上施加掩码的均方误差；推理时从噪声出发数值积分学习到的速度场，即可得到干净的动作块。

> [!NOTE]
> **注解｜抓取文本中的公式缺失**
>
> 微信页面的公式以抓取器未保留的渲染节点呈现，因此上段变量与公式为空；此处保留可访问文本原貌，不反向猜写。技术报告原文才是公式的规范来源。

![image](https://mmbiz.qpic.cn/sz_mmbiz_png/SWiaIiacqbfichTfb75IzFRYheFoL6sSGfzkhw7sGI4BtFibibF7sgBvNU3MrtFmNkHxCIOHPKAeWGT7XicicxUeXjrGhNYiaNXJ3SLs4fStaib2Uuyo/640?wx_fmt=png&from=appmsg)

### 2.3 闭环仿真评测：从checkpoint重建实验

仿真评测不是孤立地调用模型，而是闭环重建一个训练好的实验：每次rollout都从选定的checkpoint与运行artifact恢复策略和预处理状态，将benchmark重置到受控状态，协调推理与动作执行并记录episode结果。执行调度上，评测器从每个H步预测中执行可配置的前K步——较小的前缀提升反应性，较长的前缀摊薄推理开销。该调度保持在模型之外，同一个训练好的策略可以在不同闭环调度下评测，并经由真机执行路径直接部署。

目前支持LIBERO与RoboCasa GR-1两个评测器，差异在仿真器语义而非策略调用方式：LIBERO加载套件任务及其官方初始状态；RoboCasa GR-1 Tabletop使用覆盖双臂、双手与腰部的29维动作接口，并兼容GR00T N1.5官方路径的动作顺序。

benchmark专属的逻辑被隔离在评测器内，不渗入模型与数据层；评测同时保留task、trial、rollout三个粒度的证据与可选的rollout视频——聚合成功率因此可以追溯到个体行为，而不是一个无法审计的数字。评测器阵容也在持续扩充，RoboDojo、RoboTwin等更多仿真评测器将在近期更新中加入。

![image](https://mmbiz.qpic.cn/sz_mmbiz_png/SWiaIiacqbficjrg4Y8uSU5DcK3BkU8dHQOPQcGMxdKv6csiciaQlKA9SAFHRUqeYSzInZfeqcX0icicHplRqBCzFsx1volGegdv0icInTxluZwRbS8/640?wx_fmt=png&from=appmsg)

值得一提的是，这套评测面向所有满足接口的策略开放，而非只服务本地训练的checkpoint：报告中GPT-6即以inference-only的API策略身份接入同一套LIBERO闭环评测——不提供权重、不参与训练，评测器照常完成策略接入、闭环调度与证据记录。这意味着第三方API模型与自训练checkpoint可以在同一协议、同一证据粒度下接受审计与比较。

> [!NOTE]
> **注解｜同一 harness 不自动等于公平比较**
>
> 统一 observation/action contract、初始状态与记录粒度消除了重要混杂项，但 API 策略和本地 checkpoint 仍可能在延迟、随机性、重试、服务端版本、上下文与评测预算上不同。这里证明的是“能被同一闭环 harness 调用和审计”，不是严格同条件的排行榜结论。

### 2.4 推理加速：替换执行图，而非重训策略

VLA的训练实现为清晰度、梯度计算与架构灵活性而优化，这些优先级并不产生高效的部署图；flow-based策略进一步放大了这种错配，因为每次动作查询都要执行视觉-语言编码器并反复评估动作去噪器。FluxVLA允许配置定义一个inference_model，它与训练模型结构兼容，但用面向推理的实现替换选定模块乃至完整预测路径——checkpoint保持不变，加速是同一组已学参数上的另一种执行图，而不是单独训练的策略。

具体而言，GR00T路径替换为推理专用的骨干与flow-matching头；π0.5路径则把视觉编码、语言条件、action expert与去噪循环整条管线展开进一张CUDA Graph，消除视觉-语言前缀与反复动作解码之间的主机边界。实现上，平台用Triton融合算子与定制CUDA算子消化跨transformer层与去噪迭代中反复出现的小算子开销，并配合静态buffer在首次预测时完成预热与图捕获，后续预测只需更新输入并重放同一张图。

![image](https://mmbiz.qpic.cn/mmbiz_png/SWiaIiacqbficggTiaaQicnS3zia1vO1dLGSiaqXvdsxtakHBnZNUtoIwJQvGvzoy7ZLibSfstIpgx8nExdIxREGxCLow3Df8aeEWOLuQc5q8YgkrmY/640?wx_fmt=png&from=appmsg)

### 2.5 Real-Time Chunking：让异步执行的块与块对齐

动作分块减少了VLA的查询频率，但引入了时序协调问题：当预测与执行重叠，新生成chunk的一部分在可用时可能已经过时。RTC把上一个chunk中尚未执行的部分变成下一次预测的显式条件，有效规避模型输出的动作轨迹抖动，确保真机部署后机器人执行动作稳定、流畅。runner首先做时间对齐：设上一个chunk首个样本的时间原点为 ，控制周期为 Deltat，则已流逝的偏移（可以是小数）为：

runner从 处对剩余轨迹重采样，得到的前缀对应控制时间线上仍然相关的命令，而不是数组里已经过时的位置。在此之上，报告提供两条路线：

-

Training-time RTC：训练时采样模拟延迟，让模型见到干净的已知前缀、只预测未知后缀；推理时把对齐后的历史动作固定在前 个位置，并在每一步去噪更新后恢复，保证返回的重叠段与前缀精确一致。

-

Test-time RTC：不改动训练，仅在推理时对前缀误差施加引导。原始方法需要沿去噪器反向传播，FluxVLA额外提供了一种更低成本的直接近似——把加权前缀误差直接加到预测速度上，无需对去噪器求导。

两条路线都已兼容加速推理路径。

> [!NOTE]
> **注解｜RTC 解决连续性，不等于安全保证**
>
> RTC 按真实时间对齐仍相关的旧前缀与新 chunk，减少异步交接不连续；它不保证动力学约束、碰撞、关节限位或接触稳定性，后处理、低层控制器和安全互锁仍不可缺。文中的“确保稳定、流畅”是经验性结果，不是形式化保证。

### 2.6 轨迹后处理：从"预测一致"到"可以执行"

预测时的一致性本身并不保证可执行的运动：反归一化之后，一个chunk仍可能包含局部振荡、隐含过大的速度/加速度/jerk，或以不理想的高阶运动变化衔接上一个chunk。FluxVLA把轨迹后处理作为反归一化与命令执行之间可选的runner级阶段，提供两种后端：

-

关节空间MPC：把策略输出视为参考轨迹，对每个关节在固定时域上优化位置、速度、加速度与jerk，在跟踪误差、终端状态与高阶运动约束之间求解折中（OSQP求解，逐关节可分离、可并行）；

-

Ruckig jerk限制滤波：让一条jerk受限的在线轨迹朝相继的策略目标前进，高阶约束直接且计算量小，代价是可能引入参考滞后。

配置将三个决策正交分离：轨迹如何生成（后端）、期望什么终端行为（tracking或settle模式）、是否需要与仍在执行的旧轨迹缝合（stitching）。RTC与轨迹后处理是顺序协作而非竞争的机制：RTC减少新chunk带来的变化，后处理把命令正则化到机器人可执行的运动包络内。

### 2.7 真机推理：runner与operator各司其职

物理执行把目标从"预测动作"变成"以稳定控制频率交付安全、时序一致的命令"。FluxVLA把这一过程拆为观测预处理、动作预测、动作后处理、命令执行四个阶段，并把职责划给两侧：推理runner持有模型恢复、在线数据管线、动作块调度与RTC、轨迹后处理等时序状态；operator持有传感器采集、按时间戳的观测同步与命令传输。机器人通信代码因此不会成为模型的隐藏依赖，仿真与物理执行共享同一个面向策略的接口——同一套模型与预处理配置，只需替换最后的观测与执行边界即可从仿真切换到真机。个别集成还会暴露本体专属的安全钩子，例如Tron2的operator会转发急停请求，Franka在夹爪action server不可用时回退到publisher接口。

对于算力受限的机器人侧，平台提供基于ZeroMQ的远程GPU服务：机器人侧runner保留传感器采集与命令发布，观测序列化后发给GPU服务器，由服务器完成预处理、预测与动作恢复。客户端分段记录序列化、网络往返、服务端推理等各项延迟——模型吞吐并不直接决定机器人的有效控制频率，这段分解让端到端链路的瓶颈清晰可见。远程路径与本地推理共享同一套观测与动作语义。

> [!NOTE]
> **注解｜operator 也是安全边界**
>
> runner/operator 分层隔离通信细节，但“替换 operator 即可上真机”仍以动作单位、坐标系、时间戳、观测新鲜度、取消语义、限位和急停满足 contract 为前提。远程推理还应定义丢包、乱序、超时、服务端失效和 stale observation 的 fail-safe 状态机。

## 03 实验结果

### 3.1 仿真基准结果

![image](https://mmbiz.qpic.cn/sz_mmbiz_png/SWiaIiacqbfichcZ0ic2f6vGd5I42JpMYy0LlBxwo5gmyQFgiauaRHsMcdntHz9HqqOK8NL4KjymgCGWX9mtY4a1dEUVmw2pJR63BImpYUibbzQVA/640?wx_fmt=png&from=appmsg)

上表报告了当前LIBERO评测面上的十四个集成：十三个checkpoint策略覆盖紧凑型VLA、预训练flow-matching、模块化VLM+动作头与WAM四大家族，外加一个inference-only的GPT-6 API策略。十三个checkpoint策略的平均成功率从SmolVLA的84.70到DiT4DiT的98.65，其中十一个超过95%，最强的Long套件数值达98.0（Cosmos3-Nano）。这些结果说明共同的数据、runner、checkpoint与评测器路径能够支撑内部结构截然不同的策略。

![image](https://mmbiz.qpic.cn/mmbiz_gif/SWiaIiacqbficjhMsxPGgydFiahXEOeQWPicmBWPOaNB3sqn1DZa8x5dCraXZE3DTiaxbniavMeCKr5q2pwNrzbPVgl9LaLr6qB4Zzh7KEtfr8MqV8/640?wx_fmt=gif&from=appmsg)

GPT-6一行值得单独说明：它以纯API调用的方式接入评测，受资源限制每任务仅评测5条episode（每个套件50条、共200条），平均成功率37.50%，报告将其与checkpoint结果分开报告，不假设对等的评测预算。这一行的意义不在分数本身，而在于证明FluxVLA的评测面对API策略同样开放——不掌握权重的外部模型，也能进入与本地checkpoint完全相同的闭环协议与三级证据体系。

![image](https://mmbiz.qpic.cn/mmbiz_gif/SWiaIiacqbficguGxmqiaTQ3BsIKryNrJJswKVcLlv2kwkGib9icRbvbAfpOqyrIaGlRLMPmtdOjEO6cMnBSIQMibCg0rpsppgiaC4mQl6g8AIzqRNY/640?wx_fmt=gif&from=appmsg)

RoboCasa GR-1的结果把评测扩展到LIBERO之外、更具挑战性的区间：八个已报告集成的平均成功率从SmolVLA的8.75%到DiT4DiT的57.25%。数据预算的差异直观体现在数字上——GR00T N1.5以每任务30条演示训练达到44.30%，使用全量数据训练的GR00T N1.7为46.42%；FastWAM整体达到49.92%，且在考察未见任务的Generalization组上达到50.00%。这些数值同样不能跨行归因于架构优劣，但展示了同一评测面对不同数据规模与策略家族的容纳能力。

> [!NOTE]
> **注解｜高成功率提示 benchmark 饱和**
>
> LIBERO 上 11/13 个 checkpoint 平均超过 95%，既说明集成没有明显破坏强策略，也提示区分度有限。更有信息量的是失败类型、长程任务、分布外扰动、不同 seed 方差及成本/延迟约束下的成功率。RoboCasa 提供更大动态范围，但数据预算不同，不能把跨行排名直接归因于架构。

![image](https://mmbiz.qpic.cn/sz_mmbiz_png/SWiaIiacqbficgXmdghYHEbWL2y4A4VnF5fJzJnqE7JRbeVZoH15HChuYLjfl6Jez064JXFvk9AMMJjKbUDVY1h4PuiaSwEkcicLib9MmseZFIhbY/640?wx_fmt=png&from=appmsg)

### 3.2 推理加速与数值对齐

运行时评估在相同模型、硬件、精度与输入配置下对比普通模型路径与推理专用实现。在全部八组设备/模型组合中，加速将模型频率提升了2.31×到9.64×：A100上GR00T从5.96Hz升至32.6Hz、π0.5从2.2Hz升至21.2Hz；RTX 5090上优化路径达到GR00T 42.6Hz、GR00T+Training-time RTC 47.6Hz、π0.5 31.6Hz；边缘端同样具有实际意义——AGX Orin 64GB上GR00T从3.2Hz升至7.4Hz、π0.5从1.4Hz升至4.4Hz。

![image](https://mmbiz.qpic.cn/sz_mmbiz_png/SWiaIiacqbfich6aBljZ4py9pF36KjblVx0QPSvZUtzCxoKwTaEPYqWHo64klFCHzUnxQDPcTvZYQC5csic50S0DuzVLLpuThXew6Jl4YgdJoSQ/640?wx_fmt=png&from=appmsg)

加速只有在保持策略计算不变时才有用。已发布的GR00T测试把匹配的随机权重拷贝进基线与加速头，固定输入与采样种子比较预测动作：普通路径与Training-time RTC prefix-conditioning路径的余弦相似度分别为0.99999237与0.99999380（均超过0.99999），最大绝对差约0.02。这与bf16算子、融合与运算顺序带来的小变化一致，验证了被测头级路径的数值对齐。报告同时坦承局限：当前尚未完整规定预热迭代、测量重复次数、同步点与时序边界，这些频率支持"存在显著的路径专属加速"这一结论，但不构成硬件归一化的模型间对比；模型频率也不等于端到端控制频率。

> [!NOTE]
> **注解｜数值相近不等于闭环行为等价**
>
> 固定随机权重与输入的头级余弦相似度 >0.99999 是强数值对齐证据；但最大绝对误差约 0.02 是否可忽略取决于动作量纲、反归一化和闭环敏感性。还需用真实 checkpoint、多步去噪和相同 seed rollout 检查成功率。报告主动披露计时协议不完整，因此这些数字不宜用于跨设备、跨模型排名。

### 3.3 轨迹后处理与真机证据

后处理延迟基准独立于策略推理测量：对一条12自由度、50步的合成轨迹，关节MPC的tracking延迟为4.90ms，Ruckig为1.17ms（约快4.19倍）。相对于许多大模型推理调用，这一主机侧开销很小，但对高频率控制并非可以忽略。真机运行时轨迹进一步显示，Training-time RTC输出的chunk经后处理后，能够在异步交接处接上仍在执行的处理后轨迹。

![image](https://mmbiz.qpic.cn/sz_mmbiz_png/SWiaIiacqbficiaZibEV4vpoV7V6qFliavB2smjOtnWPDn3HKNVtwHjwUByYVrbcp0Uib5JH4gZvI5BoIlwqcQ7ZKShsS2wKk5ZgPkU3Beo8PwP2XQ/640?wx_fmt=png&from=appmsg)

真机层面，报告给出了两组闭环benchmark。ALOHA基准覆盖两项柔性物折叠与三项抓取放置共五个任务，每个策略评测110条trial——GR00T N1.5成功36条（32.73%），π0.5成功70条（63.64%），且π0.5在每个任务上的观测成功率都更高。

在逐际动力自研机器人Oli上，同一对策略进一步接受定点与移动操作检验：以四阶段箱子搬运任务为例，两者完成前三个阶段的比率几乎相同（60.0%对60.7%），但全程完成率分别为6.7%与32.8%；π0.5在糖果抓取上更高，GR00T N1.5则在篮子玩具抓取上反超。

两组benchmark的共同价值在于：仿真中验证过的策略经同一套部署路径直接送上不同形态的真机，用逐trial的成功率与分阶段的完成度说话——既证明runner–operator架构能够容纳异构本体，也让策略在真机上的真实水位清晰可见。

![image](https://mmbiz.qpic.cn/mmbiz_png/SWiaIiacqbfich1THS5N02d6ffktiaibzCzibiacRA5BsrSXy42U3IfLotzBZW6ueib5dX5tZSgfrUzc8aF23pdQXyI9MN8A8pexksyMQoGVRLY3g9E/640?wx_fmt=png&from=appmsg)

另一组定量证据来自配套的ARM研究：在八阶段ALOHA毛巾折叠任务上，成功率从行为克隆的62.1%升至SARM-based RA-BC的78.5%、再升至**ARM-based AW-BC的99.4%**，episode吞吐与折叠精度同步提升（报告注明该研究未披露评测trial数，因此保留点估计而不推导置信区间）。这表明FluxVLA能够参与横跨真机数据、奖励建模、重加权策略训练与部署的闭环。

> [!NOTE]
> **注解｜最强与最弱的真机证据**
>
> ALOHA 每策略 110 个 trial、逐任务报告，强于成功视频；比较策略仍需确认 trial 独立性、初始化、介入与失败判据。ARM 的 62.1%→99.4% 看似更强，却因 trial 数未披露而无法估计不确定性。它能证明平台贯通奖励建模、重加权训练和部署路径，不能单独证明提升可普遍复现。

![image](https://mmbiz.qpic.cn/sz_mmbiz_png/SWiaIiacqbficjRRxlozTkOA5eicNKlujxvQWwicBHATPrSR6hBCibdJqQSiccgFDZiavEH4e2ZxtqmiauEFAWk5ajicHICAMaYxcP35LfhvoSeIlcoA4/640?wx_fmt=png&from=appmsg)

## 04 总结与展望

FluxVLA把完整的策略生命周期当作一个可重建的工作流来处理：共同的Parquet数据层与有序transform流水线把存储与策略语义分离；注册表构造的模型容纳集成VLM、可组合骨干与动作头、时序/世界模型组件以及奖励加权目标；runner持有分布式训练、评测、服务与checkpoint状态，operator隔离仿真器与机器人通信；RTC协调异步预测与进行中的执行，轨迹后处理把反归一化的chunk适配到本体专属的运动要求。在此之上，平台还集成了组合式双臂仿真、可扩展的自动化数据生成，以及模型解耦的人在环rollout、接管、纠正采集与奖励标注能力——部署中捕获的失败与人类纠正，可以回流为下一轮训练的经验。

对开发者而言，我们把常见集成收敛为三条有界配方：

-

新增数据集，转换到统一的episode布局、定义字段映射与transform列表，验证归一化-反归一化能还原预期的物理动作约定即可，训练循环无需改动；

-

新增模型，注册相应组件并提供满足约定的配置；

-

新增机器人，实现对应operator，并在闭环执行前校验观测新鲜度、命令单位、轨迹取消与安全互锁。扩展并不意味着任意组件可以随意组合，而是让不兼容暴露在少数可审查的边界上。

展望部分，团队计划把FluxVLA Engine从统一学习框架发展为开放的具身智能技术生态平台——这一方向与逐际动力"以企业级资源与服务持续维护迭代、构建全球开发者社群"的开源承诺一致，各子系统围绕同一套接口约定分工：FluxMimir负责离线数据工程与版本化发布，FluxBisim负责可扩展仿真与数据生成，FluxDAgger负责人在环的rollout、接管与纠正采集并保留完整谱系，FluxThemis负责仿真与真机评测编排，FluxHermes负责模型导出、优化与部署打包。各子系统独立演化、通过共享约定交换版本化artifact，构成"生成数据→训练策略→编译部署→评测回流"的闭环改进周期。

> [!NOTE]
> **注解｜真正的验收标准是跨团队复现**
>
> 设计价值在于把不兼容集中到可审查边界。下一步应看外部团队能否从公开 artifact 在不同硬件重建结果，版本升级是否有 schema migration，数据谱系和评测协议是否可追溯，安全互锁是否进入统一测试。官方仓库已公开 Apache-2.0 代码、配置、文档、测试与多类 checkpoint 链接，但“生态平台”仍是路线图。

### 参考文献

-

[1] Kim M J, Pertsch K, Karamcheti S, et al. OpenVLA: An open-source vision-language-action model[J]. arXiv preprint arXiv:2406.09246, 2024.

-

[2] NVIDIA, Bjorck J, Castañeda F, et al. GR00T N1: An open foundation model for generalist humanoid robots, 2025.

-

[3] Ye S, Ge Y, Zheng K, et al. World action models are zero-shot policies[J]. arXiv preprint arXiv:2602.15922, 2026.

-

[4] Ma T, Zheng J, Wang Z, et al. DiT4DiT: Jointly modeling video dynamics and actions for generalizable robot control[J]. arXiv preprint arXiv:2603.10448, 2026.

-

[5] Liu B, Zhu Y, Gao C, et al. LIBERO: Benchmarking knowledge transfer for lifelong robot learning[J]. Advances in Neural Information Processing Systems, 2023, 36: 44776-44791.

-

[6] Nasiriany S, et al. RoboCasa: Large-scale simulation of everyday tasks for generalist robots, 2024.

-

[7] Black K, et al. Real-Time Chunking (RTC): Inference-time guidance for asynchronous action-chunk execution, 2025.

-

[8] Stellato B, Banjac G, Goulart P, et al. OSQP: An operator splitting solver for quadratic programs[J]. Mathematical Programming Computation, 2020, 12(4): 637-672.

-

[9] Berscheid L, Kröger T. Jerk-limited real-time trajectory generation with arbitrary target states (Ruckig)[C]//Robotics: Science and Systems, 2021.

-

[10] Cadene S, Alibert S, Soare A, et al. LeRobot: State-of-the-art machine learning for real-world robotics, 2024.

> [!NOTE]
> **读后结论｜如何使用这篇文章**
>
> 把 FluxVLA 看作实验与部署的“控制面”，而不是新的策略排行榜冠军。它最可信的贡献是共享 contract、artifact 重建、runner/operator 分层，以及把 RTC、加速和后处理放进同一运行时；最需补证的是跨团队复现、完整 benchmark 协议、真机统计不确定性和故障安全。若准备采用，优先做一个纵向验收：选单一策略与本体，从数据 checksum、训练 commit、checkpoint 到仿真 seed、端到端延迟、真机失败日志全链路重建，再决定是否扩展模型矩阵。

