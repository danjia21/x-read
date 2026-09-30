---
title: "Hacking OpenAI: libheif RCE, SSO Pivot, and AI-Assisted Exploit Development (Annotated)"
source_title: "Hacking OpenAI"
source_url: "https://www.hacktron.ai/blog/hacking-openai"
source_language: "en"
entry_language: "en"
published: "2026-09-13"
read_date: "2026-09-29"
authors:
  - "Harsh Jaiswal"
  - "Mohan Pedhapati"
  - "Rahul Maini"
topics:
  - "Software Security"
  - "AI Agents"
tags:
  - "libheif"
  - "memory-corruption"
  - "single-sign-on"
  - "discourse"
  - "ai-assisted-security-research"
---

# Hacking OpenAI

A heap overflow and SSO misconfiguration to compromise OpenAI internal repositories

> [!NOTE]
> **Reading note | Source and evidence boundary**
>
> This entry preserves the complete substantive article as retrieved on 2026-09-29, excluding navigation, subscription controls, and the promotional footer. The exploit narrative, OpenAI account access, internal-repository access, model performance, cost, and detection claims are the authors’ first-hand report; the public sources linked below independently establish the Discourse advisory, affected dependency path, upstream code change, Debian update, sandboxing change, and patch guidance, but do not independently disclose every OpenAI-specific detail. [Original article](https://www.hacktron.ai/blog/hacking-openai)

## Intro

On July 25, 2026, we chained two critical vulnerabilities to compromise multiple OpenAI employees’ ChatGPT accounts. With these accounts, we could then access internal OpenAI repositories, and potentially many other connectors.

To prove we had in fact gained the access we believed without allowing ourselves to learn any sensitive information, we used the employee’s Codex to open a PR #1186742 in OpenAI’s internal monorepo `openai/openai`.

Exploit chain

1. libheif Image decoder
2. Debian Missing security backport
3. ImageMagick Uses libheif
4. Discourse Image uploads
5. OpenAI forum community.openai.com
6. OpenAI SSO Identity flaw
7. ChatGPT / Codex Account access
8. GitHub Connected integration
9. Internal repos OpenAI

Exploit timeline

1. 23 Jul Found the bug We traced Discourse’s HEIF upload path through ImageMagick to libheif and found the heap overflow.
2. 24 Jul First working exploit Opus 4.8 got code execution working with ASLR disabled.
3. 25 Jul · 06:00 UTC Reliable local RCE Opus 5 turned it into a working image-upload exploit with ASLR on.
4. 25 Jul · 10:00 UTC RCE on community.openai.com The exploit worked against our Discourse Cloud instance, then OpenAI’s forum.
5. 25 Jul · 13:30–15:30 UTC Opened the proof-of-access PR We used an employee’s Codex account to open a harmless PR in OpenAI’s internal monorepo, then stopped testing.

Until two months ago, any user or OpenAI employee logging into OpenAI’s own help forum ([community.openai.com](https://community.openai.com)) could have had their ChatGPT and Codex accounts taken over. Since people can connect various services to Codex and ChatGPT, the scope of what we could theoretically access was huge, including GitHub, Slack and emails.

The entire timeline from initial discovery to access to OpenAI repo access took place in less than 72 hours.

We immediately reported the initial vulnerability to OpenAI and Discourse and worked with them to coordinate the patch. We appreciate their attention to detail and fast resolution of this issue. OpenAI also paid us a **$6,500** bounty.

We provide a full timeline of the disclosure process here. The rest of the post details how we discovered the two vulnerabilities, how we used claude models, as well as our takeaways from this experience.

1. **25 July 2026, 05:00–06:00 UTC — Initial Finding**

   HacktronAI team obtained remote code execution (RCE) and administrative access to the Discourse environment hosted at `community.openai.com`.

2. **25 July 2026, 08:00–10:00 UTC — Bugcrowd Submission**

   After confirming the cross-product impact, the team coordinated internally on the responsible disclosure process and submitted a report through OpenAI’s Bug Bounty Program on Bugcrowd.

3. **25 July 2026, 13:30–15:30 UTC — OpenAI Employee Account Access & Proof of Concept**

   To demonstrate the practical impact of the vulnerability, we created a harmless proof-of-concept pull request in OpenAI’s internal monorepo (link redacted at OpenAI’s request). We updated the existing Bugcrowd submission with these findings, reached out to friends at OpenAI on Twitter/X to notify them directly, and ceased all further testing at approximately **15:30 UTC**.

4. **25 July 2026, 22:49:45 UTC — OpenAI-Side Fix Confirmed**

   OpenAI replied to the report confirming the issue had been fixed, roughly 14 hours after the initial submission.

5. **25 July 2026 — Discourse Reported via HackerOne**

   We submitted a report to Discourse through its HackerOne program.

6. **26 July 2026 — Discourse Responded**

   Discourse replied to the report on Sunday.

7. **27 July 2026 — Discourse Fix Ready**

   Discourse had a fix ready by Monday and added image-processing sandboxing as defense in depth.

8. **28 July 2026 — Discourse Advisory Published**

   Discourse published [GHSA-vhm9-85gw-x335](https://github.com/discourse/discourse/security/advisories/GHSA-vhm9-85gw-x335) with patch and rebuild guidance.

9. **01 Sep 2026 — OpenAI Rewarded $6,500 Bounty and Marked Resolved**

   OpenAI comment — To clarify the scope of that award: testing against the Discourse-hosted community.openai.com was explicitly excluded from our bug bounty program. The award recognizes the OpenAI-side finding, not the actions against Discourse.

> [!NOTE]
> **Annotation | Three trust boundaries**
>
> The decisive composition is: unsafe media parsing yields code execution in the forum; the compromised forum’s SSO position yields identity/session access; connected tools then turn that identity into downstream authority. None of the public dependency advisories alone demonstrates the latter two steps. The bounty, account takeover, and internal PR therefore remain attributable to Hacktron’s report, while Discourse’s advisory independently confirms critical unauthenticated RCE through malicious uploads. [Discourse advisory](https://github.com/discourse/discourse/security/advisories/GHSA-vhm9-85gw-x335)

## Background

A few months ago, our team at Hacktron, led by Harsh Jaiswal alongside Mohan Pedhapati and Rahul Maini, began researching frontier AI companies to find security vulnerabilities. This led us to discover an SSO misconfiguration in OpenAI’s identity infrastructure and a `libheif` RCE in the community forum used by OpenAI.

We’ve since expanded the research into [HEIF Heist](https://heif-heist.com), a multi-month investigation tracing `libheif` across Slack, Meta, GitHub Enterprise, Ruby on Rails, and Node.js frameworks such as Next.js, Astro, and Gatsby. A [surprising amount](https://xkcd.com/2347/) of widely-used software depends on this one image-processing library.

![xkcd 2347](https://www.hacktron.ai/_astro/DlrLdX-c_ZAKAfc.webp)

If your application processes user-controlled images and accepts .heic/.heif/.avif images, it is highly likely it is affected. Please reach out to us at **hello@hacktron.ai** if you need any kind of assistance.

> [!NOTE]
> **Annotation | Exposure is deployment-specific**
>
> Exposure depends on decoder versions and backports, whether these formats reach `libheif`, and the containment around conversion. Accepting HEIF/AVIF is an inventory signal, not proof that every deployment shares this exact overflow or is exploitable.

## Hacking community.openai.com

**Warning**

**Patch notice:** If you self-host Discourse, rebuild your installation now. Older Docker images may contain a vulnerable `libheif` dependency that permits code execution through an image upload. Run `git pull` followed by `./launcher rebuild app` from `/var/discourse`; a web-interface update alone may not replace the underlying image. Discourse-hosted customers have already been patched. See the [security advisory](https://github.com/discourse/discourse/security/advisories/GHSA-vhm9-85gw-x335).

OpenAI uses Discourse for their forum and allows “Sign in with OpenAI” through `auth.openai.com`. After getting a good understanding of OpenAI’s services and infrastructure, we had reason to believe that compromising the forum could create a path into broader OpenAI services through this identity flow. To test that hypothesis, we first needed remote code execution on an OpenAI service like the Discourse community forum.

While the Discourse app itself is actually not an easy target (we have looked into it in the past), we thought we could go after a dependency.

### Heap buffer overflow in libheif

On July 23, we started reviewing Discourse’s image-upload pipeline, and we found that HEIC and HEIF files followed an unusual path. Discourse normally used FastImage for image checks, but because FastImage did not support HEIF, it passed those files to ImageMagick’s `magick` command for conversion.[^2] That exposed the underlying `libheif` parser directly to attacker-controlled files.

We started an Opus 4.8 session with the Discourse Docker image and asked it to inspect the installed `libheif` package for security issues. After a while, it found that some particular security fixes were not back-ported to the libheif package. This allowed an heap buffer overflow leading to OOB R/W primitives during HEIC decoding.

Interestingly, the vulnerable code had been changed upstream the previous year, but the commit was not documented as a security fix and received no CVE.[^3] This might be a reason why Debian 12 and 13 have not received the security relevant backports in time. Because Discourse’s Docker image was based on Debian 12, it installed the vulnerable `libheif` version 1.19.7. Even Debian 13 still shipped the vulnerable version 1.19.8 at the time. Since then, Debian has published its security update for Debian 13 on August 8, 2026.[^4]

On July 24, we used Opus 4.8 to develop a working ImageMagick/`libheif` code-execution exploit with ASLR disabled. We then launched several separate sessions to make it reliable against Discourse’s default configuration with ASLR enabled, which wasn’t fruitful.

> [!NOTE]
> **Annotation | Silent fixes create a downstream classification gap**
>
> The upstream patch changes overlap-area arithmetic and mentions avoiding integer overflows, but was presented as a simplification rather than a security advisory. That is consistent with the missed-backport explanation, though it does not alone prove exploitability. Debian’s later DSA classifies `libheif` issues as capable of denial of service or arbitrary code execution. [Upstream commit](https://github.com/strukturag/libheif/commit/85e21ad44eba931314337300a2376b8d28f085ae); [Debian DSA-6417-1](https://lists.debian.org/debian-security-announce/2026/msg00328.html)

### Opus 5 Released

That evening, Anthropic released Claude Opus 5.[^5]We started a new session, which first produced a working ARM64 exploit for a local Mac within 3 hours. We then asked it to port the exploit to the x86-64 environment and `jemalloc` configuration used by Discourse.

By 6:00 a.m. on July 25, we had confirmed local RCE through an image upload. We then placed Claude in an autonomous `/goal` loop against our own Discourse Cloud instance, proxied through `rce.ee/ctf-forum` to make it look like a CTF target as Opus refused write exploit for remote instances.

When we checked again at 10:00 a.m., the agent had achieved RCE on Discourse Cloud and demonstrated access by reading `/etc/hosts`. Using the generated exploit script, we managed to get RCE on OpenAI’s instance.

After we had confirmed our hypothesis of no interaction account takeover of ChatGPT/Codex accounts from active members of the forum, we immediately sent our report to OpenAI. We then took over an OpenAI employee’s account, whose Codex was connected to OpenAI’s Github organization. To demonstrate impact without actually accessing any internal code, we sent a prompt to this employee’s Codex account to open a PR for us in OpenAI’s internal monorepo. Then we stopped any further testing.

![Redacted pull request demonstrating access to OpenAI’s internal monorepo](https://www.hacktron.ai/_astro/kQ1s5GLp_Z1EcfJK.webp)

We updated the BugCrowd submission with the impact proof and alerted OpenAI security. We also prepared a report for Discourse and reported it to their HackerOne program. Discourse received the report on a Saturday, replied on Sunday, and had a fix by Monday (kudos for speed). They also [immediately started sandboxing](https://github.com/discourse/discourse/commit/a07188016987de1613c961277e2e928aaa7c37ec) ImageMagick.

We want to emphasize that the vulnerability to escalate is not Discourse-specific. It is an OpenAI SSO issue that turned the forum compromise into access to ChatGPT and Codex. If any first-party or third-party OpenAI service using the OpenAI SSO was compromised, it would lead to same access - Discourse was merely one way of proofing it.

> [!NOTE]
> **Annotation | Consequential agent work, but not an autonomous baseline**
>
> Humans selected the target, supplied the container and hypotheses, split work across sessions, adapted prompts, arranged a controlled endpoint, validated results, and decided disclosure limits. The model reportedly performed difficult discovery and exploit-porting work inside that scaffold. This is strong evidence of capability amplification in one campaign, not a controlled model comparison or a general autonomous success rate. The public Discourse commit independently confirms that ImageMagick was moved behind `bubblewrap` sandboxing. [Sandboxing commit](https://github.com/discourse/discourse/commit/a07188016987de1613c961277e2e928aaa7c37ec)

## Costs of finding these vulnerabilities

The Discourse and OpenAI hack took a few days for an agent, and just a few hours of human time. The whole [HEIF Heist](https://heif-heist.com) research project going after Slack, Meta, adn more took two-months, cost less than $3,000 in tokens in total, and was conducted by three researchers. Adapting the exploit to each new company usually took only one or two days.

We observed that every new model is getting increasingly capable, as evident by the Discourse exploit presented in this report. Opus 4.8 struggled across several sessions to produce a working exploit with ASLR enabled. Within hours of Opus 5’s release, we gave it the same problem and it succeeded. Across the broader campaign, we saw another clear jump from Opus 5 to GPT-5.6 Sol, when we had to exploit the vulnerability without knowing anything about the target system besides that it’s vulnerable.

For each target, testing began with an image upload. From there, we turned memory corruption into a reliable memory leak or shell, usually without knowing the exact `libheif` version, libc version, or deployment environment. The AI started almost blind and adapted the exploit for each company within one or two days. We are not aware of any company that detected the activity except Shopify, even after thousands of images were sent and their image processors repeatedly crashed.

When code execution landed inside a sandbox or restricted environment, the models also helped with privilege escalation, lateral movement, and bypassing existing defenses. This was not completly autonomous hacking, and skilled human guidance remained important, but the amount of work a small team could perform increased dramatically.

> [!NOTE]
> **Annotation | Cost and capability claims need denominators**
>
> “Less than $3,000,” “one or two days,” and “not detected” are operational observations, not benchmark metrics. Reproducible comparisons require model/version pinning, traces, human-hours accounting, target complexity, failed attempts, and detection telemetry. “We are not aware” measures what researchers learned, not necessarily what defenders logged.

## Epilogue

Software has long benefited from a kind of security through complexity. The code and even the vulnerability could be public, but turning a bug into a reliable exploit still required rare expertise, significant time, and knowledge of the target environment. Known memory corruption vulnerabilities were expensive to operationalize, while zero-days were mostly reserved for the highest-value targets.

This was never a real security boundary, but it protected ordinary companies in practice from software vulnerabilities. AI is removing that protection by turning more of this scarce expertise into compute. Work that once required a well-resourced team and months of effort can now be compressed into days.

Security assumptions must catch up with attacker capabilities. A realistic threat model should take into account the economics of exploitation today, instead of relying on outdated assumptions[^6] about who can carry out sophisticated attacks.

Hacktron’s mission is to help secure the internet by finding and eliminating vulnerabilities in widely trusted software before malicious actors do. We are continuing this research across frontier labs and other internet-critical systems. If you are responsible for securing one of them, we would like to work with you.

> [!NOTE]
> **Annotation | The defensible thesis is economic, not absolute**
>
> The case supports a narrower claim than “AI removes complexity”: capable agents can reduce marginal labor in search, debugging, and target adaptation under expert guidance. That shifts more known-but-unweaponized bugs into an economically exploitable set. Defensive priorities follow: shorter patch latency, parser isolation, constrained identity federation and connector scopes, and alerts on repeated decoder crashes.

## Versions affected and patches

[HEIF Heist](https://heif-heist.com) is not tied to a single version. It targets an entire ecosystem of vulnerabilities across multiple release families (e.g. 1.19.x, 1.20.x, 1.22.x, 1.23.x). Any deployment lacking the latest upstream security patches is potentially vulnerable.

- **Update upstream.** Install the latest security-patched `libheif` and `libde265` packages through your distribution’s security channel or an upstream release. As of September 14, 2026, the latest upstream `libheif` security release is v1.23.4; v1.23.2 has been superseded by further security fixes. Distribution packages may carry backported fixes under an older upstream version number, so check the package security advisory as well.[^7] [^4]
- **Defense in depth.** Given the complexity of the ISO base media file format and the pace of decoder updates, future memory-safety flaws are likely. Production architectures should disable untrusted HEIF/AVIF decoding where it is not needed, or isolate image-processing pipelines inside hardened, ephemeral sandboxes. ImageMagick’s security policy supports restricting accepted formats and resource usage.[^8]

> [!NOTE]
> **Annotation | Patch by advisory state, not version ordering alone**
>
> A distribution can retain an older upstream version while backporting fixes. Conversely, “latest” is time-sensitive. Operators should use their distribution security tracker and verify rebuilt containers actually contain fixed packages; allowlisting, resource limits, sandboxing, and disposable workers reduce the next decoder bug’s blast radius. [libheif v1.23.4](https://github.com/strukturag/libheif/releases/tag/v1.23.4); [ImageMagick security policy](https://imagemagick.org/security-policy/)

## Acknowledgements

We thank Sudanshu Rajhbhar for technical assistance, and Zayne Zhang, Fabian Faessler, Robert Chen, and Jessica Ruan for proofreading, reviewing drafts, and providing feedback that improved this post.

## References

[^1]: [xkcd #2347: Dependency](https://xkcd.com/2347/)
[^2]: [Discourse: Support for HEIC images](https://meta.discourse.org/t/support-for-heic-images/144326)
[^3]: [libheif: simplify overlay overlap area computation](https://github.com/strukturag/libheif/commit/85e21ad44eba931314337300a2376b8d28f085ae)
[^4]: [Debian DSA-6417-1: libheif security update](https://lists.debian.org/debian-security-announce/2026/msg00328.html)
[^5]: [Anthropic: Introducing Claude Opus 5](https://www.anthropic.com/news/claude-opus-5)
[^6]: [RAND: A Playbook for Securing AI Model Weights](https://www.rand.org/pubs/research_briefs/RBA2849-1.html)
[^7]: [libheif v1.23.4 security maintenance release](https://github.com/strukturag/libheif/releases/tag/v1.23.4)
[^8]: [ImageMagick Security Policy](https://imagemagick.org/security-policy/)

> [!NOTE]
> **Takeaways**
>
> 1. The highest-impact failure was compositional: media-parser RCE became identity compromise, then connector and repository authority.
> 2. Unlabeled security fixes are a supply-chain hazard; downstream maintenance needs signals beyond CVE metadata.
> 3. The campaign suggests expert-guided agents can compress exploit engineering, but its model and cost claims are not controlled measurements.
> 4. Parser sandboxing, fast image rebuilds, scoped SSO sessions, connector least privilege, and crash telemetry address different links and belong together.
