# A rights model for Reef ID: roles, groups, and who holds what where (design study, 2026-11-26, Fable)

Status: a read-only design study for REE-31. It changes no code, no sheet tab and no rule. Pierre's choices are the
numbered questions in section 2; the integrator gives them Q numbers. Written against `main` at ed12f04d, PR #1554 at
its head 9beb84ee, and the sync sheet as read on 2026-11-26 about 09:00 Manila (counts only, section 10). An independent
study of the same question is being written in parallel; this one was written without reading it.

## 1. The answer in short

**Recommendation: keep groups and roles as two concepts, and give rights through a third, small one: the
assignment.**

| Word | What it is | Who makes it | Example |
| --- | --- | --- | --- |
| **Right** | one thing the code checks | the code: a fixed list, never typed by hand | Host live games, Content, Manage players, Give rights |
| **Role** | a named set of rights | Pierre, on a Roles page, by ticking rights | Trainer = Host live games + Cohorts |
| **Group** | a named set of people, with its settings | a manager, on the Groups page | Staff, Cohort A |
| **Assignment** | one line: *this role, to this person or this group, on the whole instance or on these subjects* | whoever holds Give rights | P3: Trainer, on Fish and Sea slugs |

What a person may do is the union of the assignments that reach them, directly or through a group they are in. Nothing
ever subtracts. That is the shape Azure, Kubernetes, Moodle, Google Workspace and GitHub all arrived at (section 8).

**His three examples:**

| Pierre's example | Recommended model | Today's model with #1554 as written |
| --- | --- | --- |
| A trainer for fish and sea slugs | one line: P3, Trainer, Fish + Sea slugs | two groups, "Trainers (fish)" and "Trainers (sea slugs)", P3 in both: a group has one subject |
| A curator for corals and fish | one line: P4, Curator, Corals + Fish | two more groups |
| A cohort learning two subjects | the group "Cohort A" with its Subjects setting on Fish + Sea slugs: a setting, not a right (question 8) | no place for it: a group without rights stores no scope |

A role still goes to a group when a team shares it: the group Curators holds Curator on the whole instance, which is
how today's three rights groups carry over (section 10).

With three subjects there are seven possible subject lists. In the model built today, each list a role is ever given
on needs its own group; in the recommended one there are two roles, and the list sits on the line.

**Is a role a group?** No. A group answers *who*, a role answers *what*, and the assignment answers *where*. Today's
rights groups (Managers, Curators, Trainers) are each all three at once, which is why one of them cannot be given on
fish to one person and on sea slugs to another without making more groups. NIST draws the same line: "a group is a
collection of users, rather than a collection of permissions" ([RBAC FAQ](https://csrc.nist.gov/projects/role-based-access-control/faqs)).

