---
format: notes-v1
title: "AI Infra 的三本账：训练利用率、故障恢复与推理成本"
source_title: "年薪百万招不到人？大厂疯狂争抢 AI Infra 架构师的技术真相"
source_url: "https://mp.weixin.qq.com/s/KmwqjhR3Z5ohbA8qrMAb5g"
source_language: zh
entry_language: zh
published: "2026-11-02"
read_date: "2026-11-28"
authors: ["charts"]
topics: ["AI Infrastructure", "AI Hardware"]
tags: ["mfu", "checkpointing", "inference-goodput", "accelerator-portability"]
source_access: full
---

# Reading guide

文章借薪酬话题提出一个可检验的工程判断：集群越贵，训练吞吐、故障恢复和推理调度的边际改进越值得量化。先读第 01、02 节，把稳定运行时的吞吐与包含停机、回滚和重启的端到端进度分开。接着读第 04 节，关注推理负载和延迟约束如何改变成本结论。第 03、05、06 节可用来梳理跨层调优与迁移时要验证的能力。固定工作量下的 MFU 算例可以复算，文中的薪酬区间、故障频率与成本倍数缺少样本和测量条件，末节则是课程推广。若要给同一集群排序三项投资，提高稳态 MFU、缩短恢复时间和优化推理解耦分别需要哪组生产数据？

## GPU 小时、可回收容量与现金支出

<!-- x-read-anchor {"heading":"01. 杠杆悬殊：百万年薪相比算力是零头","passage":""} -->

固定模型计算量、峰值算力与卡数，MFU 从 30% 到 45% 给出的运行时间比为 2/3。若 MFU 来自稳定训练步，排队、重启、检查点和回滚还要计入提交到完成的时间。对自有集群，提前释放的是可供其他作业使用的 GPU 小时，现金节省取决于电耗、弹性租用和后续采购是否随之减少。

## 检查点可恢复的时间从何时起算

<!-- x-read-anchor {"heading":"02. 停机灾难：万卡挂起一次烧掉几十万","passage":""} -->

异步保存要分别测训练线程的暂停时长、快照写入完成耗时，以及故障后从最后一个可用快照恢复至继续推进的时间。主机缓冲可以缩短训练线程阻塞，但运行在相同故障域内的缓冲会随节点一起丢失。PyTorch 将暂存和写入完成分成两个信号，工程上还要用实际的节点替换和读回验证来衡量可恢复进度。[PyTorch DCP 异步保存](https://docs.pytorch.org/tutorials/recipes/distributed_async_checkpoint_recipe.html)

## TP 的拓扑约束来自逐层通信

<!-- x-read-anchor {"heading":"03. 极限跨度：横跨硬件通信与模型并行","passage":""} -->

TP 跨节点的代价应从每层 collective 的消息大小、调用频率、有效链路带宽和可重叠窗口推导。先看真实消息尺寸下的 collective 尾延迟，再对照训练 trace 找出关键路径中的裸露通信。有足够高的跨节点带宽或足够大的计算窗口时，合理的分组边界可能跨越物理机器。

## DualPipe 重叠的是训练通信与计算

<!-- x-read-anchor {"heading":"1. 为什么 DeepSeek 能震动全球硅谷？","passage":""} -->

DeepSeek-V3 的双向流水调度用前向和反向工作覆盖 MoE token dispatch/combine 等通信，并减少流水线气泡。专家并行路由主要传输 token 激活和聚合结果，训练的通信重叠与 MLA 在推理阶段压缩 KV 缓存属于不同的收益来源。[DeepSeek-V3 技术报告](https://arxiv.org/abs/2412.19437)

## 用相同延迟目标核算推理成本

<!-- x-read-anchor {"heading":"2. 推理每降本 1 分钱，都是纯利润","passage":""} -->

比较 prefill/decode 分离与混合部署时，固定输入和输出长度分布、到达过程及首 token 和后续 token 的延迟目标。单位成本的分母可取满足两类延迟目标的请求所产出的输出 token，同时计入各阶段的闲置容量与 KV 传输开销。DistServe 将服务吞吐定义为在延迟目标下可承载的请求速率，也把网络带宽纳入放置决策。[DistServe，OSDI 2024](https://www.usenix.org/conference/osdi24/presentation/zhong-yinmin)

## 迁移验收要同时覆盖数值和规模

<!-- x-read-anchor {"heading":"05. 异构泥潭：国产算力迁移溢价极其恐怖","passage":""} -->

可以先用固定输入和模型状态比较算子输出、梯度及短程 loss，再用目标并行布局测跨节点 collective、端到端吞吐与恢复行为。单机能够跑通之后，编译图中的回退路径和大量节点下的尾延迟仍可能成为主要开销。这两类问题需要在相同精度设置下分别定位。
