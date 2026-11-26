---
format: notes-v1
title: "GitHub README 里的 ROFL 区块链"
source_title: "有人利用GitHub 的 readme.md“挖矿”，已经挖出 558 个区块！怪不得github宕机了！"
source_url: "https://mp.weixin.qq.com/s/6dXEuFvOTWDnBCdLT8fb3w"
source_language: "zh"
entry_language: "zh"
published: "2026-09-08"
read_date: "2026-09-29"
authors:
  - "国际观察员-方刚"
topics:
  - "Blockchain"
  - "Open Source Software"
tags:
  - "rofl"
  - "bitcoin"
  - "github-actions"
  - "proof-of-work"
  - "subset-sum"
---

# Reading guide

背景知识：UTXO、数字签名和 PoW 可以在单机或单仓库中完整实现，但区块链的开放共识还需要去中心化提议、分叉选择和抗审查机制。ROFL 复刻的是许多账本规则，不是 Bitcoin 的全部网络信任模型。

ROFL 是把 UTXO、签名、PoW、难度调整和全链验证搬进 GitHub Issues、Actions 与 README 的教学系统，而不是具有开放共识的真正加密货币网络。阅读时抓住三条线：本地解题和评论提交如何形成区块，账本验证实现了哪些 Bitcoin-like 规则，以及单一仓库写入者带来什么信任边界。建议先读协议骨架，再看动手教程，最后读攻击测试与限制。代码和规则可直接核验；链高、奖励和矿工占比是会过期的快照，“导致 GitHub 宕机”也没有证据。带着这个问题阅读全文：哪些安全性质来自密码学，哪些其实依赖 GitHub 和仓库所有者？

## 来源与时点

<!-- x-read-anchor {"heading":"","passage":""} -->

