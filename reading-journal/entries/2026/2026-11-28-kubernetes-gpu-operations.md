---
format: notes-v1
title: "百卡 Kubernetes 集群的调度与运维"
source_title: "从传统运维到 AI Infra：当我们在 K8s 上调度 100 张 GPU 时，踩过了哪些坑？"
source_url: "https://mp.weixin.qq.com/s/WFrnJ_B7BRfeF3d5tt3PcQ"
source_language: zh
entry_language: zh
published: "2026-10-16"
read_date: "2026-11-28"
authors: ["charts"]
topics: ["Infrastructure", "Distributed Systems"]
tags: ["kubernetes", "gpu-scheduling", "llm-serving", "observability"]
source_access: full
---

# Reading guide

这篇百卡集群复盘从五类生产故障说明，Pod 已分配资源或处于 Running 状态，只反映了作业能启动、模型能服务的部分条件。先读第二节的分布式作业卡住案例，再把第一节的切卡与第三节的扩容冷启动连起来看。最后两节可顺着设备、推理引擎和网关三个观测点阅读。默认调度导致的部分分配有明确机制，文中报告的 GPU 利用率改善则缺少指标口径和工作负载基线。假如训练与推理共享同一集群，何时抢占训练才能守住推理延迟目标，同时减少丢失的训练进度？

## 空余显存与可售吞吐

<!-- x-read-anchor {"heading":"2. 避坑解法：算力切分的三大流派","passage":""} -->

切分显存会改变模型实例的装箱密度。高峰期的算力和带宽竞争仍会决定同卡租户各自可用的吞吐。评估共享是否划算，可以在相同请求组合及尾延迟目标下比较每卡有效 tokens/s，并观测一个租户突发流量时其他租户的延迟。原文的综合利用率缺少这些量的对应关系。

## 配额准入和节点放置是两个环节

<!-- x-read-anchor {"heading":"2. 避坑解法：必须引入 Gang Scheduling（组调度）","passage":""} -->

示例隐含每个 Pod 请求一张卡，因此副本门槛恰好等于 GPU 数。若每节点由一个 Pod 负责本机八个 rank，门槛便对应四个 Pod。Volcano 的组调度条件参与调度决策。Kueue 文档中的 `waitForPodsReady` 则在准入后检查整个作业是否及时就绪，超时可撤销准入并重新排队。复盘时可分别检查队列等待、Pod 放置和分布式 rendezvous。 [Volcano 调度器](https://volcano.sh/docs/scheduler/overview/) [Kueue 就绪机制](https://kueue.sigs.k8s.io/docs/tasks/manage/setup_wait_for_pods_ready/)

## 扩容时跟踪每节点的冷读

<!-- x-read-anchor {"heading":"1. 存储风暴（Storage Storm）","passage":""} -->

模型权重和容器镜像可能走不同分发路径，分别测量两者的缓存命中与启动耗时，才能判断哪一层解除瓶颈。对节点本地缓存而言，新节点占比和新版本权重的并发冷读数决定上游瞬时流量。只测已有热缓存的节点，会漏掉扩容最容易受限的情形。

## 按设备与错误上下文判断恢复动作

<!-- x-read-anchor {"heading":"1. 隐蔽的 CUDA Xid 硬件错误","passage":""} -->

Xid 是驱动报告的事件编号。NVIDIA 的目录按设备、触发条件及附加字段给出不同的调查和恢复动作。把事件与 GPU ID、驱动版本和同一时段的推理吞吐关联起来，可以缩小故障范围，再决定重启应用、复位设备或排空节点。 [NVIDIA Xid 目录](https://docs.nvidia.com/deploy/xid-errors/latest/analyzing-xid-catalog.html)

## 首个 SSE 事件与流中停顿

<!-- x-read-anchor {"heading":"1. 惨案根因：","passage":""} -->

对照上游的首字节时间、网关到客户端的首个 SSE 事件时间与后续事件间隔，可以定位延时出在 prefill、缓冲还是传输。Nginx 的 `proxy_read_timeout` 计量的是连续两次上游读取之间的间隔，因此一次总时长很长且持续有输出的流可以越过这个时值。流中停顿也可能触发同一超时。 [Nginx 代理缓冲](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_buffering) [Nginx 上游读取超时](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_read_timeout)
