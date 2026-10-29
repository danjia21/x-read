---
title: "Waymo’s 10 AI Lessons from 200+ Million Autonomous Miles (Annotated)"
source_title: "10 AI Lessons from Driving 200+ Million Fully Autonomous Miles"
source_url: "https://waymo.com/blog/2026/08/10ailessons/"
source_language: "en"
entry_language: "en"
published: "2026-08-26"
read_date: "2026-10-05"
authors:
  - "Srikanth Thirumalai"
topics:
  - "Autonomous Driving"
  - "AI Safety"
  - "Multimodal Models"
tags:
  - "waymo"
  - "autonomous-vehicles"
  - "closed-loop-simulation"
  - "sensor-fusion"
  - "vision-language-models"
---

# 10 AI Lessons from Driving 200+ Million Fully Autonomous Miles

> [!NOTE]
> **Reading guide | Architecture lessons versus evidence**
>
> The essential background is the SAE distinction between L2 driver assistance, where a human remains responsible, and L4 automated driving within a bounded operational design domain (ODD). Waymo is describing an L4 production stack, not a general recipe for unconstrained autonomy.
>
> **Central thesis:** safe deployment at fleet scale comes from a deliberately redundant system—multimodal sensing and maps, a small number of high-capacity learned models, independent trajectory validation, closed-loop simulation, automated evaluation, governance, and a real-world data flywheel—rather than from a single end-to-end model.
>
> Read the ten lessons in three layers: (1) the online Driver stack in lessons 1–4 and 7; (2) the offline training/evaluation machinery in lessons 5–6 and 9; and (3) deployment governance and experience claims in lessons 8 and 10. The strongest public evidence supports Waymo’s aggregate crash-rate advantage and the existence of its Driver–Simulator–Critic architecture. The precise causal contribution of each architectural choice, the claimed necessity of lidar/maps, and statements such as “no substitute” are Waymo’s conclusions from a proprietary system, not controlled comparisons published here.
>
> Keep one question in view: **which lessons are universal safety principles, and which are contingent on Waymo’s ODD, hardware, data, and organizational scale?**

