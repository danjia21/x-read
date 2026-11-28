---
format: notes-v1
title: "Show-Harness 的机器人动作接口与跨本体验证"
source_title: "具身大变天！新国立用VLM大胜VLA，CV人沉默！"
source_url: "https://mp.weixin.qq.com/s/iwRfyZHLH_GSYDFe6v2G1w"
source_language: zh
entry_language: zh
published: "2026-10-31"
read_date: "2026-11-28"
authors: ["AI论文中稿营"]
topics: ["Embodied AI", "Robot Learning", "Vision-Language Models"]
tags: ["show-harness", "cross-embodiment-transfer", "semantic-actions", "robot-manipulation"]
source_access: partial
access_note: "已读公众号正文和图表解说。提取器只返回内嵌图片链接，未直接核对图片内容。实验设置另以论文核对。"
---

# Reading guide

先读统一动作接口，再读架构和实验。Show-Harness 的关键选择是把末端执行器的离散增量交给 VLM 决策，把坐标变换、步长和控制器留在本体解释器中。两者的分工解释了为什么同一个动作词表可以用于不同机械臂，也解释了为什么比较结果反映的是整套闭环系统的表现。跨本体实验最值得看的是零样本和微调模型各自见过哪些数据。若任务需要根据接触力连续调整，哪些决策还能留在语义动作层？

## 动作方向取决于参考视角

<!-- x-read-anchor {"heading":"Show‑Harness 通过统一语义动作接口连接基础视觉语言模型与多种机器人本体","passage":""} -->

同一个方向 token 可跨机器人复用，前提是 VLM 和解释器对参考视角、轴向和步长有一致约定。论文 §5.4 的消融支持这一点：提供明确约定后，任意符号的表现接近默认动作名。仅靠观察动作前后的视觉变化来猜符号含义，实验中只有 20 次里 1 次完成任务。[论文 §3.2、§5.4](https://arxiv.org/html/2609.10522#S5.SS4)

## 步长决定空间分辨率，分块决定反馈间隔

<!-- x-read-anchor {"heading":"Show‑Harness 架构","passage":""} -->

步长决定每条动作在物理空间走多远，分块决定两次 VLM 查询之间允许连续执行多少条动作。两者都能加快远距离移动，但接近目标时，大步长会降低可达位置分辨率，长分块会让控制继续依赖较早的观测。论文在叠块和插入实验中把步长从 2 cm 降到 1 cm，模型无需重训即可提高成功率。[论文 §5.3.1](https://arxiv.org/html/2609.10522#S5.SS3.SSS1)

## 跨本体结果对应两种训练条件

<!-- x-read-anchor {"heading":"实验","passage":""} -->

公众号提到的 89% 和 86% 对应论文表 2 的十组物体—容器任务均值，分别使用零样本 Gemini-3.1 Pro 和微调 Qwen3.5-2B。跨本体测试中，前者通过切换解释器在 Franka 和 AgileX 上执行，后者在两种本体的示范上联合训练。由此可检验已有动作接口能否在两种机械臂上复用。若要量化微调策略对未见本体的迁移，还需要按本体留出训练数据。[论文 §5.2](https://arxiv.org/html/2609.10522#S5.SS2)
