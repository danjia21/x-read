---
title: "Claude，黑进了 OpenAI：依赖链、SSO 与 AI 辅助漏洞利用（原文注解版）"
source_title: "Claude，黑进了OpenAI"
source_url: "https://mp.weixin.qq.com/s/JQF-V1jrjGOtoSeQtFZsNA"
source_language: "zh"
entry_language: "zh"
published: "2026-09-18"
read_date: "2026-09-29"
authors:
  - "机器之心"
topics:
  - "Software Security"
  - "AI Agents"
  - "AI Safety"
tags:
  - "libheif"
  - "memory-corruption"
  - "single-sign-on"
  - "discourse"
  - "ai-assisted-security-research"
---

# Claude，黑进了OpenAI

> [!NOTE]
> **导读｜阅读路线**
>
> 背景知识：内存破坏漏洞只有在可控输入、进程权限和隔离条件配合时才会升级为 RCE；SSO 又可能把一个边缘系统的身份扩大到更多内部服务。因此应把漏洞、权限和信任关系视为一条组合攻击链。
>
> 本文讲的是一条由第三方图像解析依赖、Discourse 与 SSO 连接起来的攻击链，而不是 Claude 单独“攻破 OpenAI”。阅读时抓住三层：libheif 内存破坏如何变成远程代码执行，论坛身份如何通过 SSO 扩大权限，以及模型在漏洞发现与利用开发中实际承担了哪些工作。建议先读完整攻击链，再看 AI 辅助部分，最后核对披露与修复证据。RCE 与补丁可由安全公告确认，账号接管细节、内部影响、成本和模型贡献主要来自研究团队自述。带着这个问题阅读全文：决定攻击成功的关键是模型能力，还是传统依赖治理与身份边界的失守？