![Waymo vehicle driving on a public road](https://lh3.googleusercontent.com/v_WTrt44FJl9OY1Abmur0c0_PNSo7lRq_6RJmrN0qzlyhHzr23VACBZmpIZ83tmo8InRzoRtPecMDiQH3vE3kt57OaI1VVPwbn7u)

August 26, 2026

Technology

Srikanth Thirumalai

Much of the autonomous vehicle (AV) space is uncharted territory. However, at Waymo, with more than 200 million miles driven fully autonomously, we’re one of very few companies that can look to our past to illuminate our future. Our experience has led us to ten fundamental truths that shape how we build AI.

These truths are validated by our [safety data](https://waymo.com/safety/), which shows the Waymo Driver is already making roads safer in the cities where we serve. More than safety being the output, safety is the reason for each insight.

Let’s dive into what we’ve learned, starting with the two most heavily debated topics in AV history.

> [!NOTE]
> **Annotation | What the mileage and safety data establish**
>
> Fully autonomous miles are exposure, not by themselves proof of safety. Waymo’s public safety page reports substantially fewer serious-injury, airbag-deployment, and injury-causing crashes than a human-driver benchmark over matched operating cities. That supports a fleet-level safety advantage within the evaluated ODD; it does not isolate which of the ten design choices caused the advantage, nor does it establish performance outside those locations and conditions. The article’s 200M-mile figure is also a company-reported cumulative measure. See [Waymo’s safety data and methodology links](https://waymo.com/safety/).

## 1. Multimodal sensors are indispensable

Cameras are incredible, but they aren't enough. For years, there’s been a debate over whether cameras alone could solve full autonomy. Now, after more than 200 million real-world miles, the data is clear: safe, fully autonomous operations at scale require more. By combining inputs from cameras, lidar, and radar, the Waymo Driver creates a rich, redundant world view that no single sensor can replicate.

In addition to redundancy, each sensor brings complementary sensing strengths that bolster safety.

- Lidar provides the wireframe, capturing 3D geometry with millimeter precision.

- Cameras provide the semantic overlay with their ability to read street signs and detect colors of traffic lights.

- Radar serves as a dynamic sentinel, tracking velocity and "seeing" through what obscures cameras, like heavy rain, fog, or dust.

> [!NOTE]
> **Annotation | Complementarity is clear; indispensability is not proven here**
>
> The engineering argument has two parts: heterogeneous sensors fail differently, and their measurements constrain different latent variables—appearance, geometry, and radial velocity. That is a strong rationale for redundancy and graceful degradation. But “indispensable” is stronger than the evidence shown: the article provides no camera-only ablation, matched ODD comparison, or risk curve. “Millimeter precision” describes lidar ranging under suitable conditions, not guaranteed scene-level localization accuracy after calibration, motion, reflectance, occlusion, and weather effects.

## 2. HD maps are a powerful “prior”

This brings us to the second great AV debate—to map or not to map. At Waymo, we use high-definition (HD) maps to jump-start our validation process, so we can provide a fully autonomous service to riders from our first trip. As we drive, we treat our maps as another input—like our sensors, but acting as a mental memory. It is there as an additional source of information, proving incredibly helpful in poor visibility and complex thoroughfares.

This allows the onboard computer to dedicate its real-time processing power to what is dynamic or new, such as a sudden detour or a temporary stop sign. Our AI-driven mapping system ensures these maps are continuously updated, providing the vehicle with a reliable, high-fidelity reference to lean on during complex maneuvers.

> [!NOTE]
> **Annotation | A prior must remain defeasible**
>
> “Prior” is the useful technical framing: a map narrows hypotheses about static geometry and traffic semantics, while live perception supplies likelihood-like evidence about the current scene. Safety depends on detecting map staleness and letting current observations override the prior. The passage states continuous updating but gives no update latency, confidence calibration, conflict-resolution policy, or degraded-mode behavior—precisely the quantities needed to evaluate construction zones and temporary traffic control.

## 3. Fewer, larger models are better

In the early days of AV development, the industry relied on specialized modules. For example, one for pedestrian detection, another for car tracking, another to tell when a light turns green. While agile, this modular spaghetti becomes unmaintainable at scale.

By consolidating to fewer, high-capacity, specialized foundation models, we are better able to leverage the power of vast datasets and large-scale computation. This strategy lets the data, rather than brittle human priors, determine what is relevant, allowing models with sufficient capacity to develop complex reasoning capabilities.

This less-is-more approach allows us to benefit from the same scaling laws that have propelled breakthroughs in large language models, using efficient teacher-student models to optimize onboard compute. However, while fewer models are better, that does not mean we’re consolidating our processing into a single, black box.

> [!NOTE]
> **Annotation | Consolidation is an interface choice, not the removal of structure**
>
> Waymo’s longer architecture description says its foundation model shares learned embeddings and end-to-end gradients while still materializing objects, semantic attributes, road-graph elements, and separate teacher/student variants. “Fewer models” therefore means fewer independently optimized silos, not one monolith. The analogy to LLM scaling laws is plausible but not demonstrated with loss-versus-compute curves or AV-specific scaling exponents here. See [Waymo’s detailed Driver–Simulator–Critic description](https://waymo.com/blog/2025/12/demonstrably-safe-ai-for-autonomous-driving/).

## 4. You can’t build trust with a black box

AI is powerful, but it isn't magic. Pure end-to-end (E2E) neural architectures, where a model takes in raw pixels and directly outputs steering commands, run the risk of black box failures. That means, it's hard to understand how decision making happens in full E2E systems. While Waymo’s system transforms sensors into driving decisions in real time, we’ve added an independent onboard validation layer. This architectural choice is non-negotiable for safely scaling at L4.

This is a separate, AI-based safety system that monitors every trajectory proposed by the Waymo Driver. It checks these plans against hard physics-based constraints and traffic laws by incorporating techniques like Reinforcement Learning and reasoning inspired by Generative AI. If the AI proposes a path that violates a limit or risks a collision, the validation layer acts as a hard backstop.

> [!NOTE]
> **Annotation | Independence and coverage matter more than interpretability rhetoric**
>
> A runtime safety monitor can bound outputs even when the proposer is hard to interpret, but only for hazards expressible in the monitor’s state, prediction horizon, and constraints. Calling it “independent” raises concrete assurance questions: Does it share sensors, learned representations, training data, or failure modes with the planner? Are traffic-law checks deterministic, probabilistic, or learned? The passage does not answer these. Also, an AI-based validator is not literally a hard backstop unless its own uncertainty and common-mode failures are controlled.

## 5. Closed-loop simulation reveals more edge cases

If you want to train an AI to safely handle highly dynamic, rare scenarios — like a vehicle suddenly cutting three lanes of traffic on a freeway — it's really difficult to test in the real world. Simulation allows us to test, validate, and improve our performance for the everyday and the one in a million events we navigate on a weekly basis.

However, we’ve learned that simply replaying recorded data, known as open-loop simulation, is insufficient because it’s like stepping into a video replay – the surrounding traffic moves, but it’s completely indifferent to your actions.

Large-scale, [closed-loop simulation](https://waymo.com/blog/2026/02/the-waymo-world-model-a-new-frontier-for-autonomous-driving-simulation/) is critical. It provides the most realistic assessment by mimicking real-world cause and effect. In a closed loop, if the Waymo Driver swerves or brakes to avoid that aggressive lane change, the surrounding traffic will react naturally to its actions. This creates a feedback loop, which is essential for understanding complex interactions and for unlocking powerful techniques like Reinforcement Learning.

It’s impossible to find every edge case on the road, so a closed-loop simulation allows us to discover and test some of the rarest events before we encounter them on the road.

> [!NOTE]
> **Annotation | Closed-loop fixes policy coupling, not the sim-to-real gap**
>
> Open-loop replay cannot measure how an ego policy changes other agents or drives the scene off the logged trajectory. Closed-loop simulation restores that causal coupling. Its validity then depends on behavior-model realism, sensor generation, map/physics fidelity, and uncertainty under counterfactual actions. Waymo’s linked world-model post demonstrates controllable camera/lidar generation and interactive rollouts, but it publishes no calibrated rare-event frequency, closed-loop divergence metric, or evidence that generated extreme events have realistic conditional probabilities. Use simulation to find failures and compare policies—not as an unqualified estimate of real-world risk.

## 6. Every great driver needs a great Critic

We all dislike back seat drivers, but what if we engineered a helpful one? At Waymo, we built an AI critic to analyze, understand, and detect undesirable driving behaviors both in simulation and on the road. The Waymo Critic allows for a continuous, automated feedback loop that examines the millions of road miles traveled each week (and tens of billions in simulation), allowing our human engineering talent to focus on the most complex edge cases.

Without a robust and discerning Critic, the Driver risks "grading its own homework."

The Critic is tuned to catch a range of driving behaviors, from safety and traffic law compliance to how smoothly the car progresses through a turn or how comfortable the braking feels. By combining this powerful Critic with our calibrated driving data, we can precisely measure the Driver’s quality in any scenario.

> [!NOTE]
> **Annotation | The Critic is an evaluator and a data-selection policy**
>
> At fleet scale, the Critic determines which events receive human attention, enter training sets, or become regression tests. Its false negatives can hide unsafe behavior; its false positives can distort the training distribution; and optimizing against it can induce reward hacking. “Precisely measure … in any scenario” is therefore an aspiration, not a result established here. Useful disclosure would include label provenance, calibration by scenario, human-agreement rates, held-out failure discovery, and safeguards against Driver–Critic co-adaptation.

## 7. Vision Language Models improve scene reasoning

Driving requires complex, chain-of-thought reasoning. When a car encounters a police officer using hand signals at the site of a collision, the Driver must understand the intent of those signals within the context of the surrounding scene. This is where Vision-Language Models (in our case, trained with Gemini) become crucial reasoning partners. They provide high-level semantic "hints" to the Driver, helping it navigate situations that are far outside its standard training data.

Our experience shows that while Vision-Language Models (VLMs) excel at high-level reasoning, they are too slow for real-time control and lack sufficient spatial awareness on their own. To bridge this gap, our system adopts a "thinking fast and slow" architecture. It relies on rapid, intuitive processing and sensor fusion for instantaneous, real-time control (thinking fast), while leveraging VLMs for deep, deliberative reasoning (thinking slow).

This dual approach allows the [Waymo Foundation Model](https://waymo.com/blog/2025/12/demonstrably-safe-ai-for-autonomous-driving/) to perceive the world with high fidelity across diverse sensor inputs while simultaneously navigating complex, long-tail scenarios and anticipating future developments.

> [!NOTE]
> **Annotation | Semantic hints are safer than direct high-rate control only if influence is bounded**
>
> Waymo’s detailed post says the Driving VLM consumes camera data, is trained with Gemini and Waymo driving tasks, and feeds a world decoder alongside the sensor-fusion encoder. The useful division is latency and representation: a fast geometric/control path handles immediate dynamics, while a slower model supplies semantic context. “Chain-of-thought” should not be read as evidence of a faithful verbal reasoning trace. The safety-critical questions are the hint interface, timing, confidence gating, contradiction handling, and whether the independent validator can reject a semantically plausible but spatially unsafe proposal.

## 8. Our holistic approach shows AI is only as effective as the governance that evaluates it

Most people think that when you’ve built an autonomous Driver, your work is done. Simply “develop and go” misses the bigger picture. True scalability is only possible if driving, simulation, and evaluation are created with a safety governance to determine their readiness. Our entire strategy is built on this holistic premise.

At the heart of our readiness framework is a rigorous, quantitative data engine composed of multiple complementary evaluation methodologies. We augment this empirical core with expert human judgment and proper safety governance — ensuring every deployment decision is grounded in proven metrics.

> [!NOTE]
> **Annotation | Governance is the decision procedure above the metrics**
>
> Multiple metrics do not automatically yield a release decision. A credible readiness case needs explicit acceptance thresholds, uncertainty intervals, scenario coverage, regression policy, authority to block deployment, change control, and post-deployment monitoring. Waymo’s public materials support the existence of a safety framework, but this article does not expose the thresholds or audit trail needed to independently verify “every deployment decision.”

## 9. A data flywheel enables continuous improvement

A core pillar of our Waymo Values is to always be learning. The Waymo Driver is constantly getting better over time thanks to our automated data flywheel—a virtuous cycle of continuous improvement that accelerates our ability to scale.

Driving millions of miles a week, we leverage our automated systems, including our Critic and feedback from riders and communities, to highlight opportunities for refinement. We extract and examine the relevant data, use advanced auto-labelers to categorize it, retrain our models, and validate it through simulation, and then our safety framework. Operationalizing this cycle across exabytes of data is what allows an L4 system to systematically address the long tail of driving scenarios.

> [!NOTE]
> **Annotation | More data helps only through selective coverage and regression control**
>
> The flywheel is not raw mileage → automatic improvement. It is event mining → labeling → training → counterfactual/regression evaluation → governed release. Its effectiveness depends on whether selection finds novel and safety-relevant cases rather than frequent easy ones, and whether gains transfer without regressions elsewhere. Exabyte scale is an infrastructure claim; the article gives no learning curve tying storage volume or autonomous mileage to a defined quality metric.

## 10. There is no substitute for fully autonomous experience

The final lesson is that there is no substitute for actual fully autonomous miles. Simply improving a driver-assist system (L2) for full autonomy is a false summit. True L4 maturity can only be safely achieved by a purpose-built system, validated on closed courses and hardened by the uncompromising experience of driving without a human in the car.

You can run billions of miles in simulation or with human supervision, but an AV system only truly matures when it is solely responsible for the driving task. Full autonomy exposes the system to the true gravity of its decisions and reveals novel situations that humans or simulations might unconsciously smooth over.

> [!NOTE]
> **Annotation | A defensible distribution-shift claim, stated too absolutely**
>
> L2 and L4 generate different data because human intervention, supervision, and operational constraints alter the encountered state distribution. Uncrewed L4 operation therefore reveals system-level failures that supervised data can mask. But real-world autonomous miles are neither necessary for every verification question nor sufficient for rare catastrophic-risk estimation; simulation, formal/runtime constraints, closed-course tests, and human-factors evidence remain complementary. The stronger universal lesson is that evidence must match the deployed responsibility model and ODD.

## The Road Ahead

As we look toward the billions of miles ahead, these ten lessons remind us that safety is the direct result of rigorous, real-world experience. While these highlights only scratch the surface of what we’ve learned operating at scale, you can take a deeper look at our specific AI approach in this [blog post](https://waymo.com/blog/2025/12/demonstrably-safe-ai-for-autonomous-driving/).

If you want to help reshape the frontier of machine intelligence, see our [job openings](https://careers.withwaymo.com/early-careers). Join us!

> [!NOTE]
> **Takeaway | What transfers beyond Waymo**
>
> The most transferable pattern is not any single sensor or model family. It is the separation of roles and evidence: a capable proposer, an independently motivated validator, a closed-loop environment for counterfactual testing, a critic that converts fleet experience into targeted datasets, and governance that controls release. The article is valuable as an architectural position statement. It is not an ablation study, a complete safety case, or proof that each Waymo-specific implementation choice is necessary for every L4 system.
