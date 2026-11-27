# Independent reviews of ReefID

This is the coordinator’s guide for an occasional, whole-project review. Pierre chooses when to commission a
round. Its Linear issue holds the timing, reviewed revision, report destinations and progress.

## Preparing the round

Record one repository commit for the whole round, including reviews dispatched in later batches. Provide neutral
entry points to the learner app and the administrative demo, and say which build they show if it differs from
the commit. Describe ReefID’s purpose briefly: people learn to identify organisms. IMR is one deployment. Other
organisations may use different roles and protocols. An open serious-learning edition for independent learners
is a product direction, distinct from Reef Recall. Make clear which experiences a reviewer can actually try.

Give each reviewer the shared brief, **one** mandate, the project and code links, the relevant access limits and
a place to deliver their report. Keep previous findings, suggested fixes, the coordinator’s examples and other
reviewers’ reports out of the first pass, including from the initial task description. Where the integrator
needs to link Linear, use a spoiler-free brief and keep synthesis material behind a separate link. Reviewers
choose their questions, sources, methods and report structure.

## Shared brief

Briefly explore ReefID from your assigned perspective. Choose the questions and methods that matter, research
relevant external work, and compare it with what you observe. You may question the framing of the problem and
any existing choice, including a foundational one. If another approach would better serve the project, develop
it, even if it means removing something or rebuilding it entirely. Follow important leads across disciplines.
Explain what you would keep or change, why, and where the evidence leaves you uncertain.

Cite the sources and the project observations behind claims that could change a decision. Use evidence suited to
the question, whether that is a research paper, technical documentation, a comparable system, direct observation
or a measurement. Identify human behaviour or learning outcomes that would need to be checked with people.

## Perspectives

1. **Algorithms and data structures.** Review ReefID’s algorithms and data structures. What deserves attention from this perspective, and why?
2. **Software architecture and maintainability.** Form an independent judgement of ReefID’s software architecture and maintainability. What choices matter most, and how well do they serve the project?
3. **Data engineering and modelling.** Evaluate how ReefID represents and manages data. Develop your own assessment of its strengths, limitations and prospects.
4. **Browser, mobile web and performance.** Assess ReefID as a web application, including its behaviour and performance on the devices that matter for its users.
5. **Distributed state and offline synchronisation.** Evaluate ReefID’s handling of state across devices, services and periods of disconnection.
6. **Security, privacy and access control.** Evaluate how ReefID protects its users, their data and the people and organisations that operate it.
7. **Quality engineering, delivery and operations.** Assess how confidently ReefID can be tested, delivered and operated over time.
8. **AI systems and agent-assisted development.** Evaluate ReefID’s way of developing software with AI agents. Develop your own assessment of what makes the workflow effective or fragile.
9. **User interface design, interaction and accessibility.** Form an independent judgement of ReefID’s visual design, how its interface works and how accessible it is to the people using it.
10. **Perceptual learning and instructional design.** Evaluate ReefID as a way for people to learn biological identification. Determine which educational questions matter most.
11. **Psychometrics and measurement.** Assess what can reasonably be inferred about learning from the evidence ReefID produces.
12. **Field identification, taxonomy and scientific curation.** Assess the scientific quality and fitness for use of the knowledge and material through which ReefID teaches identification.
13. **Independent learners and organisational practice.** Evaluate how ReefID fits the circumstances of people learning independently and of organisations using it in their own ways.
14. **Product strategy, economics and adoption.** Assess ReefID’s proposition, its alternatives and its prospects for adoption and long-term viability.

## Bringing the reports together

Save each first-pass report before sharing earlier work or another reviewer’s conclusions. Record the revision
and any limits on what the reviewer could observe. Use the report destinations and hand-back process in the
[integrator guide](../INTEGRATOR.md).

The coordinator compares findings with the project’s earlier reviews and current Linear issues. Preserve
strengths worth keeping, meaningful disagreements and interactions between disciplines. Where uncertainty could
change a decision, identify the observation or focused study that would resolve it. Link accepted work to an
existing issue or open one for a distinct finding. For changes that need Pierre’s decision, explain the
alternatives, their consequences and what can be verified. A review can recommend replacing a foundation. The
existing decision and merge process governs implementation.