原文来自微信公众号「给点知识」，作者署名“国际观察员-方刚”，发布于 2026-09-08。本条记录只保存阅读注解，正文请在[原文](https://mp.weixin.qq.com/s/6dXEuFvOTWDnBCdLT8fb3w)查看。项目链高、矿工占比和奖励会继续变化；项目仓库在本次阅读时显示高度已到 3947，因此文中“558 个区块”“86.6%”是文章发表前后的历史快照，不是当前状态。[ROFL 项目仓库](https://github.com/ram0verflow/ram0verflow)

## “真区块链”的准确边界

<!-- x-read-anchor {"heading":"","passage":"一个印度工程师在 GitHub 仓库的 README 文件里跑了一条\"真\"区块链：矿工在本地解题，把答案贴成 issue 评论，机器人验证后写进账本。它有 UTXO、有 ECDSA 签名、有难度调整、有减半——唯一没有的，是钱的价值。而这恰"} -->

更精确的说法是：ROFL 实现了许多 Bitcoin-like 数据结构与验证规则，但不是一个去中心化的点对点共识网络。其规范明确采用单一写入者、按提交顺序裁决、无分叉重组；所以它适合演示 UTXO、签名、PoW 与全链重放，却不能等同于比特币的开放网络安全模型。[项目 README](https://github.com/ram0verflow/ram0verflow#what-this-is)；[共识规范](https://github.com/ram0verflow/ram0verflow/blob/main/SPEC.md)

## 轶事与统计的证据层级

<!-- x-read-anchor {"heading":"01 // 一个矿工，把项目作者的邮箱炸了","passage":"你可能觉得这就是个程序员梗。但你往下读十分钟会发现：这个玩笑项目，可能是普通人理解比特币最好的一本\"活的教科书\"——因为它把比特币的每一根骨头都拆出来摆在明面上，包括那些教科书从来不好意思细讲的。"} -->

仓库本身可以验证链上高度、矿工榜和余额，但这里的 Reddit 对话、职业头衔以及“导致 GitHub 宕机”均属于文章转述或玩笑，不能由账本数据推出。当前 README 已显示数千个区块且矿工分布明显变化，也说明这些数字应带上观测日期。[仓库动态账本](https://github.com/ram0verflow/ram0verflow)

## 实现核验与两处措辞修正

<!-- x-read-anchor {"heading":"02 // 原理：一条区块链的\"器官移植手术\"","passage":"挖出来的币要等 10 个确认才能花。防止你挖完就跑。"} -->

项目 README 确认了 UTXO、secp256k1、RFC 6979、low-s、16 区块调难、四倍钳制、210 区块减半和 10 确认成熟期。两点需要限定：UTXO 不是“每个币”，而是交易输出；coinbase maturity 主要限制新铸造输出过早花费，并非一般意义的“防止矿工挖完就跑”。[项目 README](https://github.com/ram0verflow/ram0verflow#what-this-is)；[Bitcoin 开发者参考：Transactions](https://developer.bitcoin.org/reference/transactions.html)

## README 是渲染视图，不是验证器的权威输入

<!-- x-read-anchor {"heading":"02 // 原理：一条区块链的\"器官移植手术\"","passage":"pull request → 交易广播（转账可以走 PR，贡献还能挂在你主页上）"} -->

项目自称 canonical ledger 是 README，但验证脚本实际只读取 `chain/blocks.jsonl`，README 是由该文件渲染出的可读视图。GitHub Actions 也更接近受仓库所有者控制的验证与写入流水线，而非任何人都能独立参与的“全节点”。这一区分正是理解其信任模型的关键。[验证说明](https://github.com/ram0verflow/ram0verflow#verify-everything-yourself)；[`verify.py`](https://github.com/ram0verflow/ram0verflow/blob/main/verify.py)

## 绑定身份不等于防女巫

<!-- x-read-anchor {"heading":"02 // 原理：一条区块链的\"器官移植手术\"","passage":"一个防女巫、防抄袭、防抢跑的机制，就这么朴素地长在\"用户名\"这个最普通的东西上。"} -->

用户名作为种子能阻止把某个已解答案直接换名提交，也降低评论区复制和抢跑的价值；但它不阻止一个人创建或控制多个 GitHub 账号，因此不能称为严格的 Sybil resistance。项目还说明当前难度上限为 3000 道题；“约 340 道”是某个历史负载下的估计，不是协议常数。[项目 README](https://github.com/ram0verflow/ram0verflow#mine-a-block)

## 可检测、可拒绝与不可篡改是三件事

<!-- x-read-anchor {"heading":"03 // 本质：中本聪从来没发明\"不可篡改\"","passage":"区块链从来不是\"不可篡改的技术\"， 它是\"篡改成本高于收益\"的社会学。"} -->

这段抓住了 ROFL 最重要的教学点，但对比特币的概括略显单因果。哈希链使修改可检测；数字签名约束花费授权；PoW 与链选择规则提高重写成本；独立验证者决定是否接受候选历史。ROFL 的旧副本持有者能证明仓库历史被替换，却无法仅靠协议迫使唯一写入者恢复它。项目限制章节对此表述得很清楚。[ROFL limitations](https://github.com/ram0verflow/ram0verflow#limitations)；[Bitcoin 白皮书](https://bitcoin.org/bitcoin.pdf)

## 命令仍对，奖励数字已过期

<!-- x-read-anchor {"heading":"第三步：挖矿，把你的 GitHub 用户名带上","passage":"恭喜，你此刻完成了一次完整的挖矿 → 提交 → 全网验证 → 上链。你在矿工榜上会有名字，你的地址里会躺着 12.5 个 ROFL。"} -->

仓库当前仍给出相同的 clone、钱包和矿工命令，但奖励按每 210 区块减半；项目 README 在本次阅读时显示下一奖励约为 `0.00019073 ROFL`，远低于文中的 12.5。提交入口的 issue 编号也会滚动变化，应从 README 的 “Mine a block” 链接进入，不要依赖旧文章中的状态描述。[官方挖矿说明](https://github.com/ram0verflow/ram0verflow#mine-a-block)

## 验证脚本的教育价值与边界

<!-- x-read-anchor {"heading":"场景 B：把它当\"活的区块链教材\"读","passage":"而且它的代码组织得极其克制：加密库约几百行，共识规则约几百行，整个项目没有任何一行第三方依赖。想搞懂 UTXO 到底怎么花的？打开 consensus.py，它比任何比特币科普视频都直接。"} -->

项目说明确认 `verify.py` 会重算区块哈希、难度、Merkle root、签名、coinbase 与供给，测试也覆盖所列九类无效状态。但测试通过证明的是实现对这些预设攻击的拒绝行为，不是完整的安全审计，更不覆盖 GitHub 账户、Actions、分支保护或仓库所有权等控制面风险。[验证说明](https://github.com/ram0verflow/ram0verflow#verify-everything-yourself)；[测试目录](https://github.com/ram0verflow/ram0verflow/tree/main/tests)

## 最重要的操作安全提示

<!-- x-read-anchor {"heading":"⚠️ 避坑提示（必读）","passage":"这不是\"早期机会\"，这就是一场开源行为艺术。它的价值在你的认知里，不在 K 线图里。"} -->

项目 README 明确说 `rofl-wallet.json` 保存明文私钥，且不得在任何重要场景复用。更稳妥的做法是为这个玩具项目生成完全独立的密钥，并把仓库、issue 评论和任何第三方脚本都视为公开且不可信的环境。[项目限制](https://github.com/ram0verflow/ram0verflow#limitations)

## 51% 能力并非“任意提款”

<!-- x-read-anchor {"heading":"05 // 案例：86.6% 算力背后，一堂价值千亿的课","passage":"但 ROFL 淡定得很。因为它的规则里写着：单写入者、无重组、凭提交先后裁决。这也正是它能教给你的一课——同一种算力集中，在不同的系统设计里，意味完全不同的东西。比特币必须靠经济激励让攻击不划算（矿机造出来挖矿比作恶赚钱），ROFL 干脆用"} -->

多数算力可用于排斥或重组近期交易、对攻击者自己的付款实施双花，但不能伪造他人签名、凭空花费任意 UTXO 或改变全节点执行的货币规则。ROFL 则没有最长链竞争：唯一写入者按提交先后接受区块，因此矿工占比与比特币中的多数算力不是同一种控制权。所谓“绝对安全”也过强，因为单一仓库与写入流水线本身就是集中故障域。[Bitcoin 白皮书](https://bitcoin.org/bitcoin.pdf)；[ROFL 共识规范](https://github.com/ram0verflow/ram0verflow/blob/main/SPEC.md)

## “独立实现”的限定

<!-- x-read-anchor {"heading":"06 // 未来：当\"理解比特币\"的成本降到一顿早饭时间","passage":"更狠的是，这套浏览器里的共识规则是从 Python 逐行移植到 JavaScript 的，两边\"逐位一致\"。也就是说，作者给同一套规则写了两个独立实现互相对账——这是密码学界\"多实现交叉验证\"的老传统，用来抓实现层的漏洞。一个玩具项目，工程"} -->

README 确认浏览器没有应用后端，会拉取 `chain/blocks.jsonl` 并在本地重放，JS 规则是 Python 的直接移植且目标是逐位一致。这能发现语言移植或实现差异，但“同一作者/同一规范的直接 port”与由独立团队编写、独立审计的多实现仍有不同的共同模式故障风险。[官方 explorer 说明](https://github.com/ram0verflow/ram0verflow#the-explorer)

## 结论

<!-- x-read-anchor {"heading":"06 // 未来：当\"理解比特币\"的成本降到一顿早饭时间","passage":"真正的共识从来不在代码里， 在愿意一起较真的人心里。"} -->

ROFL 最适合作为“验证规则如何组合”的可执行教材：它让读者亲手观察 UTXO、签名、Merkle root、难度、奖励和无效状态拒绝。它也刻意暴露了缺失的部分——开放节点发现、分叉选择、去中心化写入和经济价值。正因为这条边界清楚，它比把“区块链”当成不可篡改魔法的演示更有教学价值。
