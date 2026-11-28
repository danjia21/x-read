---
format: notes-v1
title: "Kubernetes GPU 集群的调度、数据路径与性能诊断"
source_title: "别把 GPU 当 CPU 调度！K8s 运维转 AI Infra 的 残酷真相"
source_url: "https://mp.weixin.qq.com/s/9Hl6wwO_iiBdeU3WXLPZqg"
source_language: zh
entry_language: zh
published: "2026-10-30"
read_date: "2026-11-28"
authors: ["charts"]
topics: ["AI Infrastructure", "AI Hardware"]
tags: ["kubernetes", "gang-scheduling", "rdma", "gpu-sharing", "observability"]
source_access: full
---

# Reading guide

文章从 Kubernetes 运维视角解释 GPU 集群的一个关键约束：副本能够独立启动，不代表训练任务能够同步推进；推理服务则要在权重加载、共享 GPU 和排队的约束下守住尾延迟。先连读第 1、2 节，区分成组准入与通信路径，再读第 5 节，确定哪些指标能观测到进展。第 3、4 节适合用来设计冷启动和资源共享的对照实验。成组调度和 GPU 到网卡直通都有文档可查，文中的百分比、微秒数和薪酬数字缺少测量条件或数据来源。如果扩容后首 token 的 p99 升高，哪些分段指标能区分权重加载、排队和首轮计算？

## 成组准入只解决运行前的资源等待

<!-- x-read-anchor {"heading":"1. 致命的“资源死锁”与 Gang Scheduling","passage":""} -->

固定 world size 的训练应按参与 rendezvous 的必需 Pod 数配置 `minMember`，并按每个 Pod 含有的 rank 数换算。Volcano 在资源无法满足阈值时约束的是调度，容器就绪和 collective 完成仍取决于镜像拉取、进程启动、网络与框架的超时及恢复逻辑。诊断卡住的训练时，先区分是否仍处于调度阶段，再检查 rendezvous 和 collective 序号。[Volcano PodGroup 文档](https://volcano.sh/docs/concepts/podgroup/)

## 按 GPU 到网卡的实际路径验证通信

<!-- x-read-anchor {"heading":"02. 网络质变：从容器网络到 RDMA 无损网","passage":""} -->

Multus 解决 Pod 的接口挂载，GPUDirect RDMA 路径则取决于 GPU 和 NIC 的 PCIe 拓扑及驱动。相同的 CPU socket 只是粗略线索。可记录 rank 到 GPU 和 NIC 的映射，在相同消息规模下比较不同放置方案的端到端 collective，再用低层链路测试区分 GPU 到 NIC 的路径和交换网络瓶颈。文中的网卡数和时延只能按具体部署验证。[NCCL 排障文档](https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/troubleshooting.html)

## 挂载成功与首请求就绪之间有多少数据移动

<!-- x-read-anchor {"heading":"03. 存储鸿沟：百 GB 权重的秒级冷启动","passage":""} -->

`mmap` 将文件页的读取推迟到访问时。若加载器在首个请求前就需要把整个分片搬入显存，冷缓存下仍要读取这些字节。可把扩容时延按权重可见、显存加载完成和首个成功请求分段，并在冷缓存与热缓存下分别比较单节点启动和批量启动，从而看清 P2P 分发缓解的是哪一段。

## 用尾延迟刻画共享方案的隔离能力

<!-- x-read-anchor {"heading":"04. 算力切分：从 Cgroup 到 GPU 虚拟化","passage":""} -->

从 Volta 开始，NVIDIA 的 MPS 客户端各自保留 GPU 地址空间和 CUDA context，由 MPS 服务协调共享资源以支持并发调度。地址空间隔离与显存带宽隔离是两个指标。评估共享方式时，可让同一个在线推理负载与不同强度的内存密集任务共置，同时记录请求 p99 和总吞吐，观察吞吐收益所对应的尾延迟代价。[NVIDIA MPS 架构文档](https://docs.nvidia.com/deploy/mps/latest/architecture.html)

## 把 GPU 活跃度与工作进展放在同一条时间线上

<!-- x-read-anchor {"heading":"05. 监控升维：从 HTTP 到 Xid 硬件指标","passage":""} -->

训练侧可对齐各 rank 的 step 完成时间、collective 时长和链路计数，确定最先失去进展的位置。推理侧把 TTFT 和队列、prefill 指标联查。对 decode，vLLM 按流式输出事件记录 ITL，按完成请求记录 TPOT。一次输出可以包含多个 token，两个直方图的聚合权重也不同，比较实验结果前应先固定口径。[vLLM 指标定义](https://docs.vllm.ai/en/latest/design/metrics/)
