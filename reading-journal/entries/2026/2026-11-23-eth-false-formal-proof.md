---
format: notes-v1
title: "ETH 被推翻之后：亚指数 #SAT、形式化验证与实际边界"
source_title: "一文看懂OpenAI刚刚捅出的计算机界大篓子"
source_url: "https://mp.weixin.qq.com/s/0jusevnk7KlQ8MKI6mTB6g"
source_language: "zh"
entry_language: "zh"
published: "2026-10-29"
read_date: "2026-11-23"
authors:
  - "丸美小沐"
topics:
  - "Theoretical Computer Science"
  - "AI for Mathematics"
tags:
  - "exponential-time-hypothesis"
  - "satisfiability"
  - "formal-verification"
  - "lean-4"
---

# Reading guide

理解本文只需先分清三层对象：ETH 是关于固定宽度 SAT 最坏情形复杂度的渐近假说；#SAT 要求精确计数，严格强于只判断是否可满足；Lean 形式化验证检查的是精确定义下证明项能否通过内核，并不自动等于社区已经消化了算法直觉、常数或所有建模选择。

一句话主旨：OpenAI 与 Anthropic 公布的独立构造都给出固定宽度 CNF 的确定性亚指数时间算法，因而在各自形式化口径下反驳 ETH，但这一理论结论并不意味着现实规模 SAT 求解器立即失效或现有细粒度下界全部作废。

阅读时抓住三条线：先看 ETH 与 3-SAT 的定义；再看算法怎样把指数从线性于 $n$ 降到 $o(n)$，以及正文对代数机制的高度压缩；最后看形式化验证、实际交叉点和由 ETH 推出的条件下界分别能支持多强的结论。建议把“门锁”类比当作直觉入口，而把复杂度公式和一手仓库中的 theorem statement 当作证据核心。最强证据是两套公开论文/Lean 工件明确陈述并机器检查了亚指数算法；仍需谨慎的是“几百篇论文作废”“五个假说同时倒下”、具体交叉点和“外星人”引语等二手叙事。

带着这个问题阅读全文：当一个条件假说被渐近地反驳时，哪些依赖它的结论只是失去一条证明路径，哪些才真的被反例否定？

## 一手材料确认了什么

<!-- x-read-anchor {"heading":"此 ETH 非彼 ETH","passage":"甚至连当年亲手提出 ETH 假说的两位开山祖师爷 Russell Impagliazzo 和 Ramamohan Paturi，此刻都已经连夜组建了独立评审团，亲自下场审查。"} -->

