# Roles, groups and people: managing rights (design study, 2026-11-26)

Status: a read-only design study. It changes no code, no sheet tab and no rule. Pierre's choices are the questions in
section 6; the integrator gives Q numbers to those that pass the two tests. Written against `main` at ed12f04d (sheet
v236) and #1554's head 9beb84ee (REE-31, open, `needs-pierre`).

## 0. The ask and the answer in short

Pierre, 2026-11-26, 08:36-08:48 Manila, in the integrator's chat. His points reached this study as the integrator's
summary, so they are paraphrased here, not quoted. The integrator records his exact words in the ledger.

- A **Roles** page where he sets each role's rights. A **Groups** page where he links groups of people to one or more
  roles. Roles also given to one person directly, for example from the players list. Is a role the same concept as a
  group? Is this still his ACL idea of 2026-11-18?
- A group's rights hold for the whole instance or for a **list** of subjects. Counter-cases to one subject: a trainer
  for fish and sea slugs, a curator for corals and fish, a cohort learning two subjects.
- A right held at the instance holds in each subject the instance carries.
- Who may hold `grant`? A Manager role?
- At least one admin and one manager per instance. Removing the last one warns strongly and stops. Forcing stays
  possible, with an explicit confirmation and an Audit row. Nobody can lock an instance completely: whoever can push to
  the repository can always repair.
- The Audit tab: each change has its time. Two more columns, **Before** and **After**, for rights changes (his OK to a
  sheet column change).

**Answer.** A role and a group are two different things, and the common practice links them:
- a **role** is a named set of rights;
- a **group** is a set of people (and the group settings: board, beta);
- an **assignment** says "this group, or this person, holds this role, over this scope".

This is how Azure, Google Workspace and Keycloak do it (section 1). It keeps every part of the 2026-11-18 idea that
mattered: a player carries a list of groups, rights only add up, nothing denies, and a membership that gives rights is
bound to the account's code. It changes one thing: a group no longer lists rights itself. It lists roles, each with its
scope. **Recommendation: option C** (section 2), with the guardrails of section 3 and the Audit columns of section 4.
Merge #1554 first, as the base every option needs (section 5).

## 1. How comparable apps do it

