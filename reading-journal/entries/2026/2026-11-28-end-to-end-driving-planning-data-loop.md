---
format: notes-v1
title: "端到端驾驶中的轨迹规划、监督信号与数据闭环"
source_title: "端到端卷得要死！0万帧标4.5年：规划工程师的“脏活”，成了量产落地最慢的那一环"
source_url: "https://mp.weixin.qq.com/s/qbOl10DszL-R262g7WlooA"
source_language: zh
entry_language: zh
published: "2026-10-26"
read_date: "2026-11-28"
authors: ["小蒜子"]
topics: ["Autonomous Driving", "Robot Data Collection", "Reinforcement Learning"]
tags: ["trajectory-planning", "imitation-learning", "closed-loop-evaluation"]
source_access: full
---

# Reading guide

原文把传统规控经验放回端到端驾驶系统的三个位置：候选轨迹的结构、训练监督和失败场景的采集。可先读 Loss 与数据闭环，再回看 PLUTO 和 DiffusionDrive 的候选生成与选优。两篇论文各有明确的评测配置，适合沿着模块拆分来看；文章关于量产传感器配置和数据瓶颈的判断主要来自工程经验。带着一个问题读：若固定传感器和轨迹选择器，新增恢复示范能否降低同类场景中策略反复偏离的概率？

## 把候选生成与规则后处理的贡献拆开

<!-- x-read-anchor {"heading":"路线一：直接端到端（PLUTO、TransFuser 系）","passage":""} -->

PLUTO 的横向查询由相邻参考线编码，纵向查询是可学习的 embedding。在 nuPlan Val14 上，含后处理的混合版得 93.21，PDM-Closed 得 93.08，去掉后处理的纯学习版是 89.04。这个差距使得后处理成为阅读论文时需要单独追踪的变量。模型输入还包含结构化场景和高精地图，评测验证的是规划器这一环的能力。[PLUTO 原论文，方法与表 II](https://arxiv.org/html/2404.14327)

## 区分轨迹生成的探索与评分协议

<!-- x-read-anchor {"heading":"路线三：Diffusion 策略（DiffusionDrive 系）","passage":""} -->

同一锚点内的样本共享大致意图，组内优势更容易反映轨迹细节的质量；跨锚点比较还要顾及不同意图之间的选优。V2 的 91.2 PDMS 对应 ResNet-34 配置下的 NAVSIM v1 navtest。v1 用控制器执行固定的自车轨迹，其他车辆沿日志运动，规划器只在初始帧推理一次。该分数衡量这套协议下的执行质量，连续重规划能否处理其他车辆的反应需要另行评估。[DiffusionDriveV2 原论文](https://arxiv.org/html/2512.07745) · [NAVSIM 评测协议](https://proceedings.neurips.cc/paper_files/paper/2024/hash/32768f7faf1995026ef9821c696f3404-Abstract-Datasets_and_Benchmarks_Track.html)

## 检查示范动作依赖什么观测

<!-- x-read-anchor {"heading":"","passage":"Teacher-Student 的不对称性削减"} -->

LEAD 除了噪声差异，还区分了遮挡和意图歧义。专家提前看见遮挡目标时，两段对学生而言几乎相同的历史可能要求完全不同的动作。给速度加噪只能覆盖其中一类差异；遮挡要核对专家何时开始利用目标信息，复杂变道则要核对导航输入是否给足了意图。三项检查可以定位同一次模仿误差的不同来源。[LEAD 原论文](https://arxiv.org/html/2512.20563)

## 恢复监督取决于偏离后的状态

<!-- x-read-anchor {"heading":"数据闭环","passage":""} -->

影子模式可以找出策略最早在哪一帧与人类动作分歧。若始终由人类开车，后续日志记录的还是人类动作带来的状态。要评估恢复能力，可以从分歧时刻启动仿真，让策略的动作改变后续状态，再查询专家的纠正动作。这个区别也影响评测切分：同一日志片段衍生出的扰动和恢复轨迹，应留在同一侧，避免把相邻状态分别用于训练和测试。