**Is it still his Linux ACL idea (2026-11-18)?** Yes, and closer to it than today's model. An ACL is a list, kept on an
object, of entries for named users and named groups (acl(5): "ACL_USER entries denote access rights for users
identified by the entry's qualifier", and the same for ACL_GROUP). The list of assignments is that list: the object is
the instance or some of its subjects, each entry names a person or a group, and the role is the entry's set of
permissions. What stays unlike Linux is what he already decided on 2026-11-19 (Q408, question 2): no mask, no deny, no
"first match decides". Only a union.

**What it costs.** It would be the third format of the rights since 2026-11-16: the Roles tab, then groups that carry
rights, then this. The data is small (8 memberships and 1 admin row today), so the migration is four lines and changes
nobody's rights (section 10). The honest runner-up, if he prefers no migration at all, is alternative A′ in section 7:
keep groups that carry rights, let a group's rights name several subjects, and make "a person" a group of one.

**Today only the admin token changes rights**, and it holds every right. The model starts to matter the day a manager
acts with their own account (the Workspace, REE-172).

## 2. What Pierre decides

Numbered for this study only. Each has my recommendation; sections 3 to 10 hold the reasons.

1. **The model.** Roles apart from groups, given by assignments to a person or a group, on the whole instance or a
   list of subjects (B). Alternatives: A′, groups keep carrying rights, with subject lists, role templates and groups
   of one; or A, today's model as #1554 builds it. *Recommendation: B.* This reopens Q408's question 1 ("no right is
   given to an account outside a group") for the one case he now asks for: a role given to one person.
2. **Two built-in roles, the rest are yours.** Admin and Manager are fixed by the code: they cannot be edited, emptied
   or deleted. The reason is his own sentence, "at least one admin and one manager": the two words then mean the same
   thing on every instance and in every document, and a known-good Manager is always there to give. The guard of
   question 6 does not need the lock (it counts by what an account can do), so Manager could also be left editable.
   Every other role (Trainer and Curator to start with) is made, named, changed and deleted on the Roles page.
   *Recommendation: yes, both fixed.*
3. **Where a role applies.** The whole instance, or a list of its subjects, chosen on each assignment. A role given on
   the whole instance applies in every subject the instance carries, including one added later. Only the rights about a
   subject's content or games (Content, Host live games, Cohorts) can be limited to subjects; Manage players, Settings
   and Give rights are about the whole instance and stay there. *Recommendation: yes.* This moves the scope from the
   Rights column (Q447) to the assignment, and replaces #1554's "one subject per group" by a list.
4. **Who may give rights.** Three lines, nothing else:
   - an Admin, or the admin token: everything, the admin list included;
   - whoever holds Give rights on the instance (the Managers): makes and changes roles, gives and takes any role but
     Admin anywhere in the instance, and changes the members of a group that holds a role; their own account included,
     marked "(self)" in the audit (Q364);
   - nobody else. Manage players alone never changes a right.

   *Recommendation: yes.* It is today's rule, restated for roles. The stricter rule of Kubernetes (nobody gives a
   right they do not hold themselves, section 8) would force a Manager to hold Content before naming a Curator, against
   Q364's separation.
5. **Which groups may hold a role.** A group made for it: empty when it receives its first role, then filled one
   person at a time by Give rights, each bound to their code; or a group that already holds a role. A group that
   already has members and holds no role (Staff, a cohort, a beta group) is refused, as the script refuses a group's
   first right today, and a group that players join by a code (Q345) can never hold one. *Recommendation: yes, keep
   today's refusal.* It follows his words of 2026-11-18 as SECURITY.md records them ("Staff" is not a role) and the
   practice the spec records (settings and rights in separate groups), and a role given to one person now covers the
   case that needed a group of one.
   The alternative lets a manager give a role to a group with members after one confirm that lists them, each bound
   to their code at that moment, one audit row each. It would reopen two decided points (Q408's refusal of a first
   right while a group has members; settings and rights never mixed in one group), and a board group given a role
   could no longer be managed with Manage players alone.
6. **Never without an admin and a manager.**
   - *A manager* is counted by what the account can do, not by a name: a live account, its code unchanged since the
     right was given, that holds Give rights on the whole instance. *An admin* is the same on the admin list.
   - Every path that would bring either count to zero **warns and stops**: taking a role away, removing a member,
     deleting a group or a role, deleting, archiving or merging the account.
   - **Forcing**: the last manager, by an Admin or the token; the last admin, by the token only; in both cases after
     typing the instance's name, and written to the audit as `forced`. A person deleting their own account may force it
     for themselves the same way: nobody is kept in the app against their will.
   - "One admin per instance" and Q408's answer 6 ("admin … c'est le seul rôle inter-instances") fit together: Admin
     stays one short list of people, across instances, never given to a group; the guard counts the admins listed on
     the instance's own sheet.

   *Recommendation: yes to the four.* Section 5 shows why no click can lock an instance completely.
7. **The audit's two columns.** Before and After are added at the end of the Audit tab. Each rights row holds what
   changed, before and after, as ids and right names only (section 6), and each account whose rights change gets its
   own row with its rights before and after. *Recommendation: yes.*
8. **A cohort's subjects.** A group gets a Subjects setting: every subject, or a list. It says what the group is
   about: its board, what its trainers follow, later its course. It never closes a subject to a player, so it stays a
   setting, not a right, and it adds like every setting. It is a new column in Group settings, built with the first
   feature that reads it. *Recommendation: yes.* The alternative makes playing a subject a right ("Learner"), which
   means subjects are closed unless given: a change for every player, not recommended now.
9. **Each cohort's trainers (Q448).** He approved "lines in the Groups tab" on 2026-11-21 without the detail. In the
   recommended model the same fact is an assignment whose "where" is a cohort: P3, Trainer, Cohort A.
   One store instead of two, and still no new trainers' group each month (his objection of 2026-11-19).
   *Recommendation: yes, built in REE-37.*
10. **#1554.** Amend it before it merges, not after (section 9): keep its one audited write, its tests and four of
    its six pending calls; replace its `rights <before> > <after>` row by the two columns; do not ship its
    "one subject per group" format. *Recommendation: yes.*
11. **The sheet changes this needs** (always asked first): two columns at the end of the Audit tab (already approved);
    two new tabs, the roles and the assignments; later one column in Group settings (question 8). The Roles tab and
    the Rights column stay as the record of before, read by nothing, never deleted. *Recommendation: yes.*

Not a question, a suggestion: IMR has one manager and one admin today, the same account as far as the seed tells
(section 10). GitHub recommends "that at least two people within each organization have the owner role"
([GitHub](https://docs.github.com/en/organizations/managing-peoples-access-to-your-organization-with-roles/maintaining-ownership-continuity-for-your-organization)).
A second manager would make the guard of question 6 a safety net instead of a daily companion.

## 3. What stays as decided, and what his words of 2026-11-26 reopen

**Kept, unchanged by the recommended model:**

| Decided | Where | In the recommended model |
| --- | --- | --- |
| Only additive: no deny, no mask, no "apart" | Q408, 2 | the same; an assignment only adds |
| Only Give rights changes who holds a right | Q408, 4 | the same, for roles, assignments and the members of a group that holds a role |
| A right holds only for the code it was given under | Q408 (guard 2) | the same: on a person's assignment, and on each membership of a group that holds a role |
| A merge drops rights and warns first; a delete or an archive drops them (rule D7) | Q408, 7 | the same, assignments to the person included |
| One confirm naming the rights when a person gets them | Q408, 8 | the same |
| A group's first right is refused while it has members; no list, no Add all, no join by the player's own act | Q408, 4 and the 2026-11-18 study's gate table | the same, for a group's first role (question 5) |
| "Staff" is not a role; settings and rights stay in separate groups | Pierre, 2026-11-18 (SECURITY.md); spec/sync.md "Player groups" | the same |
| Admin is apart from the groups | Q408, answer 6 | the same: the Admin role goes to people only |
| The token is the platform admin, with every right | SECURITY.md | the same |
| The pilot's name and 4-digit code are enough for every right | Q423 | the same; a stronger sign-in is REE-172 |
| A right held on the instance holds in each subject | #1554, and his words of 2026-11-26 | the same |
| One audited write for every rights change | #1554 | the same code, with two more columns |

**Reopened.** His words of 2026-11-26 do not fit four earlier points. None is resolved silently:

| Earlier | His words of 2026-11-26 | Proposed | Question |
| --- | --- | --- | --- |
| Q408, 1: no right is given to an account outside a group | roles go to groups and to individual people | a role may go to one person | 1 |
| Q447 and #1554: a group is instance wide or on one subject, written in its Rights column | a list of subjects | the list sits on the assignment | 3 |
| #1554: no column added; before and after as a new kind of row | Before and After columns approved (REE-303) | the two columns | 7, 10 |
| Q448: a cohort's trainers as lines in the Groups tab | (none; follows from 1) | assignments on a cohort | 9 |

One point looks like a collision and is not: "one admin per instance" against "Admin is the one role across
instances" (question 6, last item).

## 4. The model in detail

### Rights: a fixed list

A right is a word of the code, because the code must check it. Today: `players` (Manage players), `settings`,
`grant` (Give rights), `content`, `live` (Host live games), `cohorts`, and `platform` for the admin. A new feature
brings its right with it; nobody types one into the sheet. The script refuses an unknown right, as it does now.
`cohorts` gives nothing yet: no check asks for it until REE-37.

### Roles: defined on a page

A role is an id, a name and a list of rights. It holds no scope and no people. The Roles page shows one card per
role: its name, the rights as tick boxes in words, how many people hold it, and Duplicate. Admin and Manager show a
padlock (question 2); Manager is exactly today's Managers group's rights: Manage players, Settings, Give rights.

Changing a role changes at once what every holder may do. So ticking a right asks one confirm with the number of
holders, and the audit gets one row for the role and one per holder (section 6). Deleting a role is refused while
anyone holds it.

### Groups: people and settings, as today

A group keeps its members and its settings (Board, Beta, later Subjects). It no longer carries rights of its own: its
Rights column is read by nothing after the migration. A group that holds a role is shown with the key, as now.

### Assignments: who, what, where

One line: the holder (a person or a group), the role, where (the whole instance, or a list of subjects; `platform` for
Admin), since when, and for a person the code hash it was given under. The same holder may have several lines. The
page, "Who holds what", is this list as a table, with "+ Give a role" (pick the person or the group, the role, where;
one confirm: "Give P3: Trainer on Fish, Sea slugs?"). Filtered on one person, it shows everything they may do and
through which line: the answer to "why can P3 do this?".

### How a check is answered

`can_(who, right, where)`, as today, with one more step:

1. The token: yes.
2. The account must be live and its code hash current.
3. Take the assignments that reach it: its own, under that hash; and those of each group it is in, where its
   membership is under that hash.
4. Yes if one of them has a role that includes the right, and covers `where`: the whole instance covers each subject;
   a list covers the subjects it names and nothing else.

A removal takes effect at the next request, as now. An unknown role, right or subject gives nothing and is logged.

### A role given to a group: the guards

A group that holds a role is what the code calls a group that carries rights, with the same guards as today: its
members are added one at a time, by Give rights only, each bound to their code; no Add all, no Remove all; a
player's own act never joins it. Four cases test the model (and every alternative of section 7):

| The group | May it receive a role? |
| --- | --- |
| empty | yes |
| already holds a role, so each member was added under Give rights and is bound to their code | yes: one confirm with the role and the number of members, one audit row per member (as another right on a rights group today) |
| has members and no role: filled by hand or by Add all (one click for a whole list; the 2026-11-18 study records one such mistake) | no, as today (question 5): their memberships hold no code hash, and nobody chose them for a right |
| has a join code (Q345, later) | never; and a group that holds a role cannot get a join code |

So no guard built since Q408 is dropped. Question 5's alternative would change the third line only.

## 5. Guardrails: never without an admin and a manager

**What can lock an instance.** Only one right cannot be repaired from inside once nobody holds it: Give rights. If
the last holder of Content goes, a manager gives it again. If the last manager goes, an admin names another. If the
last admin goes, the token names one. So the two counts that matter are the ones he named.

**The count is by effect.** A manager is a live account, its code unchanged, holding Give rights on the whole
instance, through any role, directly or through a group. A role he makes himself that includes Give rights therefore
counts, and a membership shown "rights off: the code changed" does not. Counting by the name "Manager" would break the
day a role is renamed or a second role is given Give rights.

**Every path, one check.** Since #1554, every rights change goes through one function. The check sits there, before
anything is written:

| Path | Last manager | Last admin |
| --- | --- | --- |
| Take a role from a person | warns and stops | warns and stops |
| Take a role from a group, or delete the group | warns and stops | n/a: Admin is never given to a group |
| Remove a member from a group that holds the role | warns and stops | n/a |
| Untick Give rights on a role, or delete the role | warns and stops (Manager itself is fixed) | n/a: Admin is fixed |
| Delete, archive or merge away the account (by a manager) | warns and stops, before anything of the account goes | the same |
| The person deletes their own account | warns and stops; they may force it for themselves | the same |
| A name taken again after a delete | already counted at the delete | the same |

**The warning.** "P1 is the last manager of IMR. Without a manager, only an admin can give rights here." The request
answers `last` and writes nothing but an audit row with that result. **Force…** then asks to type the instance's name;
the forced request is written with the result `forced` and its Before and After. Who may force is in question 6.

**Why nobody can lock an instance completely.** Two keys are not stored in any tab, so no click in the app can remove
them: the admin token (whoever can push to the repository holds every right, SECURITY.md), and the owner of the
spreadsheet, who can always write a line in a tab by hand. The ladder is: a manager; else an admin names one; else the
token names an admin; else the sheet's owner writes the line. Microsoft does the same in Entra ID: it "prevents the
last Global Administrator account from being deleted" and still tells organisations to keep emergency accounts and to
watch every use of them
([Entra](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/security-emergency-access)).
A line written by hand has no audit row: the page can show it as "not in the audit" (the script already knows which
grants have their row).

**A standing line.** The page shows "Admins: 1 · Managers: 1" at the top of "Who holds what", in the warning colour
when either is 1.

## 6. The audit: Before and After

The Audit tab gets two columns at its end: Time, Admin id, Action, Scope, Result, Target id, **Before**, **After**.
Earlier rows keep the two cells empty. The code that reads the tab reads its columns by position (Action to Target
id), so nothing it reads moves. As today: ids only, never a name, never a code hash; nothing is ever rewritten.

| Change | Action | Target id | Before | After |
| --- | --- | --- | --- | --- |
| A role made | `role make` | the role's id | `-` | its rights: `live,cohorts` |
| A role's rights changed | `role rights` | the role's id | `live,cohorts` | `live` |
| A role deleted | `role drop` | the role's id | its rights | `-` |
| A role given | `assign <role id>` | the holder: a person's anonymous id, or a group's id | `-` | where: `subject:fish,subject:seaslug` |
| Its "where" changed | `assign <role id>` | the holder | `instance:imr` | `subject:fish` |
| A role taken away | `unassign <role id>` | the holder | where it was | `-` |
| A member in or out of a group that holds a role | `join <group id>`, `leave <group id>` | the member's anonymous id | the member's rights before | after |
| Each account whose rights change through a role, a group or an assignment | `rights (via <id>)` | the account's anonymous id | its rights before: `live@instance:imr` | after: `live@subject:fish` |
| A change the guard stopped | the action | as above | `managers 1` | `managers 0`, Result `last` |
| The same, forced | the action | as above | `managers 1` | `managers 0`, Result `forced` |

The marks of today stay in the Action: `(self)`, `(account removed)`, `(migration)`. A rename of a role or a group
writes its row without the names: a name is free text, and the tab holds ids only.

**Why a row per account.** It is what makes the columns worth having: "what could P3 do on 2026-12-01?" is the After
of P3's last row before that date, read by a filter, with no replay. It costs one row per person touched; the rights
population is 8 today.

**Never without its row.** Kept from #1554: a rights change whose audit row cannot be written answers an error, and
its retry writes the row.

**Reading it.** A History view on the Rights page: the rights rows, newest first, filtered by person, role or group,
Before → After side by side. Google's admin audit log records the same events (`ASSIGN_ROLE`, `UNASSIGN_ROLE`,
`ADD_PRIVILEGE`, `REMOVE_PRIVILEGE`, with the role, the user and the organisational unit:
[Admin audit events](https://developers.google.com/workspace/admin/reports/v1/appendix/activity/admin-delegated-admin-settings)).

## 7. Alternatives considered

| | His wishes of 2026-11-26 | Cost | Why not |
| --- | --- | --- | --- |
| **A. Today, with #1554 as written.** Groups carry rights; a group is instance wide or on one subject | a page for roles: the Groups page; individuals: a group of one; a list of subjects: no | nothing to build | his example "a trainer for fish and sea slugs" needs two groups, and before and after are not in columns |
| **A′. Groups keep carrying rights, loosened.** A group's rights may name several subjects; a "role" is a template that fills a new group's rights; a person is a group of one | all, in a way | the smallest: one refusal lifted in #1554 (its `can_` already reads a mixed cell entry by entry), a list of templates on the page, no migration | a group per role and subject list ever used; a template is a copy, so changing "Trainer" later changes no existing group (or it becomes roles by reference under another name); "who trains fish?" means reading several groups; groups of one fill the Groups page |
| **B. Recommended.** Roles, groups, assignments | all, directly | two tabs, a four-line migration, two pages | — |
| **C. A role is a group, nested.** Giving a role to a group puts that group inside the role's group, as nested groups in a directory | one concept, the literal reading of 2026-11-18 | medium | the subjects have nowhere to live but on the membership, which is B with other words; nested membership is hard to show, to audit and to guard |
| **D. A pure ACL, no roles.** Each subject and the instance keep their own list of people and groups with ticked rights | individuals, groups, subjects | medium | no Roles page, the first thing he asked for; changing what a trainer may do means editing every entry |
| **E. Allow and deny.** Roles with deny entries or overrides, as Moodle's Prevent and Prohibit, Discord's channel overwrites or Azure's deny assignments | more than asked | large | against Q408's "only additive", decided after "apart": two entries that disagree need an order, and the order surprises |
| **F. Roles fixed in the code**, as before Q408 | no | small | he wants to define roles |

**The honest runner-up is A′.** It is right if he expects a handful of role and subject combinations for a long time
and wants no migration. It is wrong the day a second organisation or a fourth subject multiplies the combinations
(REE-173), and moving from A′ to B later is the same migration with more groups to convert.

**Left for later, with their place kept:**
- *Give rights limited to a subject* (a fish lead who names the fish trainers). The scope rule already says what it
  would mean: it could give only roles made of rights that can live on a subject, on that subject. Not built now.
- *A table of which role may give which role* (Moodle's "Allow role assignments" tab). More to configure than IMR
  needs; question 4's three lines do it.
- *Playing a subject as a right* (question 8's alternative), if an organisation ever licenses subjects per cohort.

## 8. How comparable systems do it

Public pages, fetched 2026-11-26. A page that did not load is not cited (Canvas, Discord's help centre).

| System | Who can hold | Role | Where | Combining | Worth copying |
| --- | --- | --- | --- | --- | --- |
| [Azure RBAC](https://learn.microsoft.com/en-us/azure/role-based-access-control/overview) | "a user, group, service principal, or managed identity" | "a collection of permissions"; built-in and custom | a tree of scopes | "an additive model", plus deny assignments | "A role assignment consists of three elements: security principal, role definition, and scope": the recommended model, word for word |
| [Kubernetes RBAC](https://kubernetes.io/docs/reference/access-authn-authz/rbac/) | "users, groups, or service accounts" | Role, ClusterRole | a namespace, or the cluster | "purely additive (there are no "deny" rules)" | the binding as its own object; its no-escalation rule, quoted below the table |
| [Moodle](https://docs.moodle.org/en/Roles_and_permissions), the nearest in purpose | users | "a collection of permissions defined for the whole system", made by an administrator on [Define roles](https://docs.moodle.org/en/Managing_roles) | a context: system, category, course, activity; a role given in one applies to "the current context and all lower contexts" ([Assign roles](https://docs.moodle.org/en/Assign_roles)) | several roles merge; [overrides](https://docs.moodle.org/en/Override_permissions) with Prevent and Prohibit | a page to define roles; teacher of *this* course, not of the site; its overrides are alternative E |
| [Google Workspace](https://knowledge.workspace.google.com/admin/users/create-edit-and-delete-custom-admin-roles?hl=en) | a user, or "a group or service account" ([assign roles](https://knowledge.workspace.google.com/admin/users/assign-specific-admin-roles?hl=en)) | pre-built and custom, a set of privileges | "some roles" on organisational units | not said on the pages read (a union, my reading) | Super Admin cannot go to a group: "any role except Super Admin"; the same line as Admin here |
| [GitHub](https://docs.github.com/en/organizations/managing-peoples-access-to-your-organization-with-roles/roles-in-an-organization) | "individuals or teams" | predefined, and custom on GitHub Enterprise Cloud | the organisation, or a repository | not said on the pages read (a union, my reading) | roles to people and to teams; the advice to keep at least two owners |
| [Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/security-emergency-access) | (page read for its emergency accounts only) | Global Administrator | the organisation | — | it "prevents the last Global Administrator account from being deleted", and still asks for two or more emergency accounts, each use watched |
| [Django](https://docs.djangoproject.com/en/5.2/topics/auth/default/) | users and groups | none: permissions go straight to a user or a group | the whole site | union | it is alternative A: "A user in a group automatically has the permissions granted to that group" |
| [Slack](https://slack.com/help/articles/360018112273-Types-of-roles-in-Slack) | people | fixed | the workspace | — | "a single Primary Owner", the only one who can "transfer ownership to someone else": ownership is handed over, not dropped (my reading) |
| [Discord](https://docs.discord.com/developers/topics/permissions) (rules written for bots) | members | made by the server's managers | the server; overwrites per channel | union, then per-channel deny | "A bot can grant roles to other users that are of a lower position than its own highest role"; its denies are alternative E |
| Linux ACL, [acl(5)](https://man7.org/linux/man-pages/man5/acl.5.html) | named users, named groups | none: permission bits per entry | one file | first matching class decides, capped by a mask | the list on the object, with people and groups side by side |

Kubernetes on who may give, for question 4: "You can only create/update a role binding if you already have all the
permissions contained in the referenced role (at the same scope as the role binding) or if you have been authorized to
perform the `bind` verb on the referenced role." Its `bind` is our Give rights.

Three things to take from them, each no wider than its source:
- Azure and Kubernetes make the assignment its own object: a holder, a role, a scope.
- Where a system has both groups and roles (Azure, Kubernetes, Google Workspace, GitHub), a group is one kind of
  holder of a role, never the role itself.
- The top role is guarded, each system in its own way: Google keeps Super Admin for people, Entra refuses to delete
  the last Global Administrator, GitHub advises two owners. None of the pages read describes a forced removal.

## 9. What it means for #1554

#1554 is green on its head and waits for Pierre on six calls (the comment on REE-31, 2026-11-24). Its two halves fare
differently.

**The half that stays, whatever he answers to question 1:** `rightsWrite_`, the one function that writes every
rights change with its audit rows; the test that traces every write to the three stores and fails if one bypasses it;
the removal of an account's rights before anything else of the account. The guard of section 5 and the columns of
section 6 both sit in that function.

**The half his words of 2026-11-26 have overtaken:**
- its Rights-cell format with a rule of *one scope per group, one subject at most*. He now asks for a list;
- its new Audit row, `rights <before> > <after>`, which its own description calls "a new, permanent row type in the
  Audit tab's history". He has approved two columns instead.

Neither is in the sheet today: no Rights cell names a subject, no such row exists, and the Audit tab has six columns
(read on 2026-11-26). **So the cheap moment to change them is before the merge.** Merged as written, the row type
stays in the history for good, and the format would need a second migration.

**Recommendation: amend #1554, then merge it.**

| Its pending call (REE-31 comment) | Recommendation |
| --- | --- |
| 1. Only Content, Host live games and Cohorts can be held on a subject | **Keep** (question 3) |
| 2. A group has one scope; a group without rights is instance wide | **Change**: a list of subjects. Under B the Rights cell takes no subject at all and this part leaves the PR; under A′ it is the one refusal to lift |
| 3. A right held on the instance is valid in every subject, Give rights included | **Keep**: his words of 2026-11-26 say the same |
| 4. Deleting a group that carries rights asks for Give rights | **Keep** |
| 5. A delete, a merge or an archive removes the rights first | **Keep**, with the guard's check before it |
| 6. Before and after as a new kind of row, no column | **Change**: the two columns (question 7) |

The amended PR is then "one audited write, the two columns, the guard", on today's groups. It gives him the guard and
the audit he asked for without waiting for the model. The check `can_` makes at a subject, and the live game that asks
for its own subject, can stay in it: they are the same under A′ and B.

## 10. Migration of today's data

**Today** (the sheet read on 2026-11-26 about 09:00 Manila; counts only, no name read):

| | Count |
| --- | --- |
| Groups | 7: Staff, Sea slugs beta, two cohorts, and three that carry rights |
| Managers (Manage players, Settings, Give rights) | 1 member |
| Curators (Content) | 4 members |
| Trainers (Host live games, Cohorts) | 3 members |
| Every right's scope | the whole instance; no subject anywhere |
| The admin list | 1 account |
| The Roles tab | 4 rows: the admin's, and 3 kept as the record of before |
| The Audit tab | 68 rows, 6 columns |

Both counts of question 6 are at their minimum: one manager, one admin.

**To the recommended model**, one step run once under the script's lock, as the two migrations before it (rule W3):

1. Four roles are written: Admin and Manager (fixed), Curator (Content) and Trainer (Host live games, Cohorts), the
   last two with the rights their groups carry today.
2. Four assignments are written: the group Managers holds Manager, the group Curators holds Curator, the group
   Trainers holds Trainer, each on the whole instance; the admin's account holds Admin, under the code hash its row has.
3. The groups keep their ids, names, members and each membership's code hash. So the 8 memberships give exactly the
   rights they give now, and nothing is rewritten per person.
4. The step computes every account's rights before and after, and finishes only if they are equal for all; otherwise
   it writes nothing and says so in the Deploy log.
5. Four audit rows, `assign … (migration)`, Before `-`, After the scope. No row per person: nobody's rights change.
6. Nothing is deleted. The Rights column and the Roles tab stay as the record, read by nothing.

Until the step has run, the script reads the rights as the step will write them, as it did twice before. The admin
page shows the Roles and Who holds what pages only from that script version on (rule D4). The app reads no right
today; when it does (REE-65), the load reply's `rights` list is the same under every alternative.

**Afterwards, by hand and only if he wants it:** a fish-only trainer is one new line; turning "the group Trainers
holds Trainer" into a line per person with their subjects is seven lines at most (3 trainers, 4 curators).

**To A′ or A:** no migration.

## 11. PRs and agent time

In order, under B. Times from `python3 tools/effort.py --estimate`.

| # | PR | Type, size | Agent time |
| --- | --- | --- | --- |
| 1 | #1554 amended: the two Audit columns in place of the `rights … > …` row, the guard and its `last` and `forced` answers, the one-scope format cut | sheet L | median 3.7 h, range 1.9 h-4.3 h (#1354, #1357, #1414, #1474, #1509) |
| 2 | Roles and assignments in the script: the two tabs, `can_`, the rule of question 4, a role given to a group (question 5), the migration and its before-reader, the audit rows of section 6 | sheet L | median 3.7 h, range 1.9 h-4.3 h (#1354, #1357, #1414, #1474, #1509) |
| 3 | The admin's pages: Roles, Who holds what, History, the guard's warning and Force, gated on PR 2's version | admin L | median 3.6 h, range 28 min-12.4 h (#1330, #1336, #1393, #1435, #1582) |
| 4 | The rule, the specs, SECURITY and the decision record | docs S | median 8 min, range 5 min-1.5 h (#1327, #1453, #1501, #1555, #1599) |

PR 1 does not wait for question 1; it waits for questions 6 (the guard), 7 (what the two columns hold) and 10. PRs 2
to 4 wait for questions 1 to 6 and 11 (a data format and a migration: costly to undo). REE-65 (rights in the load reply) and REE-37 (question 9) follow PR 2. `Code.gs` is a sensitive file (rule
W27): PRs 1 and 2 go one after the other.

## 12. What I checked, and what I could not verify

**Checked.**
- `main` at ed12f04d: `tools/sync/Code.gs` (`ROLES`, `RIGHTS`, `can_`, `gate_`, `audit_`, `grantAudited_`,
  `joinAudited_`, `rightsAudited_`, `users_`), docs/spec/sync.md "Rights and the Audit tab" and "Player groups",
  docs/SECURITY.md, docs/spec/admin-players.md "Groups", the 2026-11-18 study and its decision, ANSWERS.md for Q342 to
  Q349, Q364, Q365, Q408, Q423, Q447 and Q448.
- #1554 at 9beb84ee: its description, its file list, and in its `Code.gs` the functions `scopeOf_`, `rightParse_`,
  `groupScope_`, `can_` and `rightsWrite_`; its decision record. Its `can_` already reads a cell that mixes scopes
  entry by entry; only `groupScope_` refuses a second subject.
- The request list of `users_`: no request changes or resets an account's code. So a membership's code hash stops
  matching only when its name is freed and taken again.
- Linear, read only: REE-31 with its two comments, REE-37, REE-65, REE-172, REE-173, REE-303.
- The sync sheet, read only: the Group settings tab; the Group column of the Groups tab; the Role, Scope and Since
  columns of the Roles tab; the Audit tab's header and its Action, Scope and Result columns. No name column was read.
- The public pages of section 8, each fetched on 2026-11-26. I read the Azure and Entra pages in full; the other quotes
  are as the fetch tool extracted them from the page.
- #1554's checks on 9beb84ee: 25 check runs, all passed (GitHub's API).

**Not verified.**
- Pierre's words of 2026-11-26 reached me as a digest in my brief, not as his sentences. Only the two Audit columns
  are recorded where I could read them (REE-303). Questions 3, 6 and 8 rest on that digest.
- That the one admin row and the one Managers membership are the same account: I read no name. The seed
  (`rolesSeed_`) gives both to the admin's account, and the dates agree.
- Nothing here was run: no test, no script, no page. The agent times are the tool's medians for the type and size, not
  measurements of this work.
- Canvas and Discord's help pages did not load and are not cited. Discord's rules are quoted from its developer
  documentation, where they are written for bots.
- Whether Entra's or GitHub's rules on a last owner hold on every plan: I quote what their pages say, no more.