OpenAI 的[论文目录与摘要](https://github.com/openai/math/tree/main/preprints/The-Exponential-Time-Hypothesis-is-False-October-25-2026)给出固定 $k\ge2$ 的精确 #SAT 算法，时间为 $(n+m)^{O_k(1)}2^{n/(\log n)^{1/2+o(1)}}$、空间为多项式；其[形式化范围说明](https://github.com/openai/math/blob/main/lean/docs/378.md)给出的 Lean 界为 $2^{O_k(n(\log\log n)^2/\sqrt{\log n})}$，并明确说明论文中的界更尖锐。Anthropic 的[独立仓库说明](https://github.com/anthropics/formal-math/tree/main/eth)则陈述 $2^{O(n\log\log n/\sqrt{\log n})}$ 的 #3-SAT 算法，并固定 Lean/Mathlib 版本、列出标准公理与第二内核检查。因而“有公开论文和机器可检证明工件”是可核验事实；文件数、代码行数、评审团组成及具体审阅状态并不能仅由这些一手页面确认。

## 条件定理不是被反例逐篇推翻

<!-- x-read-anchor {"heading":"一把拧不开的锁，撬动了整座大厦","passage":"现在，这句假设被 AI 一脚踹穿，所有靠这句话撑起来的定理，地基在一夜之间全空了。"} -->

若一篇论文证明的是“ETH 成立 $\Rightarrow$ 问题 $P$ 不存在某种快算法”，证明本身仍是有效的逻辑蕴含；变化在于前件不再可作为真实世界的可靠 hardness assumption。某些结论还可由更弱或不同的假说推出。OpenAI 论文也特别指出，例如部分 LCS、正则匹配下界可继续依赖 Orthogonal Vectors Conjecture，而某些问题依赖的是 unrestricted CNF-SAT 假说。因此“全部作废”适合作为新闻修辞，不是准确的文献状态描述。

## 枚举空间不等于最佳算法复杂度

<!-- x-read-anchor {"heading":"这把锁的真名叫 3-SAT","passage":"3 个开关只有 2³=8 种试法；到了 300 个开关，可能性直接超过全宇宙的原子总数（约 10⁸⁰ 个），全世界电脑绑一块儿算到宇宙毁灭也算不完。"} -->

$2^{300}\approx2.0\times10^{90}$，确实高于常见的可观测宇宙粒子数量级类比；但它描述的是完整赋值空间，不是求解给定实例必需检查的状态数。现代 SAT solver 利用 clause learning、传播与实例结构，理论最坏情形与工程平均表现不能由这个数字互相替代。

## ETH 的精确定义

<!-- x-read-anchor {"heading":"这把锁的真名叫 3-SAT","passage":"几百篇顶会论文就这么盖在了 ETH 的地基上。"} -->

标准 ETH 不是“任何 SAT 算法都必须逐项指数枚举”，而是 3-SAT 不存在 $2^{o(n)}$ 时间算法；等价地，其最优指数常数严格大于零。此次结果给出确定性 $2^{o(n)}$ 算法，所以直接否定 ETH。文章把 ETH 归于 Impagliazzo 与 Paturi 的方向基本正确，但经典表述和 sparsification lemma 的文献脉络还包括 Zane；“所有人都信”则是不可量化的概括。

## 公式排版与两个版本的界

<!-- x-read-anchor {"heading":"AI 走了条纯代数的邪道","passage":"$$ 2^{O(n\\cdot\\log\\log n / \\sqrt{\\log n})} $$"} -->

上式已根据原页面的上标结构恢复排版，等价地写作 $2^{O(n\log\log n/\sqrt{\log n})}$。这已经是 $2^{o(n)}$。OpenAI 论文摘要还写成更紧的 $2^{n/(\log n)^{1/2+o(1)}}$（外乘输入规模的多项式）；其公开 Lean scope note 对机器验证版本给出稍弱的 $(\log\log n)^2$ 因子。正文所说“交换矩阵 + Hermite 插值”只是一幅极度压缩的机制图，不能据此复现算法。

## ETH 与 SETH，及“五个假说”

<!-- x-read-anchor {"heading":"AI 走了条纯代数的邪道","passage":"ETH 连同它的加强版 SETH 等五个假说，像多米诺骨牌一样被一脚踹翻。"} -->

固定宽度 #SAT 的亚指数算法确实同时反驳 ETH，并足以反驳通常的 SETH：后者要求当子句宽度增大时，SAT 的最优指数趋近 1。Anthropic 的形式化接口还列出若干相关命题。但“等五个假说”没有在正文中逐一定义，读者无法核对口径；应以论文和 Lean 中明确量化的 statement 为准，而不把一个计数口号当作独立结论。

## 交叉点不是论文给出的通用性能保证

<!-- x-read-anchor {"heading":"AI 走了条纯代数的邪道","passage":"也就是说，除非你把全宇宙每一颗质子、电子都拿来解题，否则在人类能碰到的任何现实场景里，门锁还是安全的。"} -->

该数量级依赖怎样展开 $O(\cdot)$、选择对数底数、与哪一版 PPSZ 常数比较，以及忽略哪些多项式因子。把所有隐藏常数设为 1 只能得到示意性的“乐观下界”，不能推出实际实现会在该点交叉；隐藏常数甚至可能让阈值进一步后移。Anthropic 的官方 README 明说结果“纯渐近，不说明实际求解”。因此可靠结论是：新结果摧毁了渐近假说，但没有展示一款能在现实实例上击败成熟 solver 的实现。

## 评审状态与引语证据

<!-- x-read-anchor {"heading":"门锁还安全，数学家忙翻了","passage":"正是这些地方，让他觉得这件事需要整个理论计算机科学界一起研究。"} -->

公开 Lean 工件显著提高了“statement 与 proof term 匹配”的可信度，但机器检查不取代数学共同体对定义、复杂度模型、算法可读性和影响范围的审阅。本文没有给出 Ryan Williams 采访的直接链接，故“两三处像外星人写的”在此只能视为二手转述，不能当作独立技术背书。

## “Maths 2.0”的原意

<!-- x-read-anchor {"heading":"数学星空的规则，可能变了","passage":"他指出，AI 已经能够在短时间内批量产出数学证明，但人类数学家理解这些结果的速度，正在被远远甩在后面。"} -->

陶哲轩在 2026 年 10 月 22 日的 [Nature 评论](https://www.nature.com/articles/d41586-026-03389-1)中确实提出“Maths 2.0”，重点不是宣布人类理解已经无关紧要，而是当 proof scarcity 不再成立时，把激励转向解释、归因、质量控制与人类可理解性；文章此处抓住了证明供给与审阅带宽失衡，但省略了这一规范性主张。

## 动态组织数字需带时间戳

<!-- x-read-anchor {"heading":"数学星空的规则，可能变了","passage":"其中 654 人还进一步加入了「无 AI 派」，承诺在自己的数学研究中完全不用 AI。"} -->

组织名称、承诺文本和成员数量属于会变化的网页状态；本文未附其一手页面，本文阅读时也未据可靠的官方静态记录复核 1008/654 两个数字。它们不影响 ETH 结果本身，应与论文和形式化工件的技术证据分开。

## 参考链接状态

<!-- x-read-anchor {"heading":"数学星空的规则，可能变了","passage":"https://github.com/anthropics/formalmath/blob/16a5ce41304fcdaea4e0be7c132e1c361dc26da5/eth/paper.pdf"} -->

原文的 Anthropic 仓库路径写作 `anthropics/formalmath`，截至阅读日公开仓库实际为 [`anthropics/formal-math`](https://github.com/anthropics/formal-math/tree/main/eth)；原链接已不可访问。OpenAI 链接指向其公开论文 PDF。二者都是研究工件而非经同行评审的正式出版版本，结论虽有形式化支持，仍应持续关注仓库修订与社区审阅。
