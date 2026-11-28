---
format: notes-v1
title: "把人类基因组比作遗留代码，能解释什么？"
source_title: "深度长文：你敢信吗？人类基因组就是个跑了38亿年没人敢重构的屎山代码！"
source_url: "https://mp.weixin.qq.com/s/PerEM91vxTSjtjhTBMR0NA"
source_language: zh
entry_language: zh
published: "2026-10-29"
read_date: "2026-11-28"
authors: ["宇宙时空探索"]
topics: ["Genomics", "Evolution"]
tags: ["evolutionary-constraints", "genome-function", "fitness-landscapes"]
source_access: full
---

# Reading guide

文章借遗留代码解释演化的路径依赖。现代结构的形态，往往要结合它从哪里演化而来才能理解。先读喉返神经与视网膜的例子，再回到假基因和内含子，最后用骨盆和胎盘的两项实证研究检验这个比喻。解剖结构可以提示历史约束，具体的祖先形态与适应度路径仍需独立证据。读完可以再问一个问题。哪些证据能判断一段序列因现有功能受到选择而保留，还是因丢失它的代价很小而保留？

## 用变异缺失量检验序列约束

<!-- x-read-anchor {"heading":"","passage":"差不多一半是坏的"} -->

对假基因的注释主要关乎祖先的蛋白编码能力。判断非编码区是否受到选择，可以先校正不同位置的突变概率，再与实际观测的变异数比较。gnomAD 的 Gnocchi 图谱用 1 kb 窗口估计变异缺失程度，识别出富集已知调控元件的约束区域。该统计量可以为后续研究排序，推断具体功能仍需更细的证据。[Gnocchi 原始研究](https://pmc.ncbi.nlm.nih.gov/articles/PMC11629659/)

## 剪接后的长度不能直接换算成转录速度

<!-- x-read-anchor {"heading":"","passage":"转录效率至少能提高十倍"} -->

外显子比例只能说明成熟转录本保留了多少序列。要把比例换算成产量，需要知道转录起始、延伸、剪接与 RNA 降解分别在哪些条件下限制产量。部分内含子还携带顺式剪接调控元件，影响附近外显子的选择。

## 用步行能耗检验骨盆权衡

<!-- x-read-anchor {"heading":"","passage":"改宽了走路就不稳了"} -->

经典产科困境的一项可测预测是，髋关节间距较大会抬高双足运动的代谢成本。Warrener 等人在受测人群的步行和跑步中未发现这种关系。这个结果限制了用能耗解释骨盆形态的适用范围。步态稳定性、骨盆底支撑和分娩风险需要各自的指标。[Warrener 等人的生物力学实验](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0118903)

## 胎盘中的功能征用发生在不同谱系

<!-- x-read-anchor {"heading":"","passage":"胎盘里的syncytin蛋白"} -->

人类滋养层细胞融合研究支持 syncytin 的胎盘功能。食肉目研究则识别到独立获得的 syncytin-Car1，表明不同哺乳动物谱系反复征用了同类功能。要从今天的胎盘功能推断胎盘的起源，还需要比较这些基因被征用的时间与胎盘性状出现的时间。[人类胎盘研究](https://www.nature.com/articles/35001608) · [食肉目比较研究](https://pmc.ncbi.nlm.nih.gov/articles/PMC3289388/)

## 适应度较低的中间型也可能留下后代

<!-- x-read-anchor {"heading":"","passage":"演化是个贪心算法"} -->

逐步上坡描述的是选择过程的一种近似。有限种群中，轻度不利的变异可以短期存在，后续变异也可以在这种遗传背景上出现。理论模型显示，跨越适应度谷的概率取决于种群规模、突变率和中间型的适应度。脊椎动物视网膜的现有构造提供了历史比较的起点，重建具体路径仍需要发育和比较解剖证据。[Weissman 等人的种群遗传模型](https://pmc.ncbi.nlm.nih.gov/articles/PMC2711507/)
