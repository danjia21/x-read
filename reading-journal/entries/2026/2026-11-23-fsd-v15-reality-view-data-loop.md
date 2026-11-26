---
format: notes-v1
title: "FSD V15 Reality View：重建监督与驾驶数据闭环"
source_title: "特斯拉 FSD V15 连海浪都能“画”出来了，数据闭环该怎么做？"
source_url: "https://mp.weixin.qq.com/s/myTGaWKh6V_MVEog5aZmNw"
source_language: "zh"
entry_language: "zh"
published: "2026-11-22"
read_date: "2026-11-23"
authors: ["时光"]
topics: ["Autonomous Driving", "Robot Data Collection", "World Models"]
tags: ["tesla-fsd", "reality-view", "gaussian-splatting"]
---

# Reading guide

本文主动限制推断：公开视频只能证明显示效果，不能揭示训练流程或重建精度。主线是驾驶/渲染关系、外观监督、时空数据 contract、不可观测区域和驾驶收益的独立评估。3D Gaussian Splatting 与 Street Gaussians 有公开论文支撑；V15 结构仍未公开。应追问：生成画面是驾驶表征的可审计投影，还是可能共享同一偏差的旁路输出？

## 共享模型不证明共享因果路径

<!-- x-read-anchor {"heading":"","passage":"真正值得追问的是：当驾驶和环境重建进入同一个模型体系，数据不再只需要回答“这时候该怎么开”，还要支持模型回答“周围的世界是什么样，在时间和空间上如何保持一致”。"} -->

多任务模型可共享 backbone 或表示，同时拥有独立 head 与损失。仅凭“同一个模型”无法判断渲染输出是否被驾驶策略消费，也无法证明画面改善会提升控制。