Sources read for this section (public pages, fetched 2026-11-26, rule C7). Claims from pages not fetched are marked.
- NIST, [RBAC FAQ](https://csrc.nist.gov/projects/role-based-access-control/faqs); NIST SP 800-162,
  [ABAC guide](https://csrc.nist.gov/pubs/sp/800/162/upd2/final).
- Microsoft, [Azure RBAC overview](https://learn.microsoft.com/en-us/azure/role-based-access-control/overview) and
  [Entra roles best practices](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/best-practices).
- Google Workspace, [Assign specific admin roles](https://knowledge.workspace.google.com/admin/users/assign-specific-admin-roles)
  and [Security best practices for administrator accounts](https://knowledge.workspace.google.com/admin/users/security-best-practices-for-administrator-accounts);
  Google Classroom, [Remove a student or co-teacher](https://support.google.com/edu/classroom/answer/6069576).
- Moodle 4.5, [Roles and permissions](https://docs.moodle.org/405/en/Roles_and_permissions),
  [Context](https://docs.moodle.org/405/en/Context), [Assign roles](https://docs.moodle.org/405/en/Assign_roles),
  [Override permissions](https://docs.moodle.org/405/en/Override_permissions),
  [Cohorts](https://docs.moodle.org/405/en/Cohorts), [Site administrators](https://docs.moodle.org/405/en/Site_administrators).
- GitHub, [About teams](https://docs.github.com/en/organizations/organizing-members-into-teams/about-teams),
  [Custom repository roles](https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/about-custom-repository-roles),
  [Ownership continuity](https://docs.github.com/en/organizations/managing-peoples-access-to-your-organization-with-roles/maintaining-ownership-continuity-for-your-organization).
  GitLab, [issue 441282](https://gitlab.com/gitlab-org/gitlab/-/issues/441282) (last organization owner).
- Linear, [Members and roles](https://linear.app/docs/members-roles). Notion,
  [Sharing and permissions](https://www.notion.com/help/sharing-and-permissions).
- iNaturalist, [Understanding projects](https://help.inaturalist.org/support/solutions/articles/151000176472) (the
  project-management page answered 403).
- Keycloak, [Server administration guide](https://www.keycloak.org/docs/latest/server_admin/index.html) (core concepts).
- Zanzibar, [USENIX ATC 2019](https://www.usenix.org/conference/atc19/presentation/pang) (the abstract only).
- AWS, [IAM policy evaluation logic](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html).
- OWASP, [Authorization cheat sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).
- Linux [acl(5)](https://man7.org/linux/man-pages/man5/acl.5.html), already read in the 2026-11-18 study.

### The models

| Model | What it is | Seen in |
| --- | --- | --- |
| **RBAC** | Rights go to roles, people get roles. NIST: "permissions are connected only to roles, not directly to users" | Every app below |
| **Groups to roles** | A role is given to a group; its members hold it. Keycloak: "Users that become members of a group inherit the attributes and role mappings that group defines" | Azure, Google Workspace, Keycloak, GitHub teams |
| **Direct roles** | A role given to one person, beside the groups. Keycloak: "A user can be associated with zero or more roles" | Azure, Google Workspace, Keycloak, GitHub ("an individual or team") |
| **Scoped assignment** | The scope sits on the assignment, not on the role. Azure: "A role assignment consists of three elements: security principal, role definition, and scope" | Azure (four levels), Google (an organizational unit), Moodle (a context) |
| **Custom roles** | The admin makes and names roles. GitHub: "a configurable set of permissions with a custom name you choose" | Azure, Entra, GitHub Enterprise, Moodle |
| **ABAC** | Rights computed from attributes of the person, the object and the context (NIST SP 800-162) | Azure conditions, Entra (layered on roles) |
| **ReBAC / Zanzibar** | Rights as relations between people and objects; Google's system "for storing and evaluating access control lists" | Google's services; OWASP prefers ABAC or ReBAC for apps |
| **POSIX ACLs** | Entries on the object, each naming a user or a group (acl(5)) | Linux files |

### How each handles the hard parts

| Topic | What the sources say | Lesson for Reef ID |
| --- | --- | --- |
| **Scope and inheritance** | Azure: scopes are "structured in a parent-child relationship". Moodle: a Teacher assigned at a category holds the role in "ALL courses within the category", passed "below" but not above | An instance assignment reaches each subject; a subject one stays there. #1554's `can_` does this already |
| **A list of places** | Azure and Moodle give one scope per assignment; two places are two assignments. Google: one organizational unit per assignment | Either one assignment per subject, or one assignment holding a short list. Both are the same rights |
| **Several roles** | Azure: "an additive model, so your effective permissions are the sum of your role assignments". Notion: "the broadest level of access given to a user" | The union, as Q408 decided |
| **Deny** | AWS: "An explicit deny ... overrides the allow". Azure has deny assignments checked first. Moodle's Prohibit "can't be overridden"; within one context, Allow beats Prevent | Deny is powerful and surprising; Q408 (2) ruled it out. Keep it out |
| **Who may give roles** | Moodle: "teachers are only allowed to assign the roles of non-editing teacher, student and guest", set in "Allow role assignments". Entra: a group owner "decides who is added", so "indirectly, decides who gets the role assignment" | Changing a group that carries roles is a grant. Q408 (4) already gates it on `grant` |
| **Separation of duties** | NIST: static SoD limits which roles one person may hold; dynamic SoD limits which roles are active at once. Google: "You can't unassign a role from yourself" | Not needed for a pilot of one manager. Kept as a later option |
| **The last admin** | Classroom: "You cannot remove the primary teacher from a class". Moodle: the primary administrator "cannot be removed from the site administrator role". GitLab proposes a modal: a sole owner "must assign a new owner before leaving". GitHub, Google and Entra recommend at least two (GitHub: "at least two people"; Google: "more than one super administrator account") | Refuse the last removal, as Pierre asks. None of the pages read offers a force path; Pierre's force is ours, made safe by the audit and the token |
| **Break glass** | Entra recommends "two cloud-only emergency access accounts" for when "all other administrators are accidentally locked out". Google super admin cannot be given to a group | Our break glass is the admin token: it passes every right and can change the script |
| **Role explosion** | OWASP: RBAC can suffer "role explosion"; it is "poorly suited" to multi-tenant use cases | Scopes on assignments avoid one role per subject. Instances get their own sheet later (Q343) |
| **Audit** | OWASP: "if logging related to access control is not properly set-up, such authorization violations may go undetected". The product pages read did not cover their audit logs | Every change has its row; Before and After make each row readable alone |

Linear and iNaturalist are the small-app end. Linear has fixed workspace roles (Owner, Admin, Member, Guest) and team
owners; its page names no custom roles. iNaturalist's projects have fixed admins, managers and curators. Both show
that small apps start with fixed roles. Pierre asks for custom ones, which the larger systems have.

**Role versus group.** NIST draws the line: a group is a set of users, a role is a set of permissions. Pierre's
2026-11-18 idea joined them (a group carries rights). His 2026-11-26 points separate them again, with a link between
them. That is the groups-to-roles pattern above.

**Is it still the ACL idea?** Yes, in what mattered. A player still carries a list of groups, as Linux's supplementary
groups. Rights still add up, with no deny and no ordered match. The new assignment row is the closest thing to an ACL
entry: it names a group or one person, the rights (through a role), and the object (the instance, or some subjects).

## 2. Four options for Reef ID

Today (`main`, v236): a group's Rights cell (Group settings tab) lists `right@instance:imr` entries. Members of such a
group hold them while the membership's code hash is theirs (Groups tab). The admin list is the Roles tab's `admin`
rows (Q408, answer 6). #1554 adds one audited write for every rights change (`rightsWrite_`) and lets a group's
`content`, `live` and `cohorts` sit at one subject (`content@subject:fish`, Q447).

| | A. As built, with #1554 | B. Groups carry rights, wider scope | **C. Roles, groups and assignments** | D. Relations (Zanzibar-like) |
| --- | --- | --- | --- | --- |
| **Idea** | A group lists its rights, one scope per group | The same, a right may hold at a list of subjects; the Roles page holds presets | Roles hold rights; groups and people hold roles at a scope | One table of tuples: who, relation, object |
| **Tabs** | None new | None new; the Rights cell grammar grows (`live@subject:fish+seaslug`) | New `Role defs` (Role, Name, Rights, Added) and `Assignments` (Group, Account, Role, Scope, Since, Code hash) | New `Relations` (Subject, Relation, Object, Since, Code hash) |
| **Group settings Rights column** | Read | Read | Read by nothing after the migration, kept | Read by nothing, kept |
| **Groups tab** | As today | As today | As today: the code hash for a group holding any role | Memberships become relations |
| **Roles tab** | The admin list | The admin list | The admin list only (Q408, answer 6) | Could hold all; Q408 (6) would need asking again |
| **Roles page** | None | Presets: editing one does not change groups already made | Yes: a role's rights, who holds it, where | A rules page, hard to read |
| **Groups page** | Rights chips | Rights chips with subjects | Role chips: "Trainer: fish, sea slugs" | Relations list |
| **Direct roles** | No: a group of one | No: a group of one | Yes: an `Assignments` row with the account's code hash | Yes |
| **List of subjects** | No | Yes | Yes | Yes |
| **Migration (W3)** | None | None: old cells stay valid, the grammar only grows | One `ONCE_` step: each Rights cell becomes a role and an assignment (below) | One step: every membership, right and admin row becomes a tuple; the largest rewrite |
| **Security** | As today: hash binding, `grant` gate, token root | Same; a preset applied to a group with members is refused, as a first right is | Same, plus the hash on direct rows; a role edit is a mass grant (gated, below) | Same in principle; harder to review, every rule is data |
| **D4 (old apps)** | Nothing new | Admin gated on the version that takes subject lists | Admin's new pages gated on the version; an old page's `groupEdit rights` refused | Every admin rights view gated; no player app reads rights |
| **Pierre sees** | Rights chips on a group; one person needs a group of one | The same, with subject ticks; a Roles page that copies presets | Roles page, role chips on groups, roles on the player's bar | Lines of "who, relation, what" |
| **For** | Built, reviewed, no cost | Cheap; no new tab | His three pages; the common pattern; one role edit reaches every holder | Most general: could hold cohort trainers and follow rights too |
| **Against** | No Roles page, no direct roles, one subject | Presets drift from the groups made from them; direct roles faked by groups of one | Two new tabs, one more migration | Far beyond a pilot; opaque to Pierre; reopens Q408 (6) and Q448 |
| **Cost** (beside the guardrails and Audit PRs, which fit every option) | 0 | One sheet M and one admin M | One sheet L and one admin L | Two sheet L, one admin L |

What each option gives of the 11-26 points: the Audit columns and the guardrails fit all four. The instance reaching
its subjects is #1554's, so all four have it. A Roles page that sets rights for every holder, and direct roles, only
C and D give. A list of subjects: B, C and D.

### Option C in detail

**Data.**
- `Role defs`: Role (an id, `ro:` and 8 random characters; the migrated ones `ro:manager`, `ro:curator`, `ro:trainer`),
  Name (1-40 characters, unique case aside), Rights (right ids from `RIGHTS`, no scope), Added.
- `Assignments`: one row per assignment. Group (a group id) **or** Account (a name, as the Roles tab holds it), Role,
  Scope (`instance:imr`, or one or more `subject:<id>` of `core.js` `SUBJECTS`), Since, Code hash (the account's, for
  an Account row; blank for a Group row, whose members' rows hold theirs).
- **Why not the Roles tab for direct roles.** Its shape fits (Account, Role, Scope, Since, Code hash). But its old
  `owner`, `editor` and `trainer` rows are dead records. A new role with one of those ids would bring them back to life.
  The new reader reads `Assignments` only; the Roles tab reader keeps reading `admin@platform` rows only (`scopeOk_`).
- **Scope rules.** `players`, `settings` and `grant` hold at the instance only; `content`, `live` and `cohorts` at the
  instance or a list of subjects (#1554's narrower reading, kept). A role holding an instance-only right takes the
  instance scope only (answer `scope`).

**`can_(who, right, scope)`.** The token: true. An account: live, code checked, then the admin list as today; then
every Assignment held by the account (its own row with a matching hash) or by one of its groups (a membership with a
matching hash), whose role carries `right`, and whose scope covers the asked scope. The instance covers each subject; a
subject list covers its subjects only.

**Who changes what.** Every write goes through `rightsWrite_` (#1554), one audited path.
- Make, edit or delete a role; give or take a role (to a group or a person); add or remove a member of a group that
  holds a role: `grant` at the instance.
- A group's name, board, beta, and the members of a group without roles: `players`, as today.
- Editing a role's rights is a mass change for all its holders. It asks one confirm naming how many people it touches,
  and writes one Audit row per holder (Q408's pattern for a group's rights).
- A group's first role is refused while it has members, as a group's first right is today: their memberships hold no
  code hash. A role is deleted only when nobody holds it (`used`).
- A merge drops what the merged name held directly and its memberships of groups holding roles (Q408, answer 7); the
  merge warning lists them (`mergePlan_`).

**Migration (rule W3, one `ONCE_` step, nothing lost).** It runs after the earlier rights migration (`rightsNow_`),
whose code is still between `rights-migration` markers on `main`. Whether that one has run on the live sheet was not
checked: this study did not read the Deploy log (rule W11). The new step starts from the Rights cells as that one
leaves them.
1. Each group whose Rights cell is not empty gets a role with exactly those rights. The `r:owner`, `r:editor`,
   `r:trainer` groups give the roles Manager, Curator and Trainer; any other group gives "<group name> rights".
2. Each such group gets one Assignment of its role at the scope its cell holds (the instance, or #1554's subject).
3. Memberships and their code hashes stay as they are. The Rights cells stay written, read by nothing, as the Roles
   tab's old rows are.
4. One Audit row per role and per assignment made, by `script`, `(migration)`, with Before and After (section 4).
5. Until it has run, readers read the data as it will make it, as `rightsBefore_` does today. Its code goes between
   markers once the Deploy log shows its line.
Nobody's rights change. Every player sees what they saw.

**Security.**
- **Code hash.** A direct Assignment holds the account's hash, as a Roles tab grant did; a membership of a group holding
  a role holds it, as today. A name taken again or a code changed gives nothing until the role is given again.
- **The admin token** stays root. It passes every right and can push `Code.gs`, so it is also the repair path.
- **Sign-in strength.** Q423 (2026-11-19) set no cap by sign-in strength for the pilot: name and 4-digit code are enough,
  and a stronger sign-in is on the roadmap (REE-172). If it returns, it stays a fixed rule of `can_`, never role data.
- **Escalation.** The new path is a role edit: adding `grant` to the Trainer role would make every trainer a manager.
  Question 4 keeps `grant` in the built-in Manager role only.
- **Old cached admin pages.** After the migration, the script refuses a `groupEdit` that carries `rights` (`moved`), so
  an old page cannot write the retired column without anyone noticing.

**Each cohort's trainers (Q448, REE-37).** Unchanged under C. Q408 (5) and Q448 (A) stand: one Trainer role gives
the capacity, and each cohort lists its trainers as lines in the Groups tab, edited with `grant`. C does not reopen
them. It could later hold a cohort's trainers as assignments at a cohort scope; that would be a new question, not
asked here.

**Compatibility (rule D4).** No player app reads a right today; a live game asks the script. The admin page's Roles
page, the role chips and the direct roles turn on only when the script reports the version that has them (as
`RIGHTSADM_SHEET` does for v204). Below it, the Groups page is today's.

**What Pierre sees.** Players › **Roles**: a card per role, its rights as chips (× and "+ Add a right"), then "Held
by": groups and people, each with its scope ("Trainers group: whole instance"; "P3: fish, sea slugs"). Players ›
**Groups**: a group's card shows "Roles" chips in place of "Rights", and "+ Give a role" (a role, then "Whole IMR" or
subject ticks). The **player's bar** shows their roles, direct or through a group, and "+ Give a role", with the one
confirm Q408 (8) asked for.

## 3. The guardrails

**What is counted.** A guardrail counts rights, not role names, so a rename never defeats it:
- an **admin** is a live account on the admin list whose code hash matches (Q408, answer 6: Admin is platform wide, not
  per instance; this sheet serves one instance);
- a **manager of an instance** is a live account that holds `grant` at that instance, under a matching hash, through
  any assignment.
The admin token never counts. It is the repair path, not a holder.

**When it stops.** Only a change that takes a count from one or more to **zero**. A change that leaves one holder is
never stopped. When the count is already zero, nothing is stopped that does not lower it, and adding a holder always
goes through.

**Where it is checked.** In the script, under the script lock, never only in the page. The script works out the count
before and after the change; two admins removing two managers at once cannot both pass. It runs on every path that can
remove a holder:

| Path | Checked |
| --- | --- |
| A member leaves a group holding Manager; a role taken from a person or a group | yes |
| A role edited (its `grant` taken away) or deleted; a group holding Manager deleted | yes |
| An assignment's scope changed | yes (`grant` is instance-only, so only a removal can lower the count) |
| The admin list's revoke | yes (admins) |
| An account deleted by the admin, merged away, archived | yes |
| A player's own delete (rule D7, their privacy) | **never stopped**: an Alerts line and an Audit row instead |
| A code changed, a name lost | cannot be stopped (no write): the Alerts line below names it |

**What the warning says.** The script answers `{error: 'last', what: 'manager' | 'admin', scope}`. The admin page then
shows, in red, before anything is changed:

> This removes the last Manager of IMR. Nobody would then be able to give or change rights in IMR, except with the
> admin token. Type REMOVE to go on, or Cancel.

For an admin: "This removes the last admin on the admin list. Only the admin token could then act as admin."

**How force works.** The page sends the same request again with `force: 'last'`. The script checks the count again
under the lock, makes the change, and writes its usual rows plus one `force last manager` (or `admin`) row whose Before
and After hold the count (`1` and `0`). A force never skips the `grant` gate: only a caller who may make the change
may force it.

**Nobody locks an instance.** The admin token passes every right and is not counted, so it can always give Manager
again from the admin page. If the token itself is lost, whoever can push to the repository makes a new one. An Alerts
line "No manager for IMR" shows while the count is zero, so a lost manager does not go unseen.

## 4. The Audit tab with Before and After

Today the tab has six columns (`AUDIT.HEAD`: Time, Admin id, Action, Scope, Result, Target id). Time already gives
each change its time. The proposal adds **Before** (G) and **After** (H) at the end.

| Row | Before | After |
| --- | --- | --- |
| A role's rights changed | the role's rights, e.g. `live, cohorts` | the same after |
| A role given or taken (a group or a person) | the holder's roles there, e.g. `ro:trainer@subject:fish` | the same after |
| A member joins or leaves a group holding roles; one row per holder of an edited role | the account's rights, e.g. `content@instance:imr` | the same after |
| The admin list | `off` or `on` | the same after |
| A force | the count, `1` | `0` |
| Any other row | blank | blank |

Ids only, never a name (rule D2): role and group ids, rights and scopes. A cell is capped at 1,000 characters (a cell
holds 50,000) and goes through `safe_`. Old rows stay blank: the tab is history, never rewritten. #1554's
`rights <before> > <after>` row type stops being written; its rows already written stay.

**What the column change needs (rules D3 and D4).**
- D3: a `Code.gs` change with its changes file; `VERSION` assigned by the integrator at merge. `AUDIT.HEAD` gains the
  two names; the tab's header is widened once by `headUp_`, as the Groups and Group settings tabs were.
- The script's own readers (`grantAudited_`, `joinAudited_`, `rightsAudited_`) read columns 3 to 6 by position; columns
  7 and 8 at the end leave them as they are. Columns are positional: never move one (spec/sync.md "Tabs").
- D4: no app and no admin page reads the Audit tab today (checked: `admin.js` names it only in help text and errors),
  so there is no gate. A later Audit view in the admin turns on at that version.
- AGENTS.md asks first for a sheet column change: Pierre gave that OK on 2026-11-26; the PR quotes his words from the
  ledger.

## 5. Recommendation, the PR plan, and #1554

**Recommendation: option C.** It is the only option that gives all three pages Pierre named. It is the pattern of the
larger systems (Azure, Google Workspace, Keycloak). It keeps the guards of Q408: union, no deny, the code hash, `grant`
for anything that gives rights, a merge that drops rights. B is cheaper, but its Roles page holds presets that drift
from the groups. D does more than this app needs.

**#1554: merge it as it is**, once Pierre OKs the calls still open (question 8). Its one audited write is what every
option builds on, and its tests trace every write. Its subject scope is the narrower half of what he now asks; option
C's migration reads it. Drop its planned follow-up (a subject picker on the Groups page): plan PR 4 replaces it.
Reworking it first would cost a review round on `Code.gs`, and PR 3 replaces its one-scope rule anyway. The cost of
merging as is: its `rights <before> > <after>` rows enter the Audit history until PR 1 retires the row type. Few
rights change in that window, and the rows stay readable.

**The PRs, in order.** `Code.gs` PRs go one at a time (rule W27). Agent time from `python3 tools/effort.py --estimate`:

| # | PR | Type, size | Agent time (closest merged PRs) |
| --- | --- | --- | --- |
| 0 | #1554, as it is | ready | none left |
| 1 | Audit Before and After columns; `rightsWrite_` fills them; the row type of #1554 retired | sheet M | median 27 min, 24-45 min (#1346, #1349, #1566, #1573, #1585) |
| 2 | The guardrails on today's groups: the counts under the lock, `last`, `force`, the Alerts line; and in the admin, the warning and the typed REMOVE (today an unknown answer shows only "Not done (last)", `admin.js` `rightsErr`) | sheet+admin M | median 73 min, 49-82 min (#1385, #1414, #1474, #1566, #1568) |
| 3 | Roles and assignments in the script: two tabs, `can_`, subject lists, the migration, the gates | sheet L | median 3.7 h, 1.9-4.3 h (#1354, #1357, #1414, #1474, #1509) |
| 4 | Admin: the Roles page, role chips on Groups, direct roles on the player's bar | admin L | median 3.6 h, 28 min-12.4 h (#1330, #1336, #1393, #1435, #1582) |
| 5 | The rule on additive rights, ROADMAP, SECURITY, a decision record | docs S | median 8 min, 5 min-1.5 h (#1327, #1453, #1501, #1555, #1599) |

Total, the sum of the medians: about 9 agent hours, most of it PRs 3 and 4 (#1354, #1330). PRs 1 and 2 are useful in
any option and can go right after #1554. PR 3 waits for questions 1-5 (a data format and a migration: costly to undo).
REE-37 (each cohort's trainer lines, Q448) then builds on PR 3; REE-65 (rights in the load reply) after it.

## 6. Questions for Pierre

Numbered for this study only. Each has options and a recommendation. Questions 1, 5 and 6 amend earlier answers
(Q408 1 and 6, #1554's one scope); they are said as such.

1. **Roles and groups, two linked concepts.** A role is a named set of rights; a group is people and settings; a
   group or a person holds roles. (a) Yes, option C. (b) Option B: groups keep their rights, the Roles page holds
   presets. (c) Keep today's model (A). *Recommendation: (a).* It amends Q408 (1): rights reach a group through roles.
2. **Where the scope sits.** (a) On each assignment: "Trainers holds Trainer over fish and sea slugs"; one group can
   hold Trainer over fish and Curator over the whole instance. (b) On the group: all its roles share one scope.
   *Recommendation: (a)*, as Azure and Moodle do; the page offers the group's last scope as the default.
3. **Which rights a subject list can limit.** (a) `content`, `live` and `cohorts` only; `players`, `settings` and
   `grant` hold at the instance (#1554's narrower reading). (b) Every right. *Recommendation: (a).* A manager for one
   subject can come later, as its own question.
4. **Who holds `grant`.** (a) Only the built-in **Manager** role: it can be renamed, but its `grant` cannot be removed,
   and no other role can take `grant`. (b) Any role may carry `grant`. *Recommendation: (a)*: one place to look, and a
   role edit can never turn every trainer into a manager.
5. **Roles given to one person directly.** (a) Yes: an Assignments row with the account's code hash, given from the
   player's bar. (b) No: a "group of one", as Q408 (1) said. *Recommendation: (a)*: what he asked for, at little cost
   once the Assignments tab exists.
6. **The guardrails' scope.** "One admin per instance": Admin is platform wide (Q408, answer 6). (a) At least one
   account on the admin list, and at least one manager per instance. (b) An admin per instance, which reopens
   Q408 (6). *Recommendation: (a)*, with section 3 as written: stop only the move to zero, a typed REMOVE to force, an
   Audit row, the token never counted. A player's own delete is never stopped.
7. **"A cohort learning two subjects".** A cohort's subjects are not a right: every player plays every open subject,
   and a group's Beta opens one subject in beta. (a) He meant a cohort's trainer, who follows the cohort in two
   subjects: covered by question 2. (b) He meant a group opening two betas: the Beta cell becomes a list (a group
   setting, additive). (c) Something else. *Recommendation: ask which; (a) needs nothing more.*
8. **#1554's six open calls** (REE-31 comment of 2026-11-24). His 2026-11-26 points settle three: a right at the
   instance holds in each subject (call 3, yes); a list of subjects replaces "one scope per group" (call 2, superseded
   by C, kept until PR 3); the Audit columns replace the `rights a > b` row (call 6, superseded by PR 1). Call 1 is
   question 3 here. Left: deleting a group that carries rights asks `grant` (call 4), and a removal takes the
   account's rights away first, so a failed Audit row stops it (call 5). Then, for #1554 itself: (a) merge it as it
   is; (b) rework it first, keeping only the one audited write (no subject scope, no `rights a > b` row); (c) close
   it and fold the audited write into PR 3. *Recommendation: OK to calls 4 and 5, and (a)*: it is green and reviewed,
   every option needs it, and the `rights a > b` rows written before PR 1 stay as readable history.