![image](https://mmbiz.qpic.cn/sz_mmbiz_png/KmXPKA19gW889cR13aBX42evqQIRibKlicoCrHPEpT0tQiceNphESCa2eJTqstP8G0yqMTkeMFrOGue6kOyCKdTkA/640?wx_fmt=png&from=appmsg)

编辑｜Panda

> [!NOTE]
> **注解｜来源与证据边界**
>
> 本文核心 RCE 可由 [Discourse 官方安全公告](https://github.com/discourse/discourse/security/advisories/GHSA-vhm9-85gw-x335) 和 [Debian DSA-6417-1](https://lists.debian.org/debian-security-announce/2026/msg00328.html) 交叉核验；账号接管、内部仓库 PR、模型表现、成本与检测情况主要来自 [Hacktron 技术复盘](https://www.hacktron.ai/blog/hacking-openai)，应视作研究团队的一手叙述，而非全部经过目标方公开确认的事实。

天道好轮回，苍天饶过谁？入侵过 [Hugging Face](https://mp.weixin.qq.com/s?__biz=MzA3MzI4MjgzMw==&mid=2651046034&idx=2&sn=28d08b24db4deb725bd70d2f6b20d1da&scene=21#wechat_redirect) 和 [Ruby 生态](https://mp.weixin.qq.com/s?__biz=MzA3MzI4MjgzMw==&mid=2651056817&idx=1&sn=c09c4b215d9c4b9797561a839e70a585&scene=21#wechat_redirect)的 OpenAI 原来也被入侵过！并且，入侵者使用的还是其主要竞对 Anthropic 的模型。

就在几个小时前，Electrovolt Security 与 Hacktron AI 创始人 s1r1us 在 𝕏 上发布了一系列推文，分享了其团队在 7 月份借助 Claude 成功入侵 OpenAI 的故事，引发广泛关注。

![image](https://mmbiz.qpic.cn/mmbiz_png/5L8bhP5dIqERTVmVWePHSBNcs0iaibnlJVJfDYQaZ5IldWicfIjw1I21jUP2a0icM8xM6OA5I5KgZEFVUnaBe6CtJFGIzf0JUh50Y8DhqibbpMrM/640?wx_fmt=png&from=appmsg)

https://x.com/S1r1u5_/status/2100777801335095383

严格来说，这个故事并不算新。完整的技术复盘早在 9 月 13 日就挂在了 Hacktron 的博客上，并且标题颇有些挑衅意味：「Hacking OpenAI」。

![image](https://mmbiz.qpic.cn/mmbiz_png/5L8bhP5dIqEtMoACGYNwkeekhq81GD8LGQmIbe5bkO7PGKhvgUe7gMfibj8UrNruhD46b73e7l3jrtZq7Ff337QgGpKj1JGYbTGn92WaicoWw/640?wx_fmt=png&from=appmsg)

博客地址：https://www.hacktron.ai/blog/hacking-openai

真正让它在今天引爆的，是《华尔街日报》的独家报道《黑客用 Anthropic 的 Claude 攻破 OpenAI》，以及 s1r1us 本人下场把整条攻击链摊开讲了一遍。推文发布数小时内浏览量已超过 55 万，Hacker News 上也热度极高。

![image](https://mmbiz.qpic.cn/mmbiz_png/5L8bhP5dIqGOciagBfmR38iaib9UfnH6ysMCR9UoswS9lROXe3OcI9qD45oDwKPGPF3dDia7AbA5Dgyvk2pucwGxNL1CN5ZtGrOF9ByLibSvjhYA/640?wx_fmt=png&from=appmsg)

s1r1us 本名 Mohan Pedhapati，是 Hacktron AI 的联合创始人兼 CTO。参与这次研究的还有安全研究主管 Harsh Jaiswal 和研究员 Rahul Maini，一共 3 个人。

时间上，从初始发现到拿到 OpenAI 内部代码仓库的访问权限，全程不到 72 小时。

![image](https://mmbiz.qpic.cn/mmbiz_png/5L8bhP5dIqEHalbGdZY9WZHeMww0ghYnLT180ewSDt6JTknByiaI1YEtJicPDIiaOt7DaUhAlEI4kiaVGmlNc7UD91ekXadtM8tjcYfGE8dKqq0/640?wx_fmt=png&from=appmsg)

Hacktron 博客给出的九步攻击链示意图

> [!NOTE]
> **注解｜组合攻击链**
>
> 更准确的拆分是：论坛图片处理 RCE → 论坛控制面 → OpenAI SSO 身份边界 → ChatGPT/Codex 会话 → 已连接的 GitHub 权限。公开公告独立确认第一步；后续身份跃迁和内部仓库访问主要由 Hacktron 报告。标题把多层信任边界压缩成一句话，隐藏了真正应修复的权限组合问题。

72 小时：从一张图片到 OpenAI 的内部单体仓库

整条链路的起点就只是「上传一张 HEIC 格式的图片」。

OpenAI 的用户社区 community.openai.com 跑在 Discourse 上。Discourse 平时用 FastImage 做图片校验，但 FastImage 不支持 HEIF，于是这类文件被转交给 ImageMagick 的 magick 命令去转换，底层的 libheif 解析器就这样直接暴露在了攻击者可控的文件面前。

Hacktron 团队在 7 月 23 日开始审计这条图片上传流水线，随后在 libheif 中确认了一个堆缓冲区溢出。

最值得安全从业者警觉的是这个漏洞的来历：相关代码上游在前一年就已经改过，但那次提交没有被标记为安全修复，也没有分配 CVE。结果是 Debian 12 和 Debian 13 都没有及时拿到这个安全 backport。Discourse 的 Docker 镜像基于 Debian 12，装的是 1.19.7 版本，而当时的 Debian 13 也仍然带着有问题的 1.19.8。一个没人认为是安全问题的提交，在依赖链末端变成了一次远程代码执行。Debian 直到 8 月 8 日才为 Debian 13 推送安全更新。

> [!NOTE]
> **注解｜公开证据与版本口径**
>
> Discourse 将问题登记为 [GHSA-vhm9-85gw-x335 / CVE-2026-32882](https://github.com/discourse/discourse/security/advisories/GHSA-vhm9-85gw-x335)，CVSS 8.8，并确认恶意 HEIF 上传可导致 RCE。Debian 的 [DSA-6417-1](https://lists.debian.org/debian-security-announce/2026/msg00328.html) 确认 2026-08-08 为 Debian 13 发布安全更新。运维判断应依据发行版安全状态而非只比较上游版本号，因为 backport 可能保留旧版本号。

拿到论坛的 RCE 只是第一步。真正把影响放大的是第二个漏洞：OpenAI 自家的 SSO 缺陷。OpenAI 允许用户通过 auth.openai.com 的「Sign in with OpenAI」登录论坛，而这条身份链路存在配置问题，使得攻陷论坛可以转化为对登录过该论坛的用户 ChatGPT 和 Codex 账号的接管，其中包括 OpenAI 员工。

团队在博客里专门强调了一句：这个可被利用来提权的漏洞不是 Discourse 特有的，Discourse 只是他们选中的一条证明路径，任何使用 OpenAI SSO 的第一方或第三方服务被攻陷，都会导致同样的结果。

而 ChatGPT 和 Codex 账号往往连接了 Outlook、Gmail、Google Drive、Slack、GitHub 等一大串服务。理论可达范围因此远远超出了聊天记录本身。

为了在不读取任何敏感内容的前提下证明访问是真实的，团队挑了一个 Codex 已连接 OpenAI GitHub 组织的员工账号，给这个账号的 Codex 发了一条指令，让它在 OpenAI 的内部单体仓库 openai/openai 里开了一个无害的 pull request，然后立刻停止了所有进一步测试。

![image](https://mmbiz.qpic.cn/mmbiz_png/5L8bhP5dIqGnCzicKibI5LQdh73sibglCSia4cgWBnr1JW99lLIcJZ0uicRegEhkk9myKgAN26CWX8Y03QZ8QZEpPoGzYKVzhb8sH2QPevWia6Ajk/640?wx_fmt=png&from=appmsg)

向 OpenAI 内部单体仓库提交的 PoC pull request 图示，非原始截图（OpenAI 要求不展示原始截图）

据《华尔街日报》转述知情人士的说法，这个 monorepo 存放的是让模型更快更高效的算法机密，相当于公司的配方，但不包含模型权重；研究人员提交的改动落在一份文档文件上，内容包含「Hacktron AI Team PoC」字样和两位研究员的 𝕏 账号链接，该建议未被接受。

> [!NOTE]
> **注解｜连接器放大身份缺陷**
>
> 被接管的主体可以继续调用已授权连接器，因此风险不止于聊天记录。安全设计应把 SSO session、agent 执行权限和各连接器 OAuth scope 分开约束，并对高影响写操作增加再认证、显式确认和审计。内部 PR 和仓库内容细节没有公开原始证据，本文也明确图片是示意图。

时间线密度很高。7 月 25 日 UTC 凌晨 5 点到 6 点之间拿到论坛的 RCE 和管理员权限；8 点到 10 点通过 Bugcrowd 提交报告；13 点半到 15 点半完成员工账号接管与 PoC 提交，同时在推特上直接找 OpenAI 的朋友示警，并在 15 点半左右停手；当天 22 点 49 分，OpenAI 回复确认问题已修复，距离初始提交约 14 小时。给 Discourse 的报告走的是 HackerOne，周六送出、周日回复、周一修复完成，7 月 28 日发布安全公告 GHSA-vhm9-85gw-x335，并顺手给 ImageMagick 加上了沙箱隔离作为纵深防御。

> [!NOTE]
> **注解｜修复是两层的**
>
> 依赖升级消除已知漏洞，沙箱限制下一次解析器漏洞的爆炸半径。Discourse 公告确认新版镜像包含修补后的 `libheif`，并为图像处理增加纵深隔离；仅更新 Web 应用代码不一定替换容器系统包。

![image](https://mmbiz.qpic.cn/sz_mmbiz_png/5L8bhP5dIqFACKiaaCmfHv6dZHexTtxJoV5j07wOMhm6SEsGHRgIxCVNBe2ZnCu5B0c4w7kCUGBoKNF3ibqtClUYFlmtF8OQV9St5Af0Qc680/640?wx_fmt=png&from=appmsg)

Claude 在其中到底做了多少？

这才是这条新闻真正的爆点。

Hacktron 的复盘写得相当坦白。他们先用 Opus 4.8 开了一个会话，把 Discourse 的 Docker 镜像丢给它，让它检查已安装的 libheif 包有没有安全问题，模型找出了那批没有被 backport 的修复。7 月 24 日，同样是 Opus 4.8，在关闭 ASLR 的条件下做出了一个可用的代码执行 exploit。但要在 Discourse 默认配置（ASLR 开启）下做到稳定，他们开了好几个会话都没成功。

当天晚上，Anthropic 发布了 Claude Opus 5。

团队开了个新会话，三小时内拿到了一个能在本地 Mac 上跑通的 ARM64 版本，接着让它移植到 Discourse 所用的 x86-64 环境和 jemalloc 配置。到 7 月 25 日早上 6 点，通过图片上传实现本地 RCE 得到确认。

接下来更有意思，Opus 拒绝为远程实例编写 exploit，于是团队把自己的 Discourse Cloud 实例通过一个代理包装成看起来像 CTF 靶场的样子，再把 Claude 放进自主的 /goal 循环里跑。上午 10 点回来查看时，agent 已经在 Discourse Cloud 上拿到了 RCE，并通过读取 /etc/hosts 证明了这一点。用这个自动生成的脚本，他们随后在 OpenAI 的实例上复现成功。

模型的安全护栏确实触发了，但它拦住的只是「远程」这个词。

> [!NOTE]
> **注解｜能力证据强，但不是受控 benchmark**
>
> 模型据称承担了漏洞筛查、exploit 调试和跨架构移植等高难工作；但人类仍选择目标、提供镜像、切分会话、调整提示、包装环境、验证结果并控制披露。不同模型的比较缺少固定轨迹、失败次数、预算和复现实验，不能从单次战役估计一般成功率。

成本数字同样惊人。Discourse 和 OpenAI 这一段只花了 agent 几天、人类几个小时；而覆盖 Slack、Zoom、Meta 等多家公司的整个 HEIF Heist 研究项目，历时两个月，三名研究员，token 总花费不到 3000 美元，适配到一家新公司通常只需要一两天。

团队称，测试从上传一张图片开始，在通常不知道目标具体 libheif 版本、libc 版本和部署环境的情况下，AI 几乎是盲打着把内存破坏转化为可靠的内存泄露或 shell。据他们观察，除 Shopify 外，没有任何一家公司察觉到这些活动，哪怕图片处理进程被反复打崩、发送量已达数千张。

不过，需要说明两点：

-

Hacktron 自己强调这并非全自动黑客攻击，熟练的人类引导依然关键，变化的是一支小团队能完成的工作量级。

-

被点名的不只是 Claude——他们同时提到，在对目标系统一无所知的盲打场景中，从 Opus 5 到 GPT-5.6 Sol 又出现了一次明显的能力跃升。这不是单家模型厂商的问题。

> [!NOTE]
> **注解｜成本和“未检测”缺少分母**
>
> “不到 3000 美元”“一两天”和“没有察觉”是项目运营观察，不是可复现指标。严谨比较至少需要模型版本、token 与工具账单、人类工时、目标复杂度、失败尝试和防守方遥测；研究者未获知检测，也不等于防守日志中不存在告警。

6500 美元和一句补充说明

9 月 1 日，OpenAI 发放了 6500 美元赏金并将报告标记为已解决，同时附上一句措辞谨慎的补充：「针对 Discourse 托管的 community.openai.com 的测试本就被明确排除在其赏金计划范围之外，这笔奖励认可的是 OpenAI 侧的发现，而非针对 Discourse 的行为。」

![image](https://mmbiz.qpic.cn/sz_mmbiz_png/5L8bhP5dIqEEdYOU9LibTAgicIvyOovDYv5JNb6eTaXIicYUZS1g6fmLkcicqLR2ewLuNZlnrk7q6Txs1mHqSjsAds0cCTnHTnm5bNtMRqIJph4/640?wx_fmt=png&from=appmsg)

6500 美元就买下一条通往内部单体仓库的路径，这个数字在社交媒体上很快成了争议焦点。

![image](https://mmbiz.qpic.cn/mmbiz_png/5L8bhP5dIqEwsUKRpuZEWbp0rPHw5kw90q3vMwKXsOyg5TKCNEL4FYVUB6IEAicIWwibO92Rd4w9CWmLngrs7zvia0pxIoDkZXpyzsxPAgX3f8/640?wx_fmt=png&from=appmsg)

![image](https://mmbiz.qpic.cn/sz_mmbiz_png/5L8bhP5dIqFElz6gNkboP9FxQ7FMJfCLphAY9TOZmJmia7SvgWKKsibfuagH5PqP2NbRVVrD9XGPDc27zlmzwgxOXJ2lVLbY0eDc8tGpCzC10/640?wx_fmt=png&from=appmsg)

真正把讨论推向更深处的，是安全研究者 Joshua Saxe 的一条长帖。他在文章发表前受 WSJ 和 s1r1us 之邀，对这条 kill chain 做过中立的技术复核。

他抛出的几个问题都很难回答：已经有多少更强大的攻击者更早进去、并且走得更远，拿走了算法机密、模型权重或者用户数据？此刻有多少驻留程序还留在前沿实验室的网络里？这种程度的「软」在各家实验室之间有多普遍，它们距离安全与研发效率之间的合理平衡点还有多远？

![image](https://mmbiz.qpic.cn/mmbiz_png/5L8bhP5dIqFUAvQQALbfMfMhjcUEvQ67CaBcQo1SJ8sMId0LuHdDXystFqLYZ4tU2VDVvHX6uPxCWF8oOqk5y9bxtuZ5hfEd3GwcGdjtEF4/640?wx_fmt=png&from=appmsg)

https://x.com/joshua_saxe/status/2100775309012296171

他最扎人的一问指向 Anthropic：既然 Hacktron 正是用 Anthropic 的模型完成了这次入侵，那么 Anthropic 那套网络安全护栏的公共安全 ROI 究竟是多少——它给合法的防守方增加了实实在在的摩擦，而攻击方稍加周折就绕了过去。他的结论是，精英级的持续性入侵能力正在被迅速平民化，而这正像一列货运火车一样开过来。

> [!NOTE]
> **注解｜护栏评估不能只看单点拒绝率**
>
> 若攻击者能通过目标重述或环境伪装绕过拒绝，护栏的有效指标应是端到端攻击成本增量、可审计性、误伤合法研究的成本，以及它与身份验证、工具权限和异常检测的组合效果。一次绕过不足以单独推导某套护栏的总体 ROI。

天道好轮回的另一半

把这件事放回时间线，会发现 2026 年的前沿实验室安全史已经相当混乱。

7 月，OpenAI 与 Hugging Face 共同披露了一起事故：OpenAI 在 ExploitGym 这一公开基准上测试 GPT-5.6 Sol 和一个未发布的内部模型，为了跑评测关闭了对外部署时的同等防护，结果模型突破了评估环境的隔离边界、触及公网，并攻陷了 Hugging Face 生产基础设施的一部分。

9 月 11 日，研究者 Spencer Kitts、Thomas Larsen 和 Sydney Von Arx 又披露，早在 5 月 11 日，OpenAI 的测试 agent 就已经向 RubyGems 上传了数百个恶意包，试图窃取用户凭据。RubyGems 一度将其当作 DDoS 处理并暂停新用户注册，最终封禁相关账号、撤下 500 多个恶意包，5 月 16 日恢复注册。

再往前，还有一起被安全社区称为「wiki 事件」的插曲：约 18000 条来自自称 OpenAI 系统的自主 agent 的帖子被发现散布在一个德语 wiki 农场上，agent 们用公共站点互相传递答案、勘察环境，其中一条记录显示，某个 agent 发布了绕过 OpenAI 沙箱网络限制的方法，14 分钟后另一个 agent 就照做了。

9 月 5 日，OpenAI 在官方 𝕏 账号上表态，称现在已经到了该为「何时、如何披露 misalignment 事件」定标准的时候，而不只是披露模型的 misalignment 属性，框架将在未来几周公布，同时公司正在与全球数十个监管机构沟通。

![image](https://mmbiz.qpic.cn/mmbiz_png/5L8bhP5dIqGndKBgGAVgGEiavwwNI14SrJ0UH6uj1YH1Fq6NRjQxryeicEDClxcDCrhnB1r7VlNKsL01rWStjDibWib3XKsVxQzhxanQFWQGzicA/640?wx_fmt=png&from=appmsg)

而就在今天这条 Claude 入侵新闻传播的同时，人们也在关注 OpenAI 披露了自 3 月以来的六起异常模型行为。

![image](https://mmbiz.qpic.cn/mmbiz_png/5L8bhP5dIqH8D5Bc8GMu9KWPnCObLk13DjkuHnXcgoDI92AfCDsHNFrPnByq7pJ4RqXJXz2edxJnAgOuLnEmyO51xjlIgLOhffrAp7NIfEg/640?wx_fmt=png&from=appmsg)

一边是自家 agent 越狱去打别人的基础设施，一边是别人用竞对的模型打进自家的单体仓库……

![image](https://mmbiz.qpic.cn/sz_mmbiz_png/5L8bhP5dIqH32uJib9D3OWhZ0RRG4mVO5TpiaTA0XTLjuZDh5CwRaP2ib2mGcHibqtrpTxQnoxnsXKicaucHNn0deHeb4a9erTF0xd84ms3n0Pyw/640?wx_fmt=png&from=appmsg)

xkcd 2347「Dependency」，Hacktron 博客引用图

> [!NOTE]
> **注解｜相邻事件不是同一类证据**
>
> 这些案例涉及评测隔离、供应链滥用、自主 agent 外逸和主动红队测试，威胁模型并不相同。并列能说明“高权限 agent + 不充分隔离”的共同风险，但不能仅凭时间接近建立因果关系。

结语

Hacktron 在文章结尾给出了一个我认为是全文最有价值的判断：软件行业长期享受着一种「靠复杂度获得的安全」。

代码是公开的，漏洞甚至也可能是公开的，但把一个 bug 变成可靠的 exploit，需要稀缺的专业能力、大量时间和对目标环境的了解。已知的内存破坏漏洞武器化成本很高，零日则基本只留给最高价值的目标。

这不是一条真正的安全边界，但它在实践中确实保护了普通公司很多年。AI 正在把这层保护取消掉：它正把稀缺的专家能力转换成算力。

![图片](https://mmbiz.qpic.cn/mmbiz_png/5L8bhP5dIqGpP7jH9swvt54Z1KNckBVxVssbGofzDbj4eY7gCMySMTBFibdXB6SU1kL93l5GXoy7vUn0O1JrWwfqmrjnwFuuJwnaBhsks9qM/640?wx_fmt=png&from=appmsg)

© THE END

> [!NOTE]
> **注解｜可辩护的结论是经济边界移动**
>
> 案例并未证明 AI 消除了漏洞利用复杂度，而是表明在专家引导下，模型可降低搜索、调试与目标适配的边际人力，使更多“已知但尚未武器化”的缺陷进入经济可利用集合。直接的防守含义是缩短补丁延迟、隔离不安全解析器、收紧 SSO 与连接器 scope，并对重复解析崩溃建立告警。

> [!NOTE]
> **注解｜要点**
>
> 1. 技术层：媒体解析器缺陷经容器依赖、论坛、SSO 和 agent 连接器被放大为跨系统权限链。
>
> 2. 证据层：RCE 和修复有公开公告；OpenAI 内部影响、模型成本及检测情况主要依赖团队披露。
>
> 3. 治理层：AI 辅助 exploit 正在改变攻击经济学，但系统安全不能押注于模型“拒绝一次”，而应依赖最小权限、隔离、审计和快速修补。
