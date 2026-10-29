---
title: "DeepSeek Harness 桌面版：Agent Harness 到底是什么（原文注解版）"
source_title: "刚刚，DeepSeek Harness桌面版正式发布：告别命令行，打开即用"
source_url: "https://mp.weixin.qq.com/s/60pkkEhbnoNYE15kdEBC_A"
source_language: "zh-CN"
entry_language: "zh-CN"
published: "2026-09-30"
read_date: "2026-10-02"
authors:
  - "CV开发者都爱看的"
topics:
  - "AI Agents"
  - "Agent Infrastructure"
  - "Open Source Software"
tags:
  - "agent-harness"
  - "deepseek-harness"
  - "tool-use"
  - "agent-runtime"
  - "desktop-agent"
---

# 刚刚，DeepSeek Harness桌面版正式发布：告别命令行，打开即用

> [!NOTE]
> **导读｜先把 Harness 说清楚**
>
> 这里的 **harness 不是一种模型，也不是单纯的聊天界面**。这个词原义是“马具 / 线束 / 安全带”：它本身不提供马的力量或电流，却把力量约束、连接并导向可控的工作。放在 AI Agent 里，**agent harness（智能体运行框架）就是包在模型外面的执行与治理层**：它把模型接上系统提示词、上下文、文件、终端、浏览器、MCP/插件等工具，再负责“观察 → 决策 → 调用工具 → 读取结果 → 继续决策”的循环，以及权限、状态、错误恢复、任务调度和可观测性。
>
> 可以用一个简化关系记忆：`Agent 产品 ≈ 模型 + Harness + 工具/环境 + 产品界面`。模型负责推理与生成下一步动作；工具真正改变外部世界；harness 负责把两者安全、持续、可检查地组织起来；桌面 UI 只是人进入这套系统的入口。DeepSeek Harness 是这个通用概念的一种具体实现，不等于“harness”这个类别本身。
>
> 本文主旨是：DeepSeek 把原先需要 Node.js 和命令行启动的开源 Agent harness 封装成桌面产品，并补齐后台任务、插件、多 Agent、文件预览和账户等产品能力。阅读时抓三条线：先看桌面版改变的是**分发与入口**；再看 Release 列表如何补齐**运行时能力**；最后看作者如何从这些功能推导“工具变产品”。最强证据来自 [DeepSeek 官网](https://www.deepseek.com/harness/)和[官方仓库](https://github.com/deepseek-ai/deepseek-harness)；V4.1 Pro、2T 参数模型及二者关系只是第三方消息或猜测，不应与已发布 Harness 的事实混为一谈。
>
> 带着这个问题读全文：如果换掉底层模型，任务仍能靠相同的工具、状态和权限机制继续运行，那么真正构成这个产品持续工作能力的，究竟是模型，还是 harness？

来源丨量子位

编辑丨极市平台

刚刚，DeepSeek Harness更新v0.2预览版，终于把桌面版端上来了。

访问官网deepseek.com/harness，Mac和Windows用户现在都可以直接下载安装。

![image](https://mmbiz.qpic.cn/mmbiz_png/A6fTew8FFGEISUMtMIgDoxaLqtKculrOujwkJTTERZfh8ClwSuQ85ZwqC7tL0zibDFJj1qHxMLrJWk2UJMkHMGuM1pzpibTs1eW7ibWkM5G2pw/640?wx_fmt=png&from=appmsg)

相比此前需要用命令行启动，现在的流程简单了不少。

不仅如此，桌面版上线的同时，Harness本身也刚经历了一轮密集更新。

我翻了一下DeepSeek Harness最近十多天的Release——终端、Office文档预览、文件Diff、Subagent、Agent Team、后台任务、定时任务……该有的全都有了。

现在看来，DeepSeek Harness越来越像一款真正的产品了。

> [!NOTE]
> **注解｜Harness、Agent 与模型的边界**
>
> 一个最小的语言模型 API 通常只做 `输入消息 → 输出 token`；它不会自己访问文件、执行 shell、记住跨会话状态，也不会在失败后自动重试。最小 harness 则至少实现下面的控制循环：
>
> ```text
> 用户目标
>    ↓
> 组装上下文 ─→ 调用模型 ─→ 解析“回答或工具调用”
>    ↑                           ↓
> 持久化状态 ←─ 返回工具结果 ←─ 执行工具 / 环境动作
> ```
>
> 产品级 harness 还会围绕这个循环加入：工具注册与 schema、凭证和权限、工作区隔离、上下文裁剪、任务队列、暂停/恢复、重试、日志/trace、多 Agent 调度、人类确认点与成本控制。因此文中列举的终端、Diff、Subagent、后台任务和定时任务并不是互不相关的功能堆砌，而是 harness 的五类职责：**环境接入、结果审阅、任务委派、生命周期管理、调度**。
>
> “Agent”在行业里有两种常见口径：狭义上是“模型 + 工具 + 循环”形成的行动主体；广义上也指整个可交付产品。为避免混淆，本文可把 DeepSeek 模型看作“决策引擎”，把 DeepSeek Harness 看作“执行操作系统 / 工作台”，把桌面版看作“封装和交互入口”。官方仓库也直接将 DSH 定义为开源的 [agent harness](https://github.com/deepseek-ai/deepseek-harness)，而非新模型。

## Harness桌面版长啥样？

外观上，桌面版和网页版长得不能说是毫无关系，只能说是一模一样。

![image](https://mmbiz.qpic.cn/sz_mmbiz_png/A6fTew8FFGFeVSAevBTH7AsQcg2OgdaaEN70obQ5F42RMAOw43ibxANIu31nOMXlKic3Qv0icVFtGouSh3XjVmoktdoHkaKeZdgunRjEAibR4u0/640?wx_fmt=png&from=appmsg)

而且装下来我感觉，最直接的变化其实就一个：不用先过终端了。

过去想用DeepSeek Harness，得先装好Node.js，再在终端里敲命令启动服务，最后打开浏览器使用。

对开发者来说，这几步当然算不上什么，但对不熟悉命令行的人来说，往往就是 “能不能开始用” 的区别。现在装好之后，先登录，然后开袋即食，拎包入住。

![image](https://mmbiz.qpic.cn/mmbiz_png/A6fTew8FFGHicN4aFAtxmJVdkBwrV1kJvomkHicOWyJGnLtIExgWbCYWkl81wMAlD117txG5KCT2S6SUlDXq83biaiakWfib4JX6XupGBvibPsmiaM/640?wx_fmt=png&from=appmsg)

> [!NOTE]
> **注解｜桌面化没有改变 Harness 的核心，只改变部署边界**
>
> 以前是用户手动准备 Node.js、启动本地服务，再由浏览器连接；桌面版则把 runtime、Web UI、更新机制和系统集成封装到一个安装包。两者背后的 Agent 控制循环可以相同。换言之，`CLI/Web → Electron desktop` 是**交付形态**变化，不是“模型突然获得 Agent 能力”。官方仍保留 `npx @deepseek-ai/dsh web` 的启动方式，见[官方运行说明](https://github.com/deepseek-ai/deepseek-harness#run)。

还有一个比较大的变化就是，设置里多了一个“账号与余额”，可以直接在账户里查看余额和用量、直接充值。

![image](https://mmbiz.qpic.cn/mmbiz_png/A6fTew8FFGGqRc1aicicrbAtoctIg5z0ictxaiauicQE13a3tvhJHGB8bxFEicIfIicBLAdFtlMJZP068XgTomyMY7ZlJ8Qqh1xXoITHfqNmUgtLYM/640?wx_fmt=png&from=appmsg)

此外，DeepSeek自己的账号体系也被直接接进了Harness。

登录后，模型列表里会多出一组“DeepSeek账号”模型，可以直接消耗账户余额跑任务，不需要再单独去开放平台申请API Key。

![image](https://mmbiz.qpic.cn/mmbiz_png/A6fTew8FFGGoEicLVWWtWVmXB8iby5m7aOX2pEHsLTPewFkichYv6licu2yC6a26hVFp1gvMduzWkBvTl5xaQUEuHSXOol7WgdXHJH43wwWsdg0/640?wx_fmt=png&from=appmsg)

> [!NOTE]
> **注解｜模型供应商是可替换依赖**
>
> 把账户、计费和模型 provider 接进 harness，解决的是认证、路由和用量管理。关键架构含义是：模型通常是 harness 的一个可配置后端，而不是 harness 本身。只要不同模型遵守相应消息和工具调用接口，同一套工作区、插件、任务队列与审阅 UI 可以复用；实际效果仍会因模型的 tool-use 可靠性、上下文能力和延迟而变。

技术实现上，Harness桌面版用Electron把原本的Web UI，以及Agent、工具、插件等运行逻辑一起装进了桌面应用。

桌面端和此前的CLI/Web版本共用同一份.dsh数据。因此原来的工作区、历史会话和模型配置，打开客户端还能接着用。

> [!NOTE]
> **注解｜为什么持久化状态属于 Harness**
>
> `.dsh` 数据把会话、工作区和配置从某个 UI 进程中分离出来，使 CLI/Web/桌面端成为同一运行系统的不同入口。这体现了 harness 的另一项核心工作：管理**超出单次模型调用生命周期的状态**。模型 API 本身通常不会替用户保存本地文件树、任务进度、工具授权或跨会话恢复点。

## 最近几次DSH更新了什么？

我翻了一下DeepSeek Harness最近几次密集的Release。从9月22日发布的0.1.7-alpha.1到最新v0.2预览版，大量用户侧体验开始被补齐。

![image](https://mmbiz.qpic.cn/mmbiz_png/A6fTew8FFGEicC9h6tFpgcYoBicMwUEIUPEYEZpk2uYqmcIR3dw9pIe4icN8e8g0UNUa0EFrkkzDCHhbvI58d360oI3SJYWfeYPkusgAoqqCEk/640?wx_fmt=png&from=appmsg)

这一版更新中，会话可以置顶、归档，也支持搜索恢复；

新用户进入后会自动生成默认工作区，不必上来先选一个文件夹；

Agent的工作过程也开始可以控制展示程度，用户可以决定自己到底只想看结果，还是想多看一些中间过程。

与此同时，一些更接近“工作台”的能力也被补了进来。

长任务可以丢到后台继续跑，执行过程还能实时查看；

Excel、CSV、TSV等文件可以直接预览；原本分散的模型配置，也被统一收进“模型提供商”入口。

以及大量的关于“用户怎么管理任务、文件和会话”的内容。

> [!NOTE]
> **注解｜可观测性不是把模型“内心”全部展示出来**
>
> Harness 可以可靠展示的是它掌握的运行轨迹：输入、工具调用、工具返回、文件 Diff、时间、费用和任务状态。所谓“展示 Agent 工作过程”应主要理解为这些可审计事件及模型选择输出的解释，而不是完整、忠实地读取模型内部推理。产品上真正有用的是让用户回答：它调用了什么、改了什么、依据什么、花了多少、能否撤销。

一天之后，0.1.7-rc.1上线。

![image](https://mmbiz.qpic.cn/sz_mmbiz_png/A6fTew8FFGGkyGZAKucssPQFBIicRRpNpDvSguBjyJ29fgbpic0jahbyTIoacEBRpzt1eDn1QdcCGsSSQ4yzSb5OMB5OtjSibWicaicbOAJsxl8I/640?wx_fmt=png&from=appmsg)

这一版的重点主要是往Harness里塞了更完整的Agent能力。

首先是执行环境越来越完整：Web侧边栏直接加入终端；Headless模式可以从标准输入接收任务、继续已有会话；DSH还能本地运行Agent、通过SSH操作远端工作区。

其次是浏览器和Computer Use。

这一轮加入了实验性的Playwright MCP、Chrome DevTools MCP、Stagehand浏览器后端，以及Computer Use，可以通过驱动直接操作本机并获取截图。

第三块则是多Agent和插件系统。

Subagent可以直接在侧边栏打开；Agent Team面板能实时展示成员和任务。插件管理页也已经可以安装、配置、启停，甚至运行时卸载插件。

> [!NOTE]
> **注解｜工具、MCP、Subagent 与 Harness 的关系**
>
> - **工具（tool）**：一个有明确输入/输出的动作，例如读文件、执行命令或点击浏览器。
> - **MCP server**：把一组工具或资源用标准协议暴露给客户端；它扩展 Agent 能接触什么，但一般不负责整个任务循环。
> - **Subagent**：由主 Agent 委派子任务的另一个执行上下文，可能拥有独立提示、工具和上下文窗口。
> - **Harness**：注册并调度这些能力，决定何时把 schema 给模型、如何执行调用、怎样传回结果、怎样隔离权限和记录轨迹。
>
> 所以“装了 MCP”不等于拥有完整 Agent 系统；“能调用工具”也不等于能稳定完成长任务。可靠性常取决于 harness 是否处理超时、幂等、重试、并发、权限、上下文膨胀和失败恢复。DeepSeek 的“一切皆插件”是其具体组合架构，官方说明见[产品页](https://www.deepseek.com/harness/)与[仓库 README](https://github.com/deepseek-ai/deepseek-harness)。

又过了一天，0.1.7-rc.2来了。

这次更新的重点，已经非常地“桌面软件”了。

![image](https://mmbiz.qpic.cn/mmbiz_png/A6fTew8FFGFUmribod5aU7BT0ZoENFkf6yzJLlyrGun1OWOG1fgcgtlDIgLDPXe4snZHOfYaRH1AQlia8EgEHfRvNJNtbobZmvXPKRXnHrUAY/640?wx_fmt=png&from=appmsg)

首次打开Harness时，会出现完整的使用引导，可以选择自己更偏向“办公创作”还是“代码开发”，也可以决定想看到多少Agent的工作过程。

快捷键可以自己改，后台任务继续完善，还加入了定时任务。

现在就算重启应用，之前的任务状态仍然可以保留，把桌面窗口关掉之后，后台任务也能继续跑了。

此外，一些很产品经理的细节也出现了。

包括账号余额刷新、充值提示、登录失效、Windows自动更新、macOS窗口拖动、插件报错、语言切换……

> [!NOTE]
> **注解｜“关闭窗口仍运行”说明前台与执行器已分离**
>
> 长任务若要跨窗口甚至跨重启继续，系统必须把 UI、任务队列、执行进程与持久化状态适当解耦。这里的难点不只是“让模型多想一会儿”，而是任务租约、checkpoint、进程恢复、重复执行防护、凭证有效期和通知机制。这些都是典型 harness/runtime 工程，而非基础模型能力。

总结来看，DeepSeek Harness最近这轮更新大概可以概括成两个方向。

一个是，Agent正在从“一次任务”变成“持续工作”。

加入了非常多关于多任务管理的功能，比如后台任务、任务恢复、定时执行、窗口关闭后继续运行。

另一个变化是，Harness正在从“工具”变成一个“产品”。

毕竟以前更新日志里高频出现的基本都是MCP、Tool、Runtime、Profile这些词。

现在越来越多的是首次启动引导、默认工作区、Office预览、快捷键、账号登录、后台任务等等。这意味也是不言而喻了。

> [!NOTE]
> **注解｜更准确地说：Harness 从开发者框架走向完整产品**
>
> Harness 本来就不是一个单一“工具”，而是承载工具和任务循环的框架。这里真正发生的是产品层补全：
>
> | 层次 | 主要问题 | 文中例子 |
> |---|---|---|
> | 模型层 | 下一步该说什么、做什么 | DeepSeek 或其他 provider 模型 |
> | Harness/runtime 层 | 如何循环、执行、恢复、调度与治理 | Tool、MCP、后台任务、Subagent、SSH |
> | 产品层 | 用户如何安装、理解、检查和付费 | 桌面安装、引导、预览、余额、快捷键 |
>
> 三层会互相影响，但不能混作一件事。强模型在薄弱 harness 中可能因权限、状态或工具错误而失败；优秀 harness 也无法让能力不足的模型凭空解决超出其推理能力的问题。Agent 的实际上限取决于两者的组合。

## One More Thing

Harness这边刚有新动静，DeepSeek下一款模型V4.1 Pro也冒出了更多痕迹。

最近，第三方平台上已经出现了 deepseek-v4.1-pro 的模型条目。

不过上下文、输出长度、发布日期统统未知，Token使用量和用户数都是0。

据The Information报道，前几天，梁文锋在一场闭门投资者会议上透露，DeepSeek目前正在训练一个2万亿参数的大模型，未来甚至还计划继续做到8万亿参数。为了防止内容再次外泄，这场会还要上交手机、电子设备和提包，只留纸和笔做记录。

也不知道这个2T模型是不是V4.1 Pro呢……

> [!NOTE]
> **注解｜与 Harness 主线无关，且证据不足**
>
> 第三方平台的空模型条目不能证明正式发布、规格或身份；闭门会议的转述也不足以确认 2T 模型就是所谓 V4.1 Pro。更重要的是，模型参数规模属于**模型层**，而本文主体讨论的是 **harness/runtime 与产品层**。即使未来替换成更大的模型，工具协议、任务持久化、权限与调度等 harness 问题仍然存在。阅读日可核验的一手材料只支持 DeepSeek Harness 的产品与开源仓库状态，不支持二者之间的猜测性关联。

-

下载地址：https://www.deepseek.com/harness/

-

文档：https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/desktop/README.zh.md

> [!NOTE]
> **总结｜一句话与一个判断框架**
>
> **一句话定义：Harness 是让一个“会预测下一步”的模型，变成一个“能在真实环境中持续、受控、可恢复地做事”的运行与治理系统。**
>
> 以后看到任何“Agent harness”，可以用六个问题判断它是否名副其实：它怎样接模型？怎样注册和执行工具？怎样管理上下文与长期状态？怎样处理权限和高风险动作？怎样恢复失败或后台任务？怎样让人审阅轨迹和结果？若产品只提供聊天框，却没有这些机制，它更接近模型客户端；若这些机制完整，即使 UI 很朴素，它也已经是 harness。
