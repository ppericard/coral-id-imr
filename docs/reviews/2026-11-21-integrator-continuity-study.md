# External roadmap and integrator continuity — implementation study

**Project:** ppericard/coral-id-imr  
**Revised:** 21 November 2026, UTC+8  
**Audience:** Pierre and the project's integrator  
**Status:** Concrete proposal, not an adopted policy or a deployed integration.  
**Primary objective:** Put the ROADMAP into an external tracker that the integrator maintains, so Pierre can see priorities, dependencies, progress and decisions without managing agents individually.

> **Filed 2026-11-21 by the integrator.** The study as Pierre gave it (14:41), unchanged below this note. What came of
> it the same day: Linear adopted as the tracking location (#1360,
> [decision](../decisions/2026-11-21-linear-tracking.md); Linear REE-5); appendix B carried out (#1361, REE-178);
> appendix C piloted on response time (REE-179); appendix E's freshness check (REE-180); the shared document home,
> Drive first, later (REE-181); Slack dropped (Pierre, 2026-11-21 16:10: «On laisse tomber Slack»).

## 1. Recommendation and priority

**Make a useful external roadmap the first delivery, together with a short recovery entry point and links to the existing project documents. Start with Linear; retain YouTrack Cloud as the alternative if actual access, workflow or cost makes Linear unsuitable.**

Judge the change against Pierre's current operating system: does it reduce the attention needed to understand priorities, recover context and coordinate work? Residual imperfections are not, by themselves, reasons to delay an improvement. This revision replaces the emphasis on a representative pilot before expansion with a first useful delivery, followed by extension during ordinary work.

Keep one principal integrator responsible for discussion, research synthesis, planning, delegation and integration. Pierre should continue speaking naturally. The integrator translates meaningful changes into the tracker and the relevant specifications, coordinates agents and checks outcomes. Pierre should not have to become a ticket administrator.

A tracker makes operational state durable and visible. Existing compaction and interpretation failures can persist while the overall workflow improves. Preserve the working development agents, reviews and merge train; adding shared project records does not require replacing the execution system.

### Compare changes with the current baseline

The assessment below combines Pierre's reported problems with the repository observations in Appendix A. Expected benefits are design judgments, not measured results from a deployed replacement.

| Problem or additional cost | Assessment | Proposed response |
| --- | --- | --- |
| Difficulty seeing the full roadmap and its dependencies | Existing priority problem; a tracker directly targets it. | Make the overall structure, active work and near-term priorities visible in the first delivery. |
| Context loss and repeated explanations | Existing problem; shared state makes more of the relevant context recoverable. | Point the existing recovery brief to current work and its reasons. |
| Literal interpretation and accumulated rules | Existing problem; a new store does not automatically correct it. | Maintain the current understanding of meaningful subjects and reconcile conflicting interpretation instructions where they affect work. |
| Scattered studies and decision reasons | Existing retrieval burden. | Link and index useful documents before considering a wholesale move. |
| Authentication, connector failures and subscriptions | Additional operating cost. | Use existing integrations and check the actual cloud route; include these costs in the concrete tool choice. |
| Contradictory copies across applications | Avoidable additional risk. | Give each transferred subject one current tracking location; link other surfaces to it. |
| Continuous model loops or a custom dispatcher | Cost of a further architecture change, not of simply adding a tracker or document store. | Introduce such infrastructure only when a demonstrated need justifies it. |

### First useful result

The first roadmap should show the main outstanding project outcomes, current execution, near-term priorities and real blockers. Detailed normalization of lower-priority history can continue afterwards. Where a subject is not yet migrated, show its existing location; do not present an incomplete import as the full project.

Update the existing brief/STATUS mechanism to recover the active discussion, linked work, ongoing delegated executions and next useful step. Index relevant existing studies. These changes form one small, coherent improvement; they need no new memory service.

Once the required operations work from the real cloud environment, use the setup for ordinary authorized work. Observe recovery at the next actual compaction or account change. Full-roadmap rollout need not wait for every continuity scenario to be demonstrated.

### Scope and authorization

Preparing this study, a configuration proposal and an import preview is within the requested design work. Selecting a product here does not authorize creating accounts, disclosing project material to another provider, subscribing, changing repository rules or migrating live data. Prepare the concrete choice, access requirements, representative import and exact instruction changes together for the applicable approval. Once that scope is authorized, carry routine configuration and migration through to completion without asking Pierre to approve each ticket.

Reuse the recently merged backlog inventory and current records. A new global inventory, a vector memory service or an always-on orchestration platform is not a prerequisite.

## 2. Tool choice and practical cost

The following product facts were checked against official sources on 21 November 2026. The recommendation is an assessment of this project's needs, not a claim that one product has been experimentally proven superior.

| Candidate | Relevant offering | Assessment for this project |
| --- | --- | --- |
| **Linear — first candidate** | Free: 250 issues plus unlimited archived issues. Basic: USD 10 per user per month, billed annually, with unlimited issues. Official remote MCP, API and GitHub integration. [T1–T5, T13] | A focused interface for projects, priorities, dependencies and linked PRs. Test whether Pierre can understand the roadmap quickly and whether his integrator can maintain it from the actual cloud environment. |
| **YouTrack Cloud — strong alternative** | Free for up to 10 users; hosted MCP and REST API. [T6–T8] | A credible full tracker, especially if custom fields or avoiding a subscription are decisive. Keep initial configuration small. |
| **Jira Free** | Up to 10 users and 2 GB storage; some permission and advanced planning features are limited. [T9] | Capable, but the current need does not establish a reason to choose its additional configuration surface first. |
| **GitHub Issues** | Native REST endpoints now cover sub-issues and blocking dependencies. [T10, T11] | Technically viable with existing GitHub access. Evaluate its human-facing views; do not choose it solely because the code is already there. |

For a **single paid Linear member**, USD 120 annually is approximately **EUR 109.19 per year**, equivalent to **EUR 9.10 per month**, using the ECB reference of EUR 1 = USD 1.0990 on 20 November 2026. This is a conversion estimate before applicable taxes or payment charges. A second billable member would double that base subscription. [T1, T12]

An Anthropic conversation or subagent is not automatically a separate tracker member. Verify the intended authorization and billing model for any app identity or service account. Do not create a paid seat for each execution session by default.

Use the free plan for the initial connection and import where its limits fit. The existing inventory's row count does not establish how many issues a normalized migration will create: some rows contain several remaining deliverables. Price the intended operational import after decomposition. Do not prematurely archive active work or restrict the useful first delivery merely to stay below a plan limit.

Linear's native issue properties include status, priority, labels and blocking relations. Its GitHub integration can link PRs and update status from PR events. These are useful components; automatic closure still needs to match this project's definition of completion. [T3, T4]

### Access must be demonstrated in the actual environment

Linear offers a hosted MCP endpoint at **https://mcp.linear.app/mcp** and an API. YouTrack offers hosted MCP and REST. A successful connection in another chat application does not establish that Claude Code Cloud can perform the same operations. [T2, T5, T7, T8]

The documented GitHub proxy restriction blocks GitHub GraphQL, including Projects v2, from the relevant Claude Code cloud route. It does not establish that Linear's separate GraphQL endpoint is blocked. Test each actual route and account configuration; do not infer general network capability from the protocol name. [E2]

The initial technical check is small: read, create, update and link two temporary items, retrieve a dependency, associate a PR, then recover the same items from another authorized Anthropic account. Record which environment and account configuration succeeded. Request only the access needed for the agreed work, using the environment's supported credential mechanism.

If one candidate fails a decisive access or usability test, try the alternative. Four simultaneous product pilots would consume attention without helping the immediate decision.

## 3. What the tracker should contain

### 3.1 One current home for each kind of information

| Information | Current home after cutover |
| --- | --- |
| Open work, priority, execution status, dependencies and active ownership | External tracker |
| Behavior, specifications and reproducible analysis that must be reviewed with code | Relevant versioned repository documents |
| Project-level understanding, substantial studies and decision explanations | One declared documentary home, linked from the tracker; existing repository studies can stay where they are |
| Applicable decision, scope and provenance | Concise explanation on the issue, linked to its decision or source document |
| Code, reviews, checks, merge and deployment evidence | GitHub and the existing delivery system |
| Short orientation for the active discussion and recovery | Existing handover/brief, pointing to tracker views and the relevant subject |
| Content questions and trainer curation already handled in the app | Existing Admin → Inbox → To do → Points, with its current data and curation records |

The last row matters: the current ROADMAP explicitly assigns content questions, nomenclature discrepancies and trainer questions to the app's Points workflow. Keep that workflow. Track associated development or research in the external tool when needed, linked to the relevant point; do not create a second authoritative resolution record. [R15]

ROADMAP.md becomes a short orientation page linking to the tracker and its views. A generated snapshot can be useful for portability, but it is a dated read-only export. Do not maintain two independently editable roadmaps.

### 3.2 Start with a small structure

Use a project or equivalent grouping for a significant outcome, such as the remaining work on a common admin across subjects. Use issues for independently actionable or verifiable results: a study, a decision to prepare, a feature or a specific repair. Add parent/child relationships when different parts have their own dependencies or delivery state.

Do not make a ticket for every user sentence. Do not keep a whole program inside one enormous issue when its parts have different statuses. Split according to the work, not according to line breaks.

For Linear, begin with one team for the existing software project and project groupings only where they improve navigation. A new agent does not need a new team. Keep the separate ReefRecall product scope distinct; this proposal does not merge it into coral-id-imr. [R1]

### 3.3 Separate the decision from execution

An investigation can be authorized while its result remains unknown. A feature can be agreed while waiting for technical work. Preserve this distinction.

| Dimension | Proposed representation |
| --- | --- |
| What is currently understood | Maintained issue description or linked subject brief |
| What makes the next action eligible | Applicable decision or existing delegated mandate, with scope and evidence |
| What remains undecided | Specific open point; a label only if needed for a useful view |
| Execution | Backlog, Ready, In progress, Review, Done or Cancelled, adapted to the actual tool |
| Dependencies | Native blocking links and an explanation where the relation is not obvious |
| Deliberate postponement | Parked/deferred label or equivalent, with the existing condition for reconsideration |

These names are an initial configuration proposal, not permanent vocabulary. In Linear, use existing properties and a small label group where necessary; do not assume arbitrary custom fields exist. YouTrack can use custom fields if that is the better fit.

**Ready must not mean “Pierre has personally approved every implementation detail.”** It means the next action is permitted by an applicable decision or the integrator's existing mandate, and relevant dependencies are satisfied. Preserve the current distinction between small reversible calls and material decisions.

“Decision for Pierre” is reserved for a real unresolved choice requiring him, after recovering existing answers and preparing a recommendation. An agent's failure to read a linked source is not a new decision request.

### 3.4 Issue description template

Use only the parts needed for the work. Small tasks can use a paragraph.

~~~markdown
## Outcome
What should become possible, or what question this study should resolve?

## Current understanding
The current direction, its scope, and unresolved choices.
Identify integrator assumptions separately from acquired decisions.

## Next action
The next useful step under the existing mandate.
State an actual blocker or dependency if present.

## Completion evidence
The observable result or study deliverable that establishes completion.

## References
Applicable decision, specification, source item and linked PRs.
~~~

Execution state and priority should be stored in their native fields rather than repeatedly copied into prose. For ongoing delegated work, keep a lightweight record of the executing session or work area and branch/PR. A tracker assignee alone does not prove that the old executor is still running.

## 4. Views that should exist at the end of the first delivery

| View | Question it answers |
| --- | --- |
| **Roadmap by outcome and priority** | What matters next, and which larger results are we working toward? |
| **In progress** | What is actually underway, who is coordinating it, and where are the PRs or study outputs? |
| **Ready to advance** | What can the integrator usefully start within the current mandate? |
| **Blocked** | What cannot advance, and what concrete dependency or action would release it? |
| **Decisions for Pierre** | Which choices genuinely need Pierre, with context and a proposed answer? |
| **Backlog and parked work** | What is retained for later without being presented as committed work now? |
| **Recently delivered** | What verifiable results have been completed? |

Implement these as native saved views where possible. The goal is useful visibility, not a custom dashboard application. Do not invent dates just to fill a timeline or treat the number of cards closed as a measure of scientific or product progress.

The integrator maintains the underlying records as it works. Pierre can inspect a view or change a priority, but normal progress must not depend on him opening every issue.

## 5. Migration from the actual ROADMAP

### 5.1 Prepare a reviewable import

Take an identified source revision. Reuse the refreshed inventory from PR #1326 as supporting evidence, then reconcile the current ROADMAP, applicable decisions, specifications and active PRs. Inspect changes since the inventory; do not treat its classifications as live state indefinitely. [R13]

Prepare a CSV or JSON manifest plus a readable preview. Suggested manifest columns:

~~~text
migration_id
source_commit
source_path
source_anchor_or_legacy_id
target_project
parent_migration_id
title
current_description
execution_state
priority
decision_basis
dependency_migration_ids
specification_urls
pull_request_urls
uncertainty
target_id
target_url
~~~

Generate stable migration identifiers once and retain the source-to-target mapping. A dated audit's row number is a locator within that snapshot, not a universal identity. Make import retries update or skip existing mapped items rather than create duplicates. Use a second pass for relationships if the selected API requires target IDs first.

Do not convert unknown implementation state into Ready or Done. Reconcile it against current evidence, or retain a narrow uncertainty while independent verified items move.

### 5.2 Transform meaning, not just formatting

The current Q446 row still begins with an old “idea, not built” description, expands the pCloud proposal and only later records Pierre's sheet-tab choice. Copying the whole row into an issue would reproduce the interpretation problem. [R15]

| Source subject | Proposed migration result |
| --- | --- |
| **Q446: attach an image to a report** | A current implementation issue describing the chosen lightweight image and temporary sheet-tab handling. Preserve the older pCloud proposal as linked history, not pending work. Verify actual implementation before setting the execution state. |
| **Q449–Q452: response time** | A project or parent issue, an actionable multifactor study, and the dependent implementation stages. Preserve the accepted sequence without inventing a formula or claiming the hypothesis is proved. |
| **One engine for every subject** | A significant outcome with separate remaining results after checking current PRs; built behavior stays documented in its specification. |
| **Professionalise the platform** | Retained deferred work with its actual reconsideration conditions; no invented deadline. |
| **Already resolved work** | Existing evidence or closed imported history where useful; do not reopen it just because a migration needs a card. |

For Q446, the later recorded choice is a reduced lightweight image sent with the report, stored temporarily in a separate sheet tab and removed after processing. Approximate image dimensions from that discussion do not become a universal policy. [R10, R15]

For Q449–Q452, distinguish the accepted direction from a scientific result not yet established. The first useful task recovers the existing analysis and resolves what the multifactor study still needs; it does not restart already completed research. [R10]

### 5.3 Deliver a useful roadmap immediately

After the relevant access and import scope are authorized, establish the main project outcomes and import the current work and near-term priorities. Choose the initial coverage by usefulness, not an arbitrary number of sample tickets. Retain visible pointers for major subjects whose detailed transfer is still pending.

Check the import mechanism on a few real items before applying it to the rest of the initial scope. Verify the operations that will actually be used: read, update, relationship links and retrieval from the intended environment. This is a short implementation check, not a separate research phase.

Pierre should be able to inspect the current priorities, useful progress, real blockers and actual choices for him from this first delivery. The integrator immediately maintains those records during ordinary work. Test later-agent recovery when an actual compaction or account change occurs, without holding the remaining migration behind that event or imposing new sessions.

### 5.4 Complete the transfer and establish authority

Continue within the authorized migration scope after the initial operations and mappings are verified:

1. Import active and decided work, then the remaining backlog, deferred ideas and relevant historical exclusions.
2. Resolve ambiguity using current evidence; bring Pierre only choices that materially require him. Keep unresolved items out of the ready queue without freezing the entire migration.
3. Check changes since the extraction before each transfer batch and capture final deltas.
4. From the first transferred batch, put the adopted transitional source-of-truth instructions into effect. For each transferred subject, identify the tracker as its current tracking location and turn the former row into a pointer; unmigrated subjects retain their declared existing location.
5. At final cutover, reduce ROADMAP.md to orientation and links; retain its previous version in history.
6. At final cutover, simplify the transitional instructions and PR references together: agents select and maintain the operational backlog in the tracker.
7. Verify coverage through the source-to-target mapping, not equal row and ticket counts: decomposition changes the count.

There should be a cutover revision and a clear account of any items still outside the tracker. Do not silently run two sources of truth during a long transition.

### 5.5 One existing rule needs an explicit adaptation

The current ROADMAP instructs agents to delete shipped rows and maintain no done list anywhere, with a stated historical reason: conflicts on a shared Markdown list. [R15]

A tracker should normally retain closed tickets and their links. Propose the exact rule change for review: the tracker keeps completed work searchable, while the repository avoids a manually maintained shared done list. Do not carry the old deletion behavior into the new tool merely because the wording is emphatic.

Adapt the references in AGENTS.md, INTEGRATOR.md, STATUS.md and the PR contract. A linked issue and applicable decision can replace a reference to an agreed ROADMAP row, while preserving the same substantive authorization and provenance requirements. [R1, R2, R14]

### 5.6 Portability and recovery

Demonstrate an export that retains IDs, descriptions, statuses, priorities, relations and source/PR links. Verify which parts the tool's native export preserves; supplement missing relationship data through its documented API if necessary.

A saved export is a dated snapshot, not a competing editable backlog. During an outage, report that freshness is unknown and preserve any local pending update with the affected issue ID for reconciliation. Never represent a failed query as an empty backlog.

If an import or connection fails, retain the prepared mappings and source evidence and repair the affected operation. Useful transferred work can continue where access remains available. If a live tracker is replaced later, export subsequent updates before changing authority; restoring an old Markdown snapshot alone would lose work.

## 6. How the integrator should operate

The tracker belongs in the integrator's normal working loop:

1. Recover the current priorities, active ownership, blockers and the relevant subject context.
2. Interpret the conversation at the appropriate scope. Update an existing issue or specification when the understanding changes; create new work only when there is a distinct useful outcome.
3. Select eligible work, record responsibility and check for an existing active executor before launching another.
4. Give subagents the issue ID, intended outcome, relevant evidence and current constraints. Pierre need not dispatch each task.
5. Collect results, assess their implications and update the current description, relations and PR links.
6. Close work when its stated result is verified. A research task can finish with a documented negative or inconclusive finding; a code task must meet its actual delivery criterion.
7. Give Pierre a short account of meaningful progress, changed understanding and decisions that require him.

Use PR integration to reduce routine bookkeeping where it fits. Configure status transitions against this project's merge and deployment contract. “PR opened” is not completion, and a merge is not always proof of user-visible deployment.

Do not put every subagent message, tool log or user quotation into an issue comment. Keep source evidence discoverable, and edit the current synthesis when interpretation changes. Closed issue history can preserve the trajectory without loading it all into the next agent's context.

On account change, the shared tracker and repository provide common project records. Reconcile ownership before duplicating work. A remote branch proves artifact state, not that the previous cloud process has stopped.

## 7. Should Slack be added?

**Introduce Slack as a common project-conversation surface when the selected integration supports the intended assistant role.** It can be introduced alongside the first tracker rollout or shortly afterwards. Completing the whole migration or solving all memory failures is not a prerequisite; a Slack connection problem should likewise not hold up the useful roadmap.

| Use | Potential benefit | Limit to test |
| --- | --- | --- |
| Updates and alerts | One place for meaningful results, blockers and genuine decisions. | Avoid a stream of every PR, test event and agent message. |
| Project conversation | A familiar channel and linked threads can remain available while execution sessions change. | A new agent still needs the current tracker and subject records. |
| Task initiation | An official integration can turn a request into cloud work. | Dispatch, delegation and recovery behavior must match the existing integrator role. |

Linear already provides notification options, so alerts alone do not establish a need for another application. [S1] Slack becomes more interesting if Pierre wants a stable conversational entry point across projects and sessions.

### Current Claude integration options

Official Claude Code documentation retains an individual Slack integration for Pro, Max and Ultra accounts in workspaces not connected to Claude Tag. It starts cloud sessions under the connected individual's plan limits. Thread context includes that user's and Claude's messages. This does not establish automatic transfer between Pierre's accounts or visibility into every subagent's output. [S2]

Claude Tag is a different organizational offering for Team/Enterprise: channel work uses the organization's identity and usage balance. Assess it separately if its shared-assistant model is wanted; do not assume it pools existing personal subscriptions. [S3, S4]

Use the official integration for an initial trial. A custom dispatcher would be another hosted service and maintenance responsibility; it is not required merely to try Slack.

### Conversation continuity: the integration makes the difference

Slack can become the main interface for project discussions if the chosen integration preserves the assistant's capabilities and supports recovery. The agent's own chat can remain available for inspecting or steering an execution. Pierre should not have to relay the same material between them: the integrator records consequential changes in the shared project records and links back to the discussion.

The individual integration above and Claude Tag provide different continuity mechanisms. Tag binds a working thread to a session. The execution sandbox can be replaced after inactivity while the conversation remains available to resume; unpublished working files require separate persistence. [S8]

Tag keeps notes by channel and can retrieve earlier session transcripts, but its memory documentation does not describe full-text search across those transcripts. Those notes remain revisable and are not a guarantee that feedback will be interpreted at the right scope. [S9]

Tag also changes the runtime contract: repository hooks in .claude/settings.json do not run, and .mcp.json is not loaded; external connections are configured for the channel. Review the actual implications for this project's recovery tools before choosing that route. [S10]

The target is continuity of the project conversation and records, not a promise that an agent holds the entire history in its active context. Retained messages, retrieved evidence and current understanding must remain distinguishable.



### Introduce Slack through live project work

Start with one project channel and, only if useful, one separate alerts channel. Use a thread per substantial subject, linked to its issue. Prefer one principal assistant speaking to Pierre; let it coordinate agents and summarize their findings. A channel per short-lived agent would not solve the current supervision problem.

Use the first real subject to check the working route:

1. Pierre raises a real subject in the channel.
2. The integrator retrieves the relevant issue and current decision.
3. It delegates or investigates within its existing mandate and writes back the result.
4. A later authorized session/account recovers the correct issue and next action.
5. Pierre receives a useful update without manually forwarding every agent's output.

Adopt Slack only if this makes the workflow easier than the current chat plus tracker. If the official integration creates isolated coding sessions rather than continuing the intended project assistant, account for that limitation before expanding.

### Cost and retained history

Slack Free is a reasonable place to test the communication layer. Slack lists its Claude integration across Slack plans with an eligible paid Claude account; the exact Code versus Tag route still matters. [S7] On Slack Free, only the latest 90 days of history are visible; content older than a year is deleted, and a shorter retention option exists. Its app limit is 10. Keep durable decisions and task state outside chat history. [S5] <!-- effort-ok: a retention period, not an estimate -->


Slack Pro is listed at USD 8.75 per user per month when paid monthly, or USD 7.25 per month with annual billing: approximately EUR 7.96 monthly, or EUR 79.16 annually, at the reference rate used above, before applicable taxes. This is Slack's charge; any Claude subscription or organizational usage remains separate. [S6, T12]

No Slack workspace, bot, channel or integration has been created as part of this study.

## 8. Shared documents: understanding, studies and durable outputs

**Give each project a shared documentary home independent of agent sessions.** It holds the project's current understanding, substantial studies and the reasons behind significant decisions. The tracker continues to own tasks, priority, dependencies and execution state.

This develops the proposed model of an assistant working remotely: Pierre can discuss the project through a stable conversation surface, while successive agents use the same records. The documentary home should remain readable and editable from the actual cloud environments and authorized accounts, without relying on Pierre's computer or a locally mounted sync drive.

### 8.1 A small useful collection

Start with an orientation page and the documents that real work already needs. Create folders and document types as their use becomes concrete.

| Document | Useful content | How it evolves |
| --- | --- | --- |
| **Project home** | Purpose, product scope, major acquired choices, links to the tracker, repository and current subject documents. | A living orientation page. Link to current priorities instead of copying the backlog. |
| **Current understanding of a subject** | Problem, present interpretation, acquired direction, hypotheses, unresolved questions and relevant evidence. | A maintained synthesis for a complex subject. Replace stale interpretations; retain references to their history. A small task can use its issue description instead. |
| **Study or investigation** | Question, methods, data, findings, limits, practical consequences and genuinely new questions. | A dated, identifiable output with a clear draft/revised/final status where useful. Keep results distinct from decisions. |
| **Reasoned decision record** | Choice, reason, significant alternatives, scope, unresolved details and any condition for reconsideration. | Record a meaningful decision or a related group of decisions. A later decision can amend or supersede it. |
| **Project review** | Useful results, changes in understanding, major obstacles and actual choices for Pierre, with links. | Produce at a meaningful milestone or an agreed useful rhythm. It is not a second task list or a transcript of every exchange. |
| **Specification tied to code** | Expected software behavior, interfaces and technical constraints needed for implementation and review. | Keep it versioned with the repository when it must change with code; reference it from the documentary home. |

A shallow initial organization could use a project home plus **Subjects** and **Studies and decisions**. Attach source material and outputs to the relevant study when needed. Avoid creating a large empty taxonomy in advance.

The request for regular decision summaries is best interpreted as regular reconciliation: have significant decisions been represented with their actual scope and reasons? A useful review may record no new structural decision. Do not manufacture an entry or make Pierre validate a verbatim transcript to satisfy a calendar.

### 8.2 Current understanding and history serve different purposes

The subject synthesis answers what the project currently understands and why. A study establishes what was examined and found. A decision record explains a choice. Slack preserves the conversation that led there, within the selected retention arrangements. An issue identifies work and its current execution state.

These are complementary records, not copies of the same prose. Link them by stable references. Keep only one authoritative editable version of each document; an exported PDF is a dated view of its source, not another live master.

Durable does not mean immutable. Preserve the scope of temporary instructions, approximations and hypotheses. When Pierre corrects an interpretation, revise the current synthesis and affected work. A durable rule changes only when the decision and existing mandate support that change.

Do not move every existing repository study to a new provider. Start by indexing current material. Select a home for new substantial work according to how it is used; move an existing document only for a concrete benefit, with a pointer from its former location and a declared new authority.

### 8.3 Example: response time

For Q449–Q452, the tracker carries the study and dependent implementation work. The current subject synthesis explains the accepted multifactor direction and the unresolved scientific choices. The study reports analyses, evidence and limitations. A later decision record captures the actual choice made from those results. The repository specification describes the behavior adopted for implementation. [R10]

Pierre can discuss all of this in one linked conversation. The integrator retrieves existing work, commissions the necessary analysis, maintains the synthesis and reports the conclusions. Pierre does not need to write or synchronize those documents himself.

### 8.4 Drive or pCloud?

**Try Drive first if the priority is readable documents that Pierre and the assistant can refine together. Treat pCloud as a credible alternative for ordinary portable files, not merely a backup destination.** Choose the working home after a representative content test; do not maintain both as independent masters.

The official Claude Drive connector documents search, content access and file creation/upload. Google Docs, Sheets and Slides editing is described through separate Workspace connectors on Claude web/Desktop. That does not prove the same path is configured in Claude Code Cloud or Tag. [D1, D2]

The Google documentation for manually configuring its Drive MCP currently labels that route Developer Preview and lists additional setup requirements. Distinguish the ready-made product connector from a manual cloud integration. [D3]

The Drive connector's documented text extraction does not process images embedded in documents. A study with essential plots requires an explicit download or visual-reading path; reading its text alone is insufficient. [D2]

pCloud has a documented file API, including uploads and revisions. Its pCloudApp account, presented as its official profile, has announced a hosted MCP endpoint at https://mcp.pcloud.com/mcp for browsing, uploading and organizing files. The announcement does not establish full-text content search or reliable editing within a large document; verify those capabilities or the appropriate API/download path. [D4–D7]

For portability, prefer ordinary formats where they meet the need: Markdown for structured text, CSV for simple data, and PDF for a readable fixed rendition. Native collaborative documents can also be appropriate; verify a useful export rather than assuming it. Use one working master and identify generated exports as such.

### 8.5 Maintenance belongs to the integrator

At a meaningful new result or decision, the integrator updates the affected synthesis, decision reference or study and links it to the issue. It should not rewrite every project document after each message.

On recovery, start from the project home, the relevant tracker views and the active subject. Retrieve detailed material on demand. A large shared folder is useful only if the next agent can find the right document without loading the entire collection into context.

The current integrator reconciles the subject synthesis; subagents contribute studies or proposed edits. Before replacing shared content, read its current version and reconcile intervening changes. Record an actual substantive reconciliation where freshness matters, rather than making old reasoning appear current by changing a timestamp.

### 8.6 Verify document operations during real use

Index existing studies immediately, including those that remain in the repository. For the first substantial document placed in the selected shared store, verify that the cloud integrator can find and read the relevant content, make the intended revision without losing other sections, and recover the current version. If a figure carries part of the argument, verify its visual-reading path at that point.

Use the next actual account change to check portability. An access limitation affecting one document type should be handled specifically; it need not prevent the tracker or the existing indexed documents from being useful. A full archive migration is unnecessary for this first improvement.



## 9. Delivery order and acceptance

| Delivery | Integrator work | Reviewable result |
| --- | --- | --- |
| **1 — A usable roadmap and recovery entry point** | Prepare the concrete tool/access decision; once authorized, connect the tracker, establish major outcomes, transfer current and near-term work, and adapt the existing brief with links to work and studies. | Pierre can understand the project state; the integrator can maintain it from the actual cloud environment. |
| **2 — Extend while working** | Complete remaining backlog normalization and transfer; reconcile changed decisions and investigate concrete recovery failures as they occur. | More coverage and fewer avoidable rebriefings without interrupting useful work. |
| **3 — Shared documents and conversation** | Introduce the chosen document home and Slack through ordinary work. This can run alongside deliveries 1–2 when the connections are ready. | Studies and discussions are easier to retrieve across sessions and accounts. |
| **4 — Further automation when useful** | Automate recurring manual steps that have actually become a burden, using existing capabilities first. | Less coordination for Pierre without a new service to maintain unnecessarily. |

The recommended route is progressive delivery with a useful first result. A faster adoption can prepare the tracker, shared documents and Slack together for this one project and then establish a clear cutover. Both routes preserve the current development/review system. The faster route changes how much is introduced at once; it does not inherently require a new orchestrator.

Interpretation fixes that prevent actual migration errors can proceed with the first delivery. The optional diagnostic cases in the appendices are not a gate for the tracker rollout.

The initial success criteria are observable:

- All transferred open work is discoverable, with source mapping and no unexplained loss.
- Ready, active, blocked, deferred and decision work can be distinguished.
- Dependencies and linked PRs are usable.
- A successor retrieves the acquired direction without making Pierre repeat it.
- The integrator updates the tracker as work changes.
- Pierre can assess progress without reading the full ledger or opening every PR.
- Work continues with the current degree of autonomy; a proliferation of permission requests does not count as improvement.

Evaluate these against the current workflow. Pierre noticing that he can find his subjects, see progress and stop repeating an explanation is already useful evidence of improvement; no formal productivity study is required before extending the setup. Include connector upkeep and document maintenance in the assessment. Fix observed regressions without treating every remaining model limitation as a reason to suspend the whole rollout.

Keep current authorized development moving. The integrator chooses separate work areas and uses the existing review and merge train. Do not estimate elapsed implementation time from ticket count alone.

## 10. Handoff instruction for the receiving integrator

~~~text
Deliver a useful external ROADMAP and connect it to the existing recovery brief.
Judge the result against the current workflow and Pierre's supervision burden.

Use this study to prepare a concrete Linear-first proposal, with YouTrack Cloud
as the alternative if an actual access, workflow or cost constraint warrants it.
Reuse the current roadmap and recent inventory; do not start another global audit.

Prepare the minimal views, the main project outcomes, a normalized import of active
and near-term work, the source-to-target mapping and the instruction changes needed
for cutover. Preserve current product decisions, delegated autonomy and merge gates.

Present the choice, costs and access/data-transfer requirements together with the
reviewable first delivery. Once the relevant scope is authorized, verify the real
cloud operations and put the tracker to use. Complete the remaining transfer during
ordinary work without asking for approval ticket by ticket or waiting for a perfect
memory system. Keep the locations of not-yet-transferred subjects visible.

The tracker owns operational work, priority and dependencies. Keep code-coupled
specifications and reproducible artifacts in the repository. Establish one shared
documentary home for project understanding, substantial studies and decision reasons;
index existing material before considering moves. Preserve the in-app curation workflow.
Pierre continues discussing the project naturally; the integrator maintains the
records and manages subagents.

Update the existing brief so it points to current priorities, the active discussion,
ongoing delegated work and relevant studies. Check recovery at actual compactions
or account changes and repair demonstrated failures. Introduce Slack and the shared
documentary home alongside this rollout or afterwards, according to their practical
benefit and the actual integration/account model. They do not require completing a
long pilot, and their setup must not postpone a usable operational tracker.
~~~

# Supporting material: interpretation and continuity

The following material explains how to keep the new tracker from becoming another collection of rigid quotations. Use the relevant parts when implementing the migration and recovery; do not load this entire study into every agent's startup context.



## Appendix A. Repository observations supporting the proposal

This is a targeted document and code inspection, not a full operational audit. Repository files were read on 21 November. They were not all fetched as one atomic checkout; the evidence table at the end records their blob fingerprints. The concrete Q446 and Q449–Q452 examples were read at the merged commit `71107c27a3b62066bf74efb0861e3d2ceddbe575`. Reconcile with current work before using an example as a live task.

| Verified observation | Practical implication |
| --- | --- |
| `AGENTS.md` already says to preserve Pierre's scope and meaning, avoid hardening rules, and leave small reversible decisions to the integrator. | Strengthen the coherence of existing instructions. Simply adding another “use judgment” rule would duplicate a principle already present. [R1] |
| `AGENTS.md`, the `ANSWERS.md` header and `INTEGRATOR.md` also say that a found answer is applied and never asked again. | A text match can be mistaken for a currently applicable decision. Revise the interpretation of a match while retaining useful evidence. [R1–R3] |
| PR #1225 fixed repeated questions caused by answers existing only on an unmerged branch. `asked.py` now searches open PR ledgers through REST. | Retain this capability. Distinguish finding evidence from interpreting its scope and later amendments. [R5, R11] |
| `INTEGRATOR.md` now provides a small independent PR for a chat decision not otherwise recorded, and prioritizes reference-document PRs. | This publication mechanism already exists. Retain this publication mechanism for repository decisions and specifications alongside the tracker migration. [R2] |
| PR #1315 is merged and the queue scripts are in `tools/queue/`. | The earlier scratchpad-code problem is corrected. Processes and `QUEUE_DIR` remain environment-local and must not be assumed to survive. [R7, R12] |
| PR #1326 is merged and the backlog inventory was refreshed on 21 November. | Reuse the current ROADMAP and this dated audit as evidence. Do not commission another global backlog inventory as the first step. [R13] |
| `SessionStart`, `InstructionsLoaded` and `SubagentStart` hooks already exist, along with `instr_log.py`. | Observe the existing recovery mechanism before adding new hooks. A load log proves loading, not understanding. [R4, R6] |
| The startup shell obtains `origin/main` if that local reference is missing; an existing reference is not refreshed by that fallback. `brief.py` compares the checkout with the local reference. | Equality to local `origin/main` does not establish equality to the current remote branch. This is a code-level freshness risk; runtime failure has not been reproduced here. [R4, R8] |
| The inspected `STATUS.md` is dated 20 November 21:30 and still presents Q446's pCloud option; the later ledger and ROADMAP record the sheet-tab choice. | A handover must be reconciled with newer decisions. This provides a concrete recovery test. [R9, R10] |

The project now explicitly distinguishes IMR Reef ID from ReefRecall. This proposal concerns continuity for `coral-id-imr`; it does not combine their product scopes. [R1]

## Appendix B. Reconcile interpretation instructions alongside migration

### B.1 Replace the conflicting passages together

The target is a small, coherent change rather than an extra instruction layer.

| Location | Proposed action |
| --- | --- |
| `AGENTS.md`, “One integrator” | Clarify that the integrator also owns discussion, research synthesis and project understanding. Preserve the current delegation and merge contract. |
| `AGENTS.md`, “Every answer reaches its doc” and “The rules” | Reconcile how answers are interpreted with the existing prohibition on hardening or generalizing Pierre's meaning. |
| `INTEGRATOR.md`, “Before any question” and related answer/launch passages | Replace automatic application of a search hit with interpretation of scope, amendments and current applicability. Preserve legitimate autonomy and current decisions. |
| `ANSWERS.md` opening | State that the ledger preserves evidence and history, while current understanding lives with the relevant subject. |
| `tools/asked.py` documentation and any related explanatory text | Describe results as evidence matches. Keep retrieval coverage and failures visible. Do not implement a keyword classifier that declares a decision “approved.” |
| PR template and relevant validators | Check for contradictions with the proposed wording. Retain existing provenance and authorization checks in the continuity work; do not weaken them to make a new format pass. [R14] |

The precise insertion points may have changed. Read the current passages and prepare the smallest consistent diff. Search their explicit cross-references; do not rewrite unrelated policy files.

### B.2 Draft wording for the principal assistant role

**Proposed replacement within the existing role paragraph:**

> The integrator is Pierre's principal project assistant. It maintains the current understanding of the project, discusses ideas and tradeoffs with him, coordinates research and development, synthesizes findings, and manages delegation and integration. It exercises the autonomy already granted by the project's decision and merge contract.

This describes the role. It does not authorize new classes of actions.

### B.3 Draft wording for understanding corrections and answers

**Proposed replacement for the relevant interpretation passages, reconciled with “The rules”:**

> Interpret Pierre's input in the context of the discussion and the project's current direction. Distinguish an immediate instruction or explicit decision from an observation, example, hypothesis or request to investigate. Preserve explicit constraints. Frustration, repetition and emphatic wording do not by themselves extend an instruction's scope or duration.
>
> When feedback reveals a misunderstanding, correct the affected work and revise the current understanding of that subject. Keep unresolved uncertainty visible and identify the integrator's inferences as such. A standing rule changes when a durable decision warrants it, under the existing approval contract. Ask a focused question when unresolved ambiguity materially changes what is authorized; otherwise continue within the existing mandate.

Do not reinterpret a clear stop instruction away because Pierre is frustrated. Conversely, do not manufacture a permanent ban from a correction confined to the present incident.

This wording is not a requirement to classify each message aloud. Pierre should continue speaking naturally. An ordinary acknowledgment does not automatically create a standing instruction, task or change to the subject's current synthesis. The continuity work preserves the existing ledger capture requirement.

### B.4 Draft wording for using and recording evidence

**Proposed replacement for the “found answer” behavior:**

> Before asking a question whose answer may already exist, retrieve the relevant current decision and supporting history. A search hit is evidence: check its scope, later amendments and applicability before acting. Apply an existing decision that settles the present point without asking again. If the evidence is incomplete or contradictory, describe the specific uncertainty and continue independent work already authorized.
>
> Keep decisions and significant changes of understanding discoverable through the existing recording process, independently of the implementation's merge. Preserve the source and update the document that owns the subject. Recording an answer does not make every phrase in it a standing instruction.

For the continuity work, retain the existing append-only ledger and its current capture requirement. Change how it is used. Revising the breadth of future capture can be considered separately if it still creates measurable overhead. This avoids losing answers while changing the system.

**Proposed ledger-header clarification:**

> This ledger is historical evidence. Entries preserve what was said and how it was interpreted at the time; later entries may amend earlier ones. A match is not by itself a current instruction. Consult the relevant subject's current synthesis and any subsequent decision before applying it. Keep historical entries intact and link corrections to the understanding they change.

### B.5 What a correction should produce

The integrator should repair the actual work and the representation that caused the error. A short explanation of the corrected assumption is useful when it helps Pierre assess the repair. It need not expose private reasoning or generate a lengthy retrospective.

For example: “I had treated the proposed storage option as agreed. The later answer chooses a sheet tab. I have corrected the current design and the task brief.”

If the cause is still uncertain, say so. Do not invent a convincing explanation, promise perfect compliance, or add a rule merely to demonstrate that feedback was recorded.

## Appendix C. Keep the current understanding recoverable

### C.1 Give the current understanding a clear home

After cutover, the issue owns the current work description. Keep detailed scientific or technical understanding in an existing linked subject document where needed; do not introduce a second independently maintained task record.

Choose one active subject after checking its current work and PRs. Reuse its existing design, study or specification document if it provides a suitable home. A new project-level synthesis can live in the selected shared documentary home; code-coupled specifications stay versioned with the code.

The integrator maintains that current synthesis. Subagents contribute findings and proposed corrections. One integrator resolves the subject's current interpretation at a time; a new integrator takes over the same material rather than establishing another private version.

If no suitable document exists, a pilot note such as `docs/reviews/2026-11-21-response-time-continuity-pilot.md` is a possible new location. That name is a proposal, not an existing file. Register it in the existing documentation index and link it from the relevant tracker issue and current handover. Do not create one file per remark.

### C.2 Working brief template

Use these prompts only where they add information. They are not mandatory fields for every small task.

~~~markdown
## Current understanding

Purpose
The problem being addressed and the result that would be useful.

Current position
Decisions already acquired, with their scope and supporting references.
Distinguish the approved direction from an unresolved implementation choice.

Evidence and interpretation
What has actually been observed, what the integrator infers, and what remains uncertain.

Current work
The relevant tracker issue, study, branch or PR; link to execution state rather than copying it.

Next useful action
What can be done under the existing mandate, and the specific dependency or question if blocked.

Last reconciliation
Date, relevant source or code revision, and any known coverage gap.
~~~

Maintain the current account by editing it. Replace false interpretations; combine duplicates; remove obsolete instructions from the active view while preserving their history and sources. Do not set a new arbitrary document-size ceiling.

A current synthesis is a revisable interpretation, not independent evidence of Pierre's approval. If it conflicts with a clear applicable decision, correct the synthesis. Do not turn an integrator inference into an acquired decision merely by carrying it into the next version.

This is a concise explanation of the subject, not an exhaustive transcript or a record of every internal thought. A small issue may need only a paragraph.

### C.3 Filled example — response time and photo difficulty

The following is an example synthesized from the ledger and ROADMAP at commit `71107c27a3b62066bf74efb0861e3d2ceddbe575`. It is not a fresh scientific result or a new authorization. [R10]

**Purpose.** Understand how response time relates to player knowledge and photo difficulty so that the learning system can use the signal appropriately.

**Current position.** The recorded direction includes photo-time and enlargement signals, followed by the player-time step. Pierre's later explanation asks for a multifactor study considering player strength and photo difficulty, with continuous rather than categorical treatment. The downstream direction remains recorded; the immediate work is to resolve the study and design questions.

**Hypothesis to examine.** Hesitation by a strong player may contain different information about a photo from hesitation by a beginner. This is a hypothesis and motivation for analysis, not a measured causal conclusion or an already specified weighting formula.

**Open technical points.** The current records do not by themselves establish a final functional form, effect size or adequate evidence for every subject. Read the existing analysis and data limitations before choosing a method or repeating a measurement.

**Next useful action.** Recover the existing response-time design and results, establish what remains unresolved, and continue the approved study without duplicating prior work. Preserve the sequence and the actual scope of the recorded decisions.

**Successor warning.** Do not turn “study this relationship continuously” into a preselected formula, or turn the existence of scientific uncertainty into a request to reapprove the entire already accepted direction.

If the subject has already progressed by the time this example is used, update this account. It can still serve as a retrospective recovery case; do not reopen completed research to accommodate the pilot.

### C.4 Filled example — screenshot storage

At the inspected snapshot, the older STATUS recommends pCloud for Q446. The later answer chooses a lightweight reduced image sent with the report, temporarily held in a separate sheet tab and deleted after processing. [R9, R10]

A useful current note would identify the sheet-tab decision, its specific use case and the later source. The earlier pCloud design remains historical context. Approximate image dimensions in that exchange should not become a global image policy.

A successor should recover this decision without asking Pierre to choose a storage provider again. Actual implementation and deployment must still be verified separately.

### C.5 Preserve the active discussion in STATUS

Use a short part of the existing handover for the conversation's unfinished reasoning. For example:

~~~markdown
## Active discussion

Subject: response time and photo difficulty — [current subject brief].
Current stage: multifactor study before the recorded implementation sequence.
Open point: distinguish player and photo contributions without inventing categories.
Next action: reconcile the existing study with the latest answer, then continue the analysis.
Evidence checked: [revision/date]; execution state comes from the tracker; PRs provide implementation and delivery evidence.
~~~

This example is illustrative. Use the real current state, keep other active subjects discoverable, and preserve the full backlog's role. Replace stale or duplicated tracking content where appropriate rather than mechanically appending another section. Respect the current document checks; if the useful content does not fit the existing format, expose that issue in the proposal rather than deleting important questions to make room. Do not copy the whole subject document or every PR status into STATUS.

At a meaningful change—decision, study conclusion, significant correction, delegation or handover—update the affected subject and the small current pointer as needed. Do not depend exclusively on a final pre-compaction save.

## Appendix D. Keep decisions visible before code merges

The repository has already introduced two useful measures: independent recording PRs for decisions and priority for reference documents. The continuity work should use them, alongside `asked.py`'s search of open PR ledgers. [R2, R5]

Distinguish three questions:

| Question | Evidence |
| --- | --- |
| What has actually been decided? | The relevant answer or decision, interpreted with its scope and later amendments. |
| Where is that decision discoverable now? | The merged document, or an explicitly linked pending recording PR. |
| What has actually been implemented and delivered? | Current branch/PR, tests, merge and any relevant deployment evidence. |

A document can be unmerged while its underlying decision is acquired. A merged document can also be outdated. Neither merge status nor a keyword match alone establishes the decision's current meaning.

The integrator should identify a pending recording location in the handover if it matters to a successor, then follow the already agreed publication priority. Avoid adding another independently maintained decision list.

For shared state, preserve one current owner and avoid concurrent rewrites of the same synthesis. Subagents should report changes rather than silently overwrite the integrator's account. Persistent remote records carry continuity across accounts when access is configured; environment-local cache paths do not.

## Appendix E. Targeted recovery improvements

### E.1 Observe the mechanism that already exists

The repository already has a SessionStart hook and an instruction-loading log. Observe one ordinary start, one actual compaction and one resumption in the cloud mode Pierre uses as those events occur. Record which events ran, which files/revisions were loaded, and what context reached the agent. A simulated input validates a script but does not prove that the hosted runtime invokes it. [R4, R6]

An event not yet observed remains an explicit verification gap; it does not prevent the documentation proposal or read-only recovery comparison from proceeding. Avoid forcing session changes solely to satisfy this observation list.

The official hook reference lists `compact` as a SessionStart source and supports adding context from SessionStart. Existing instrumentation should be tried before introducing PreCompact/PostCompact behavior. [E1]

The cloud documentation distinguishes a normal single-repository hosted session from Project cloud threads and multi-repository sessions; repository hooks are not loaded in all of those modes. Verify the actual surface. The same documentation confirms the GitHub GraphQL proxy restriction, including Projects v2 and requests with a supplied GH_TOKEN. REST remains the relevant route for supported GitHub issue and PR operations. [E2]

If hooks are unavailable in the chosen surface, implement a short recovery entry point through the instructions that are actually loaded there. Do not claim automatic recovery until it has been observed. Do not require Pierre to repeat the project briefing after every compaction.

### E.2 Address the local-reference freshness risk

Current code inspection shows a narrow gap: the startup fallback fetches `origin/main` when it is missing, while an existing local reference can remain old. The brief's instruction-difference check uses that local reference. This does not establish that Pierre's current sessions actually ran stale instructions; it identifies a testable failure mode. [R4, R8]

Propose a bounded freshness check at start/recovery, using the existing trusted-tool route. It should:

- identify the checkout revision and the reference used for recovery;
- establish the remote main revision as of a recorded successful check;
- refresh the local remote-tracking reference when necessary through the normal allowed operation;
- report an unavailable check as “remote freshness unknown”;
- preserve local work and branch content;
- distinguish fetched reference content from instructions already loaded into the model.

Do not automatically reset, checkout, merge or rewrite the working tree. Fetching a reference does not by itself reload an agent's instructions. When the loaded instructions differ materially, the recovery procedure must obtain the reviewed relevant text and establish what the runtime actually used.

Preserve the current trust boundary: operational hooks and queue tools execute reviewed code from the approved reference, not arbitrary PR code. This study does not prescribe bypassing a permission rejection.

### E.3 Extend the existing brief rather than build a second status system

A useful recovery output would communicate information of this form:

~~~text
Remote evidence: checked at <time>; remote main <sha or unknown>; local reference <sha>.
Tool code: executed from <reviewed sha>.
Instructions: loaded file fingerprints <known/unknown>; checkout/reference differences <known/unknown>.
Tracker: <workspace/view>; queried at <time or unavailable>; active issue <ID>.
Focus: <existing STATUS section and current subject document>.
Unpublished decision: <recording PR if relevant>; implementation <separate evidence>.
Next: <current task pointer>; verify current PR state before relaunch.
~~~

This is a proposed output contract, not a new command that already exists. Use the existing full/short brief where practical. The integrator chooses the smallest maintainable implementation.

The tool should select and describe evidence. It should not infer approval from “OK,” tone, status labels or keywords. Current understanding remains a reasoned synthesis with provenance.

Meaningful engineering checks for this change are:

1. An old local main reference with a newer remote revision.
2. An unavailable remote check.
3. Legitimate local uncommitted changes.
4. A reference updated after instruction loading.
5. Loss of local queue cache during session replacement.

None should yield a false “up to date” claim or discard work. Run only the additional tests needed for the implementation actually chosen and the project's existing gates.

### E.4 Recovery is scoped to the next action

The successor should retrieve the current direction, the relevant subject and verifiable work state. It then continues work within the existing mandate.

It should not reread the entire ledger or all studies on every turn. It should also not treat a short focus list as the complete backlog. Current orientation supplies the wider purpose; subject pointers support targeted retrieval.

On account change, verify access to the common records and check which work is already active before relaunching it. Remote branches and PRs establish work state, not whether a former agent is still executing. Mark execution ownership as unknown when it cannot be verified; reconcile that uncertainty before relaunching the same work, while continuing independent authorized tasks. An old session's process identifiers, local logs and transcript links are not sufficient cross-account continuity by themselves. Do not assume a conversation link is readable from another account.

## Appendix F. Optional evaluation of interpretation changes

Use these cases selectively when a material interpretation change or an observed failure warrants it. They are not gates for every imported ticket or prerequisites for completing the tracker migration.

### F.1 Compare decisions, not rule recitation

Prepare a small baseline and candidate comparison in read-only contexts. One reader receives the current arrangement; another receives the proposed arrangement for the same case. Keep the model and effort comparable and record the configuration.

Both readers should have access to the same source revisions, relevant pending PRs and tool capabilities. Vary the organization and proposed guidance, not the availability of the later decision. Record retrieval failures separately.

Ask each for:

- the current goal and stage;
- the relevant decision and its scope, with evidence;
- remaining uncertainty;
- the next action and delegation, if appropriate;
- the short update it would leave for a successor.

Ask for a concise explanation and references, not private chain-of-thought.

Then have an independent fresh reader recover from the saved candidate material. A first agent's polished answer is insufficient if its successor receives a hardened or distorted instruction.

### F.2 Ready-to-use cases

These cases are examples for a pilot, not permanent rules to load into every task.

| Case | Material to present | What to look for |
| --- | --- | --- |
| Later decision supersedes an older recommendation | The inspected older STATUS and Q446's later answer/ROADMAP record. | Recover the sheet-tab choice; distinguish it from implementation; avoid re-asking the storage decision. |
| Hypothesis within an accepted direction | Q449–Q452, including the later multifactor explanation. | Preserve acquired direction and sequence while treating the player/photo interpretation as a hypothesis to investigate; invent no formula. |
| Calm versus frustrated correction | A synthetic incident where a previously answered question is asked again, followed by two differently toned versions of the same correction. | Correct the same underlying error; preserve scope; do not create a universal ban on questions. |
| Explicit stop under frustration | A synthetic instruction clearly stopping one active task. | Stop that task, preserve its work, and do not discount the instruction because of tone. |
| Answer exists on an open branch | A fixture based on the failure described in #1225, with an acquired decision in a pending ledger PR. | Find the decision and identify the unmerged recording location without claiming the feature is delivered. |
| Limited postponement | A synthetic “later” concerning one part of a subject while independent authorized work remains. | Respect that postponement and continue eligible work elsewhere. |
| Context loss with absent local cache | Remote PR/decision records available, prior queue cache absent. | Recover artifact state; distinguish it from whether an old executor still runs; reconcile unknown ownership before duplicating that work. |
| Clear durable change | A synthetic explicit change to a standing rule, with an unambiguous scope and authority. | Preserve the genuine durable change rather than treating all corrections as local. |
| Retrieved evidence is incomplete | An unavailable source or a failed open-PR search. | Do not claim exhaustive knowledge; investigate or ask only the material unresolved question, while continuing independent authorized work. |

Start with the few cases that exercise the changed behavior, then add a new formulation or unresolved risk. The numbers of cases, files and rules are not success targets.

Keep evaluator expectations separate from the material given to the reader. If the entire answer key is included in the prompt, success only shows that the agent can repeat it. Avoid strong claims from a small qualitative sample.

### F.3 Observe the live pilot without burdening Pierre

At existing check-ins, the integrator can note the avoidable interventions visible in the conversation and the useful work completed. Pierre should not maintain a time sheet or label every message.

Useful observations include:

- a question repeated despite available evidence;
- an already completed task restarted;
- a local correction promoted to a broad rule;
- a clear decision weakened or ignored;
- a need for Pierre to reconstruct context;
- unnecessary approval requests;
- useful results completed under the existing mandate.

An apparent improvement that comes from doing less work, asking permission for everything or hiding uncertainty does not meet the objective.

A few successful recoveries support extending the pilot; they do not establish perfect long-term reliability. If errors persist, inspect the specific cause—retrieval, stale state, conflicting instructions, summary distortion or inadequate judgment—before adding mechanisms.


## Appendix G. Sources and verification record

### Repository sources

- **[R1]** [AGENTS.md](https://github.com/ppericard/coral-id-imr/blob/main/AGENTS.md). Role, autonomy, rule-editing scope and current recording requirements.
- **[R2]** [INTEGRATOR.md](https://github.com/ppericard/coral-id-imr/blob/main/docs/INTEGRATOR.md). Current procedures, independent recording PRs, reference PR priority and queue location.
- **[R3]** [ANSWERS.md](https://github.com/ppericard/coral-id-imr/blob/main/docs/ANSWERS.md). Historical ledger and opening instructions.
- **[R4]** [.claude/settings.json](https://github.com/ppericard/coral-id-imr/blob/main/.claude/settings.json). Existing hooks and trusted-reference fallback.
- **[R5]** [tools/asked.py](https://github.com/ppericard/coral-id-imr/blob/main/tools/asked.py). Retrieval from local evidence and open PR ledgers.
- **[R6]** [tools/instr_log.py](https://github.com/ppericard/coral-id-imr/blob/main/tools/instr_log.py). Event/source and instruction-loading instrumentation.
- **[R7]** [tools/queue/README.md](https://github.com/ppericard/coral-id-imr/blob/main/tools/queue/README.md). Persistent scripts, local state and restart behavior.
- **[R8]** [tools/brief.py](https://github.com/ppericard/coral-id-imr/blob/main/tools/brief.py). Existing computed state and local-reference instruction comparison.
- **[R9]** [STATUS.md](https://github.com/ppericard/coral-id-imr/blob/main/docs/STATUS.md), inspected version dated 20 November 21:30.
- **[R10]** [ROADMAP at the inspected merged commit](https://github.com/ppericard/coral-id-imr/blob/71107c27a3b62066bf74efb0861e3d2ceddbe575/docs/ROADMAP.md) and [ANSWERS at that commit](https://github.com/ppericard/coral-id-imr/blob/71107c27a3b62066bf74efb0861e3d2ceddbe575/docs/ANSWERS.md). Q446 and Q449–Q452 recovery examples.
- **[R11]** [PR #1225](https://github.com/ppericard/coral-id-imr/pull/1225). Documented repeated-question incident and open-branch retrieval repair.
- **[R12]** [PR #1315](https://github.com/ppericard/coral-id-imr/pull/1315). Queue-script move, merged; rejection of mandatory fresh sessions at every handover.
- **[R13]** [PR #1326](https://github.com/ppericard/coral-id-imr/pull/1326) and [refreshed backlog inventory](https://github.com/ppericard/coral-id-imr/blob/main/docs/reviews/2026-11-20-backlog-inventory.md). Dated audit, refreshed and merged.
- **[R14]** [PR template](https://github.com/ppericard/coral-id-imr/blob/main/.github/pull_request_template.md). Existing justification and player-visible-change requirements.

- **[R15]** [Current ROADMAP](https://github.com/ppericard/coral-id-imr/blob/main/docs/ROADMAP.md), inspected again on 21 November 2026. Q446 conflicting historical/current descriptions, the in-app Points scope and the historical no-done-list rule. Blob inspected by the parallel repository review: 4de754cdd709bdc95cba3329905102ec5069e6f3; the receiving integrator must reconcile current main before import.

### External primary sources

- **[E1]** Anthropic, [Hooks reference](https://code.claude.com/docs/en/hooks), checked 21 November 2026, especially SessionStart. Documentation describes supported events; actual invocation in Pierre's sessions remains to be tested.
- **[E2]** Anthropic, [Configure cloud environments](https://code.claude.com/docs/en/cloud-environments), checked 21 November 2026, especially GitHub proxy restrictions and cloud hook limitations.
- **[E3]** Anthropic, [The components of agent memory](https://www.anthropic.com/research/components-of-agent-memory), published 6 November 2026, checked 21 November 2026. Research examples and limitations, not a guarantee for this project's workflow.

### Tracker and cost sources

- **[T1]** Linear, [Pricing](https://linear.app/pricing), checked 21 November 2026. Free and Basic plans; annual billing.
- **[T2]** Linear, [MCP server](https://linear.app/docs/mcp), checked 21 November 2026. Hosted endpoint and authentication options.
- **[T3]** Linear, [Issue properties](https://linear.app/docs/issue-properties-home), checked 21 November 2026. Status, priority, labels and relations.
- **[T4]** Linear, [GitHub integration](https://linear.app/docs/github-integration), checked 21 November 2026. PR links and status automation.
- **[T5]** Linear, [API and webhooks](https://linear.app/docs/api-and-webhooks), checked 21 November 2026. Public GraphQL API and scoped API keys.
- **[T6]** JetBrains, [YouTrack pricing](https://www.jetbrains.com/youtrack/buy/), checked 21 November 2026. Free Cloud plan for up to 10 users.
- **[T7]** JetBrains, [YouTrack MCP server](https://www.jetbrains.com/help/youtrack/cloud/model-context-protocol-server.html), checked 21 November 2026.
- **[T8]** JetBrains, [YouTrack REST API](https://www.jetbrains.com/help/youtrack/devportal/youtrack-rest-api.html), checked 21 November 2026.
- **[T9]** Atlassian, [Jira Cloud plans](https://support.atlassian.com/jira-cloud-administration/docs/explore-jira-cloud-plans), checked 21 November 2026.
- **[T10]** GitHub, [REST sub-issues](https://docs.github.com/en/rest/issues/sub-issues), checked 21 November 2026.
- **[T11]** GitHub, [REST issue dependencies](https://docs.github.com/en/rest/issues/issue-dependencies), checked 21 November 2026.
- **[T12]** European Central Bank, [USD reference rate](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/eurofxref-graph-usd.en.html), rate dated 20 November 2026: EUR 1 = USD 1.0990. EUR estimates in this study are calculated from that reference.
- **[T13]** Linear, [Startups FAQ](https://linear.app/startups), checked 21 November 2026. Clarifies that the Free offering includes 250 issues plus unlimited archived issues.

### Slack and communication sources

- **[S1]** Linear, [Notifications](https://linear.app/docs/notifications), checked 21 November 2026.
- **[S2]** Anthropic, [Claude Code in Slack](https://code.claude.com/docs/en/slack), checked 21 November 2026. Distinguishes individual plans from workspaces connected to Claude Tag; describes cloud sessions, context and plan limits.
- **[S3]** Anthropic, [Claude Tag overview](https://claude.com/docs/claude-tag/overview), checked 21 November 2026.
- **[S4]** Anthropic, [Set up Claude Tag](https://claude.com/docs/claude-tag/admins/setup-overview), checked 21 November 2026. Team/Enterprise setup and organizational usage balance.
- **[S5]** Slack, [Free-workspace limits](https://slack.com/help/articles/115002422943-Usage-limits-for-free-workspaces), checked 21 November 2026. History, retention and app limits.
- **[S6]** Slack, [Paid versus Free plans](https://slack.com/pricing/paid-vs-free), checked 21 November 2026.
- **[S7]** Slack, [Use Claude in Slack](https://slack.com/help/articles/53532192117267-Use-Claude-in-Slack), checked 21 November 2026. Eligibility across Slack plans; general Claude chat behavior. Use the more specific Anthropic Code/Tag documentation for execution and account routing.



- **[S8]** Anthropic, [How Claude Tag works](https://claude.com/docs/claude-tag/concepts/how-it-works), checked 21 November 2026. Thread/session and sandbox lifecycles.
- **[S9]** Anthropic, [What Claude Tag remembers](https://claude.com/docs/claude-tag/users/memory), checked 21 November 2026. Channel notes and past-session retrieval.
- **[S10]** Anthropic, [Claude Tag for Claude Code users](https://claude.com/docs/claude-tag/concepts/for-claude-code-users), checked 21 November 2026. Configuration and hook differences.

### Shared-document sources

- **[D1]** Anthropic, [Google Drive connector](https://claude.com/marketplace/connectors/google-drive), checked 21 November 2026.
- **[D2]** Anthropic, [Use Google Workspace connectors](https://support.claude.com/en/articles/10166901-use-google-workspace-connectors), checked 21 November 2026. Distinct Drive and native-document editing paths; text extraction limits.
- **[D3]** Google, [Configure the Drive MCP server](https://developers.google.com/workspace/drive/api/guides/configure-mcp-server), checked 21 November 2026. Developer Preview and configuration prerequisites.
- **[D4]** pCloud, [Developer API](https://docs.pcloud.com/), checked 21 November 2026.
- **[D5]** pCloudApp, [Hosted MCP announcement](https://www.reddit.com/r/pcloud/comments/1wm796o/connect_pcloud_to_your_ai_assistant_with_official/), checked 21 November 2026; [author profile](https://www.reddit.com/user/pCloudApp/) presents itself as the official pCloud profile. Reported capabilities are narrower than an end-to-end document-content test.
- **[D6]** pCloud, [Upload file](https://docs.pcloud.com/methods/file/uploadfile.html), checked 21 November 2026.
- **[D7]** pCloud, [List revisions](https://docs.pcloud.com/methods/revisions/listrevisions.html), checked 21 November 2026.



### Inspected file fingerprints

The following identify the content inspected. They are file blob IDs, not assertions that every file was fetched from a single repository commit.

| File | Blob SHA |
| --- | --- |
| AGENTS.md | 1467c9e833790fcf0271c383c96e3d3b6441adc4 |
| docs/INTEGRATOR.md | c3a8050f02c65c261c50979ab2aadffaca30d27b |
| docs/STATUS.md | 5537b0d7d95947e9f46946a78da9835e191afabe |
| docs/ANSWERS.md | 5e60d7491315c81d630dd8c7baec75e8f9ff2a4b |
| .claude/settings.json | 69ea851bb4eb2835d1a90dd08691b40ad66af4f3 |
| tools/brief.py | 6e75bf1790ea0e6e0b666a2e226eb5e45f9d44fe |
| tools/asked.py | f1ffc6fa49da4270c96273adbed855838f7a4538 |
| tools/instr_log.py | 9bbc5a602dcb46a9ee3a10195b763d6d0cbc1c53 |
| tools/queue/README.md | 9445ddacfb762422098c59e756e931c397cd35f9 |
| .github/pull_request_template.md | ef0bea85a64375ed036b20a7ebc523c08dc20016 |
| docs/ROADMAP.md at the fixed pilot commit | 0a8fdc68918849fb9aa21f88f4f07456b791fcfe |
| docs/reviews/2026-11-20-backlog-inventory.md | 264d500842db7a8a04d87054db5d252c8a4a4ec5 |

### Work performed for this study

Read-only repository inspection, current primary-documentation and pricing checks, synthesis and revision of this report, including Slack continuity and shared-document options. No repository files were changed; no external tracker or Slack workspace was created; no shared project folder was created; no data was migrated; no subscription was purchased; and no tests or hooks were run in Pierre's Claude environment. Proposed behavior, wording and output examples remain proposals.

