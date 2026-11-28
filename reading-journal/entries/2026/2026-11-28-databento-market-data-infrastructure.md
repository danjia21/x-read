---
format: notes-v1
title: "Databento 如何把交易所行情做成可回放的数据服务"
source_title: "OpenAI和Google都在买单：39 人撑起数据独角兽"
source_url: "https://mp.weixin.qq.com/s/7l6t3UOE4vrOBfJpoee1Ew"
source_language: zh
entry_language: zh
published: "2026-11-16"
read_date: "2026-11-28"
authors: ["QuantML"]
topics: ["Financial Markets", "Software Engineering", "AI Industry"]
tags: ["databento", "opra", "market-data", "dbn"]
source_access: full
---

# Reading guide

先读第 3、4 节，沿着交易所组播、行情归一化、实时分发与历史回放追踪同一条数据链。文章的核心判断是，复用采集管线、统一交付格式和自助接入，让小团队能够服务更多机构。再用第 1 节检查哪些成本可以摊薄，最后读第 5 节的 AI 需求叙事。公司的技术复盘具体说明了 OPRA 突发流量和 C++／Rust 分工；融资公告披露了客户数量的口径，但具体采购方、用途及 AI 需求对增长的贡献仍需额外证据。一个值得追问的问题：客户数与许可分摊变化时，哪一段链路的成本最先随用量显著上升？[Databento 融资公告](https://databento.com/blog/series-c/)

## 采集复用与交付成本需要分别计量

<!-- x-read-anchor {"heading":"01 / 经营杠杆的秘密：把重资产做成一次性固定成本","passage":""} -->

同一份组播流可供多位客户使用，因此采集侧投入通常随交易场所和流量扩张，分发侧则受出站字节、连接及交付方式影响。机柜租金和持续维护属于经常性成本，即使短期内对客户数量不敏感。交易所授权应按数据集、使用方式和再分发权利单独核算，仅凭透传的描述无法判断现金流时点。[Databento 官方定价与许可说明](https://databento.com/pricing)

## 生命周期约束解释了团队的语言选择

<!-- x-read-anchor {"heading":"03 / 为什么核心解析器坚守 C++23，分发网关用 Rust","passage":""} -->

解析器中，缓冲区跨迭代复用，但其中的借用只在当前迭代有效。C++ 把这个约束交给实现者，持有成员引用的类型还要处理移动和复制后引用指向谁的问题。公司复盘明确说明没有做完整的双语言基准，所以每秒 1400 万条所能支持的是其架构容量口径，无法据此量化两种语言的吞吐差距。[Databento 解析器技术复盘](https://databento.com/blog/why-we-didnt-rewrite-our-feed-handler-in-rust)

## OPRA 分片要看突发是否同步

<!-- x-read-anchor {"heading":"04 / 攻克 OPRA 50Gbps 洪峰与 DBN 零拷贝协议","passage":""} -->

分片的风险取决于毫秒窗口内多个通道的峰值是否叠加，按日均包速率均衡仍可能让某一队列先溢出。公司复盘还区分了 OPRA 汇总的各交易所最优报价与成交，以及直接交易所的逐订单流。前者缺少订单增删和队列顺序，因此无法从 OPRA 的报价回放恢复逐订单队列。[Databento OPRA 技术复盘](https://databento.com/blog/beyond-40-gbps-processing-opra-in-real-time)

## DBN 统一记录布局，回放仍须保留时间语义

<!-- x-read-anchor {"heading":"04 / 攻克 OPRA 50Gbps 洪峰与 DBN 零拷贝协议","passage":"自研并开源了 DBN 二进制格式"} -->

共享二进制布局让历史与实时数据共用记录解析逻辑。启用 Zstandard 时，记录在访问前仍须解压。官方字段表将 `ts_out` 标为仅实时流可用。若用历史数据评估策略决策时点，应说明如何从可用时间戳构造消息可见时点，以及如何处理同一时间戳下的事件顺序。[DBN 参考实现](https://github.com/databento/dbn)，[官方时间戳字段定义](https://databento.com/docs/conventions/common-fields-enums-types)
