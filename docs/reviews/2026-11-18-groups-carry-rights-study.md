# Groups that carry rights: one concept for groups and roles (design study, 2026-11-18)

Status: a read-only design study. It changes no code, no sheet tab and no rule. Pierre's choices are the numbered
questions in section 6; the integrator gives them Q numbers. Written against `main` at 955a089c, reading the
"apart" setting as gone (#1113, open: no apart, the general board shows everyone).

## 0. The idea and the answer in short

Pierre, 2026-11-18, about 19:15 Manila:

> "Tu sais ce que sont les ACL sous Linux? Pourquoi on ne traite pas les droits et les groupes comme un même concept? Et
> plutôt que de rentrer les joueurs dans des groupes, on créé les groupes avec les paramètres et droits associés, et puis
> ajoute des groupes à chaque joueur."

In English: why not treat rights and groups as one concept? Make groups with their settings and rights, then give each
player a list of groups.

**Recommendation: yes, with four guards.** A group carries settings and rights. A player has a list of groups. What
a player may do is the union of their groups' rights, and every setting only adds. The Roles tab becomes groups once
(rule W3). The four guards:

1. Only an account holding `grant` at the right's scope may change a rights group's members or its rights. The
   `players` right alone is not enough.
2. A membership in a group that carries rights is bound to the account's code hash, as a grant is today.
3. A merge never moves a rights membership. A delete or an archive drops it, and the Audit tab records each one.
4. No setting and no right ever subtracts: no deny entry, no mask, no "apart".

This is RBAC (roles as sets of permissions) whose roles Pierre makes and names himself. It is not the Linux model:
in Linux, groups carry no rights at all (section 1).

## 1. What Linux does, and what maps

Sources read for this section (public pages, fetched 2026-11-18):
- [acl(5)](https://man7.org/linux/man-pages/man5/acl.5.html)
- [credentials(7)](https://man7.org/linux/man-pages/man7/credentials.7.html)
- [initgroups(3)](https://man7.org/linux/man-pages/man3/initgroups.3.html)
- [capabilities(7)](https://man7.org/linux/man-pages/man7/capabilities.7.html)
- [gpasswd(1)](https://man7.org/linux/man-pages/man1/gpasswd.1.html)
- NIST's [RBAC FAQ](https://csrc.nist.gov/projects/role-based-access-control/faqs)
- Wikipedia's [Role-based access control](https://en.wikipedia.org/wiki/Role-based_access_control)

### POSIX permissions and supplementary groups

- **Rights live on the object.** A file carries an owner, a group and three sets of bits (owner, group, other). A user
  carries only an identity: a user id, a primary group, and a list of supplementary groups. credentials(7) calls the
  supplementary groups "a set of additional group IDs that are used for permission checks when accessing files and other
  shared resources".
- **How the list is built.** initgroups(3) builds it "by reading the group database /etc/group". A child process
  inherits it across fork() and execve() (credentials(7)).
  - The pages read do not say when a change to /etc/group reaches a process that is already running.
  - Labelled guess (rule W11): a process keeps the list it was given, so a new membership counts only from the next
    login.
- **Who changes a group's members.** gpasswd(1) says "System administrators can use the -A option to define group
  administrator(s)". The page does not say whether those administrators may add or remove members (`-a`, `-d`).
- **root bypasses everything.** capabilities(7): "Privileged processes bypass all kernel permission checks";
  `CAP_DAC_OVERRIDE`: "Bypass file read, write, and execute permission checks"; `CAP_SETGID`: "Make arbitrary
  manipulations of process GIDs and supplementary GID list".

### POSIX ACLs

An access ACL (acl(5)) is still attached to the object. It holds:
- `ACL_USER_OBJ`, the owner's entry;
- named `ACL_USER` and `ACL_GROUP` entries, each naming one user or one group;
- `ACL_GROUP_OBJ`, the owning group's entry;
- `ACL_MASK`, which "denotes the maximum access rights that can be granted by entries of type ACL_USER, ACL_GROUP_OBJ,
  or ACL_GROUP";
- `ACL_OTHER`, for everyone else.

The check runs in order, and **the first class that matches decides**:
1. The owner gets the owner entry and nothing else.
2. A named user gets their named entry, capped by the mask.
3. If any of the process's groups matches the owning group or a named group, access is granted when "the ACL_MASK entry
   and any of the matching ACL_GROUP_OBJ or ACL_GROUP entries contain the requested permissions". Otherwise access is
   **denied**, even when `other` would have allowed it.
4. Otherwise `other` applies.

A **default ACL** sits on a directory. A new file or directory created inside it "inherits the default ACL of the
containing directory as its access ACL".

### RBAC

NIST's FAQ draws the line between groups and roles:
- **Groups are sets of users; roles are sets of permissions.** "RBAC requires all access through roles, and permissions
  are connected only to roles, not directly to users."
- **Core RBAC** is users, roles, permissions and sessions. On top of it come role hierarchies and separation of duty,
  either static (on assignment) or dynamic (on the roles a session activates).
- Wikipedia's article adds two points:
  - "DAC with groups (e.g., as implemented in POSIX file systems) can emulate RBAC";
  - the known cost of the model is "role explosion": many roles when rights must be fine-grained per resource.

### What maps and what does not

| Linux / RBAC | This app | Maps? |
| --- | --- | --- |
| Supplementary groups: a user carries a list of groups | A player carries a list of groups (`Code.gs` `groupMap_` → `gids`, sheet v179) | **Yes**, already built |
| Rights are on the object (the file's ACL), groups carry none | Pierre's idea puts rights **on the group** | **No.** This is RBAC's role, not a Linux group. Pierre's model is RBAC with user-made roles |
| Several matching group entries: any one that carries the permission grants it | A player's rights are the union of their groups' rights | **Yes**: `can_` asks one right at a time, so "any one group carries it" equals the union |
| First matching class decides: a matching group with fewer bits denies what `other` allows | No order, no class: only a union | **No, on purpose.** An implicit deny by ordering is the kind of rule that surprised Pierre with "apart" |
| `ACL_MASK`: a cap on every named entry | A cap by sign-in strength (section 3, "the mask") | **Only as a fixed platform rule**, never a group setting: a mask subtracts |
| Named `ACL_USER` entry: a right given to one person | Today's Roles tab (one account, one role) | **Folded in**: a right goes through a group, as RBAC asks. A group of one is fine |
| `ACL_OTHER` | The player role, every account's, not stored (`Code.gs` `ROLES` comment) | Yes: the rights nobody has to be given |
| Default ACL on a directory | A new group made from another one ("New group like this") | Maybe later, as a convenience in the admin. Never an automatic membership |
| root, `CAP_DAC_OVERRIDE`, `CAP_SETGID` | The admin token: `can_` returns true for it, and whoever can push can change `Code.gs` | Yes: the token is root, and stays root |
| Group administrators (gshadow, gpasswd `-A`) | Who may change a rights group's members: `grant` at its scope | Yes, and stricter (section 3) |
| Group list read at login (a guess, above) | `can_` reads the tabs at every privileged request (`grants_`) | **Better here**: a removal takes effect at the next request. The app's cached `gids` follow at its next load or save |
| RBAC sessions that activate a subset of roles | None: every right of every group always counts | Not needed for the pilot |

**The lesson.** Pierre's idea is sound RBAC. It has two Linux-like traits worth keeping: the user's list of groups, and
the union across groups. The traits not to copy are ordered evaluation with an implicit deny, the mask as an editable
setting, and automatic membership.

## 2. The model for this app

### What exists today

- **Groups** (sheet v179): two tabs, plus the code that reads and writes them.
  - The **Group settings** tab (`GDEF`: Group, Name, Board, Apart, Beta, Added) holds one row a group.
  - The **Groups** tab (`GROUPS`: Group, Name, Added) holds one row a membership, by name only.
  - Read by `groupState_`, `groupMap_` and `groupBoards_`. Changed through `users_` / `usersDo_` with the `players`
    right: `userGroup` (one name, or a list of up to 2000), `groupMake`, `groupEdit` and `groupDrop` (`groupDo_`).
  - The code comment at `Code.gs` "Player groups" ends: "Roles stay apart: no group grants a right, and no grant puts
    anyone in a group."
- **Roles** (sheet v156): the **Roles** tab (Account, Role, Scope, Since, Code hash) holds one row a grant.
  - `ROLES.DEF` defines four roles:
    - `admin` at `platform`: `platform`, `grant`;
    - `owner` at an instance: `players`, `settings`, `grant`;
    - `editor` at an instance: `content`;
    - `trainer` at an instance: `cohorts`, `live`.
  - `can_(who, right, scope)` is checked through `gate_`. Every privileged endpoint calls it, and a live game's start
    calls it directly (`lvTrainer_`).
  - A grant holds only while the account's code hash is the one it was made for (`grants_`, `can_`).
  - `rolesDrop_` drops an account's grants on a delete, a merge (its from) or an archive. It never moves them.
  - Every change writes an Audit row (`audit_`, `grantPut_`, `grantAudited_`).
- **Pierre, 2026-11-18**: "Staff" is not a role, and the old trainer toggle was not fine enough for rights
  management. v179 made the staff a group, and the trainers keep their role.

### A group, from the new model on

| Field | What | Today's column |
| --- | --- | --- |
| `id` | `g:` and 8 random characters (the ids the v179 migration kept stay as they are) | Group |
| `n` | its name, 1-40 characters, unique case aside (`gname_`) | Name |
| `board` | it has its own leaderboard | Board |
| `beta` | the subject in beta it opens (`''` or a subject with `open: 'group'`) | Beta |
| `rights` | a list of `right@scope` entries, e.g. `live@instance:imr`, `follow@group:g:7f3a91c2` | **new column** (question 3) |
| `at` | when it was made | Added |

The Apart column stays in the tab, written 0 and read no more (#1113).

**Rights stay a fixed vocabulary of the code.** A group chooses among them. The admin never invents one, and the
script checks each against a list (`ROLES.DEF`'s rights today):

| Right | Gives | From |
| --- | --- | --- |
| `platform` | the code, the base database, creating instances | `admin` |
| `grant` | changing which accounts hold which rights in its scope (below) | `admin`, `owner` |
| `players` | the players' management: rename, merge, archive, delete, Leave out, settings groups' members | `owner` |
| `settings` | the instance's settings | `owner` |
| `content` | the instance's content, through the Curators' relay (Q348) | `editor` |
| `live` | hosting a live game | `trainer` (v172) |
| `follow` | reading a target group's members' progress and answers, as Q344 (a) allows | new; it narrows `trainer`'s `cohorts` |
| `invite` | the join code of a target group, which a player uses by their own act (Q345) | new; the other half of `cohorts` |

**Scopes.** A right's scope is `platform`, `instance:imr`, or `group:<id>`:
- `group:<id>` is the **target** of a right. "Trainer of RA November 2026" is `follow@group:<its id>` and
  `invite@group:<its id>`, carried by **another** group, such as "Trainers, RA November 2026". The target group's own
  members never get the right. Holders and target are always two different groups.
- Use `group:`, never `cohort:`, for the target. The v179 migration kept ids such as `cohort:<name>` as group ids, and
  ROADMAP's planned `cohort:<id>` scope would collide with them.
- `scopeOk_` becomes "this right may be given at this scope kind". `platform` goes only at `platform`. `follow` and
  `invite` go only at `group:`. The rest go at an instance.

**The union.** `can_(who, right, scope)` becomes:
- **The token**: true, as today.
- **An account**:
  1. its code hash is checked against the RAs tab;
  2. its groups are read from the Groups tab;
  3. each membership counts only when the code hash stored with it equals the account's (guard 2);
  4. the answer is true when any of those groups carries `right` at `scope`.
- Two special cases stay as today. `grant@platform` reaches every scope (Q364: the platform admin may grant himself a
  role). A right at `instance:imr` does **not** reach the instance's `group:` scopes unless the code says so for that
  right: an instance-wide `follow` is a separate choice, not implied.

### Only additive settings and rights

Every setting and every right composes by union across a player's groups. No setting may remove what another group
gives. "Apart" was the counter-example: Pierre, 2026-11-18, about 18:45, "Si quelqu'un est dans plusieurs groupes dont
certain sont appart on et d'autres appart off, qu'est-ce qu'il se passe?" (#1113's decision record). The same holds for
rights: no deny entry, no mask on a group, no "everyone but".

| Setting or right | How it composes across a player's groups | Additive? |
| --- | --- | --- |
| `board` | the player is on each board of a group that has one. The general board shows everyone (#1113) | yes |
| `beta` | the subjects opened are the union (`groupMap_` `groups`, as today) | yes |
| `apart` | did not compose. Removed (#1113) | was not |
| every right | union, per right and per scope (`can_`) | yes |
| Hide (`userBoard`, Board -1, sheet v20) | **stays per player, not a group setting**: it subtracts (off every board) | not a group setting |
| Leave out of the statistics (`statsExclude`, sheet v115) | **stays per player**: it subtracts the player's answers from the pooled statistics | not a group setting |
| A future setting with a value (a default subject, a language) | only if it can be read as a set (each group adds options), never "the group's value wins" | a test for any new setting |

So a new group setting passes one test: when it is on in any of the player's groups, it is on. Hide and Leave out fail
that test, and stay where they are.

### Settings and rights in the same group?

The model allows it: one concept, as Pierre asked. Pierre's own words on the staff show the common case is two
groups:
- **Staff** (board) is about who competes with whom;
- **Trainers** (`live`) is about who may host.

A person is in both. Giving `live` to Staff would bring back the old toggle that Pierre found "not fine enough". The
admin page therefore shows which groups carry rights (section 4) and never suggests mixing them.

## 3. Security

### Who may change a group that carries rights

Today every change to a group goes through `users_` with the `players` right. Once a group carries rights, adding a
member is a grant. So there are three gates:

| Change | Today (v179) | With rights on groups |
| --- | --- | --- |
| Add or remove a member of a group **without** rights | `players` (`userGroup`) | `players`, as today |
| Add or remove a member of a group **with** rights | n/a | `grant` at **every** scope its rights carry. `grant@platform` (the platform admin) reaches every scope; `grant@instance:imr` reaches the instance's rights and its `group:` targets, never `platform` |
| Add or change a right of a group (`groupEdit` `rights`) | n/a | `grant` at the right's scope, **and** one Audit row per current member (below) |
| Set `board` or `beta`, rename | `players` | `players` |
| Delete a group | `players`, empty only | the same, and refused while another group's right targets it (`group:<id>`): answer `used` |

Each escalation path, and what closes it:

1. **"Add a player" (`userGroup` with one name).** With only the `players` right, an account could add itself or
   anyone to a group carrying `grant` or `content`. Closed by the `grant` gate above.
2. **"Add all" (`userGroup` with up to 2000 names; `admin.js` `bindGroups` `bulk`).** One confirm would grant a right
   to every player. ARCHITECTURE records that Pierre once added everyone to the fish beta by mistake. Closed in two
   ways:
   - the script refuses a list for a rights group (`input`): one name a call;
   - the page shows no Add all or Remove all on such a group. Remove all stays possible one by one; it only removes
     rights.
3. **A right added to a group that has members (`groupEdit`).** This is a mass grant in one call. Closed by the
   `grant` gate at that scope. The page also confirms, naming the right and the number of members, and the Audit tab
   gets one row per member.
4. **The player's own join (Q345, roles step 2's join code).** It must never reach a group that carries rights: the
   script refuses a join to such a group, whatever the code. A join reaches only a group with no rights. It may be the
   **target** of someone else's `follow`, and the join card then says who follows the group and what they see (Q344
   (a), Q345).
5. **Self-add.** A holder of `grant@instance:imr` may add themselves to the Curators group, as an owner may grant
   themselves `editor` today. It stays allowed (Q364), and is audited with `(self)` as `roles_` does.
6. **A merge.** `usersDo_` `userMerge` today moves every group of the merged name to the kept one (`groupSet_ … into`,
   `Code.gs` "v48: the merged name's groups join the kept name's"), but drops its grants (`rolesDrop_`, "a grant is
   given, not merged"). Unchanged, the unified model would **move rights with a merge**: a guessed or careless merge
   would pass `grant` from one account to another. Closed by a split: settings memberships move as today, while rights
   memberships are dropped and audited (`revoke … (account removed)`, as `rolesDrop_`). Delete and archive already drop
   every membership (`deleteAccount_`, `userArchive`'s `dropRows_(GROUPS.TAB, …)`) and get the same audit rows.
7. **A name taken again.** A delete or an archive frees the name at once. A grant is safe today because it holds only
   for its code hash. Memberships are stored by name only (`groupSet_`), so guard 2 adds the code hash to each
   membership of a rights group:
   - a membership whose hash is not the account's gives its settings but **no right**;
   - the admin page shows it as "rights off: the code changed" until it is removed or added again.

### The code-hash binding, kept

Two ways to store it. Either one changes a tab's column layout, which "always asks first" (AGENTS.md):

- **(A) A fourth column in the Groups tab**, "Code hash" (Group, Name, Added, Code hash). It is written for a
  membership of a group with rights and left blank for the others. `groupRows_` reads three columns where it reads two
  today, and `groupSet_` writes four. The Roles tab is retired after the migration (kept, read by nothing).
  *Recommended*: one table of memberships, one reader.
- **(B) Keep the Roles tab as the rights memberships' store**, its Role column holding a group id. That makes two
  membership tables, and every reader must merge them: the "permanent dual read" rule W3 rules out.

### Audit

- Every rights change is an Audit row, by anonymous id only (`aid_`), never a name, as today. The rows:
  - `join <group id>` / `leave <group id>`, target the member's id, for a member added to or removed from a rights
    group;
  - `right+ <right>@<scope>` / `right- <right>@<scope>` for a group's right, its target the group id, then one
    `grant <right> (via <group id>)` / `revoke …` row per member;
  - a self-change marked `(self)`.
- `users_` today writes an **empty target** for a list `userGroup`. For rights groups a list is refused (path 2
  above), so every rights row has its member's id.
- `grantAudited_` parses `grant <role>` rows to repair a grant written without its row (v159). It becomes the same
  check on `join <group id>` rows. The old `grant <role>` rows stay as written: the Audit tab is history, never
  rewritten.

### The mask: rights by sign-in strength

#1098 section 5 sets which rights the pilot sign-in (name and 4-digit code) is enough for. That is acl(5)'s mask, kept
as a **fixed rule of the code**, never a group setting:
- `can_` refuses `players`, `grant` and `settings` to an account caller until the better sign-in (Q349) exists;
- the token is unaffected.

It subtracts, but only by sign-in strength, never by group, so no player meets two groups that disagree. Today no
account caller uses those rights (`caller_` is the token only), so nothing changes until a role's own PR adds an account
caller.

### The admin token and a stolen secret, before and after

| Secret stolen | Before (today) | After |
| --- | --- | --- |
| **The admin token** (a GitHub token that can push) | Every right: `can_` returns true. It can also change `Code.gs`, which updates itself from `release` (v181), and so every player's data | **The same.** The token is root in both models. One difference: a single `groupEdit` adding `grant` to a populated group is a mass grant in one call. The token could already grant everyone one by one, so the reach is the same; the Audit rows (one per member) make it visible |
| **A Pierre-like account's code** (name and 4 digits) | Nothing privileged today, beyond `live`: account callers reach only `lvStart_` | The same while the mask holds. Once account callers exist, the account's union of rights within the mask |
| **A trainer's code** | `live`: host a game | `live`, plus `follow` / `invite` on the group(s) their group targets only, never the whole instance. Narrower than the role's `cohorts` |
| **A player's code** | that player's own data | the same. A group without rights gives none, and a join never reaches a rights group |

What the token keeps (rule: "The admin token is the platform admin, with every right", docs/SECURITY.md): `players`,
`grant`, `settings`, `content`, `platform`, and the new rights. Q364's separation still holds for **accounts**: an
account in "Platform admins" only is refused an instance's players until it is in that instance's Managers group.

## 4. Migration, compatibility and the admin

### Migration (rule W3: one-shot, nothing lost)

A `ONCE_` step (as `groupsMigrate_` in v179), under the script lock, logged in the Deploy log, run once after the
script's install or by the first change to a group before then:

1. **One group per role in use.** Its name uses #1098's words. Its rights are the role's (`ROLES.DEF`), at the scope
   the grants hold.

   | Role in the Roles tab | Group made | Rights |
   | --- | --- | --- |
   | `admin` at `platform` | "Platform admins" | `platform@platform`, `grant@platform` |
   | `owner` at `instance:imr` | "Managers" | `players`, `settings`, `grant` at `instance:imr` |
   | `editor` at `instance:imr` | "Curators" | `content@instance:imr` |
   | `trainer` at `instance:imr` | "Trainers" | `live@instance:imr`, `cohorts@instance:imr` (kept as the role gave it until roles step 2 splits it into `follow` and `invite` on targets) |

   A role nobody holds makes no group.
2. **Each grant row becomes a membership** of its role's group:
   - its Code hash is copied (guard 2), and Since becomes Added;
   - a grant whose hash is no longer the account's (`can_` ignores it today) migrates as a membership with that old
     hash: rights off, nothing lost.
3. **The "Staff" group (v179) is untouched.** It keeps its board and gets no right. Its members who hold `trainer`
   become members of "Trainers" as well, through step 2.
4. **`rolesSeed_`** gives Pierre his three memberships ("Platform admins", "Managers", "Curators") in place of his
   three grants, for the case where the seed has not run yet. Its property `ROLES_SEED` stays, so a removal is never
   undone by it.
5. **The Roles tab is then read by nothing.** It is not deleted: deleting data asks Pierre first. Its rows stay as
   the record of the grants before. Until the step has run, `can_` reads the groups as the step will make them from
   the Roles tab (a `groupsBefore_`-style reader), so the minutes between install and migration answer the same.
6. **Audit**: one `join <group id> (migration)` row per membership made, by the script's own id.

Nothing a player sees changes: no board, beta or right moves.

### Compatibility (rule D4)

- **The app.** `live.js` learns a missing right from the script's `role` refusal, which keeps its meaning. #1098's
  row 1 ("roles in the load reply") becomes **`rights` in the load reply**: the account's union, `[[right, scope]]`,
  to the account itself only. The Workspace entry and its sections key on rights:
  - Trainer when `live`, `follow` or `invite`;
  - Curator when `content`;
  - Manager when `players` or `grant`;
  - Admin when `platform`.

  The app turns them on only from a reply with `v` at least the version that sends `rights` (rule D4). Before that,
  it behaves as today.
- **The admin page.** `groupDo_` ignores a field it does not know, so an older script would answer `ok` to a
  `groupEdit` with `rights` and store nothing. The page must therefore gate the Rights controls on the script's
  version (as `GROUPADM_SHEET` does for v179): below it, the Groups page is today's.
- **The Audit and Roles tabs** keep their rows. Nothing reads the Roles tab after the migration.
- **The migration code** goes, between markers, once the Deploy log shows its line (as v179's `groups-migration`
  block).

### What changes in the admin

- **Players › Groups, a group's card** (`renderGroups`):
  - today it shows Board, Beta and members;
  - it gains a **Rights** row: a chip per right in words ("Host live games", "Follow: RA November 2026", "Players",
    "Grant rights", "Content"), each with ×, and "+ Add a right" (a list of the rights, then the target group for
    `follow` and `invite`);
  - a group with rights shows a key mark beside its name, and has no Add all or Remove all;
  - its "+ Add a player" asks one confirm naming the rights: "Give X: Host live games?" (question 8, an exception to
    rule A2's one click);
  - a member whose code hash is not the membership's shows "rights off".
- **A target group's card** shows, read-only, who follows or invites to it: the reverse view, the ACL's "who may do
  what to this object".
- **The player's bar** (`ugChips`) already lists the player's groups as chips. Rights groups' chips carry the key
  mark, and a line under them sums up the player's rights: "Rights: host live games; follow RA November 2026".
- **Order**: rights groups first, then the others, the newest first within each.
- **The roles' own page** (ROADMAP "Roles, instances and cohorts", Next: "granting and revoking each role apart from
  the groups") is **no longer needed**: the Groups page is that page. #1098's Manager tabs "Groups" and "Roles" become
  one, "Groups".

## 5. How it fits #1098's questions (a)-(f)

| #1098 question | Effect of this model |
| --- | --- |
| (a) The entry's name ("Workspace") | **Unchanged.** The entry shows when the load reply lists any right, not any role |
| (b) Do Curators curate photos? | **Made smaller.** Once the relay has a photo step, "Curators curate photos" is a right (`photos`) added to the Curators group: data, reversible, audited. The relay's photo step is still to build |
| (c) A Trainer reads members' progress with the pilot sign-in | **Strengthened.** `follow@group:<id>` reaches one target group's members only, not the instance's, so the "yes for the pilot" carries less risk |
| (d) Manager rights with the pilot sign-in | **Unchanged answer, one mechanism.** It is the mask (section 3): a fixed rule of `can_` by sign-in strength, not a group setting |
| (e) Where the GitHub token lives | **Unchanged.** The token stays root |
| (f) Rename the stored role ids (`editor` → `curator`, `owner` → `manager`) | **Dissolved.** Role ids disappear. The migration makes groups named "Curators" and "Managers", and later renames are data, done on the Groups page. Only right ids stay in code (`content`, `players`, …), and they need no rename |

#1098's section 3 tables ("What each role sees") hold as they are, read as "what each set of rights opens". Its row 10
(Manager › Players, Groups, Roles) loses the Roles page.

## 6. Recommendation, PRs and questions

### Recommendation

Adopt the model with the four guards. It removes a concept (roles) instead of adding one, and it keeps every security
property of roles step 1: the code-hash binding, rule D7 on delete, merge and archive, the Audit tab, and the token as
root. It also closes the escalation paths that a naive merge of the two would open: `players` adding to rights groups,
Add all, a mass grant through `groupEdit`, a merge moving rights, the player's join. It waits for #1113 (the groups
code) and for Pierre's answers to questions 1-4 (a data format and a migration: costly to undo).

### PRs, in order

Agent time from `python3 tools/effort.py --estimate` (first commit to green checks):

| # | PR | What | Type, size | Agent time (closest merged PRs) |
| --- | --- | --- | --- | --- |
| 1 | Groups carry rights, the script | `GDEF` Rights column and `GROUPS` Code hash column; `can_` as the union over memberships with the hash; `scopeOk_` per right and scope kind; the three gates in `users_` (`grant` for rights groups, no list, `used` on a targeted group's delete); the merge split; the Audit rows; the `ONCE_` migration from the Roles tab and its before-reader; `rolesSeed_` as memberships; `tests/roles.test.js`, `tests/playergroups.test.js`, `tests/liveclass.test.js` extended; SECURITY and ARCHITECTURE updated, a decision record | sheet L | median 8.9 h, range 3.7-13.3 h (#882, #946, #1050, #1060, #1083) |
| 2 | Rights on the Groups page | the Rights row and its chips, the key mark, no bulk on rights groups, the confirm (question 8), the reverse view on a target, the player's bar's rights line, gated on PR 1's version (rule D4); `tests/admin.smoke.js` | admin L | median 38 min, range 30-39 min (#836, #844, #889, #895, #906) |
| 3 | Rights in the load reply | `load_` and the save reply send `rights` to the account itself; the app keeps it under the account's name as `groups`; no UI. Replaces #1098's row 1 | sheet M | median 29 min, range 29-58 min (#812, #835, #838, #958, #971) |
| 4 | The rule and the ROADMAP | the additive-settings rule's wording (after Pierre's OK), ROADMAP "Roles, instances and cohorts" (the roles' page row closed by PR 2), #1098's (f) closed | docs S | median 4 min, range 3-4 min (#805, #843, #853, #862, #949) |

Total, the sum of the medians: about 10.1 agent hours, almost all of it PR 1 (#882, #946, #1050, #1060, #1083). PR 1
could split into the reader and migration (sheet M) and the gates (sheet M), at 29 min each (#812, #835, #838, #958,
#971). Measured sheet L PRs ran long because of review rounds on data paths, so the split is the integrator's call.

**Order.**
- PR 1 waits for #1113 (the same groups code) and for answers 1-4.
- PRs 2 and 3 follow PR 1, in parallel.
- PR 4 goes with PR 1 or right after.
- Roles step 2 (real cohorts with a join code) then builds `follow` and `invite` on `group:` targets, in place of the
  role's `cohorts`.

### Questions for Pierre

Numbered for this study only; the integrator gives Q numbers to those that pass the two tests.

1. **One concept.** Groups carry settings and rights. A player's rights are the union of their groups', and no right
   is given to an account outside a group. The Roles tab and its role names go once (questions 6-7).
   *Recommendation: yes.*
2. **Only additive.** No group setting or right may subtract (no deny, no "apart", no mask on a group). A new group
   setting passes one test: on in any of the player's groups means on. Hide and Leave out stay per-player.
   *Recommendation: yes, written as a rule (its wording to Pierre for his OK).*
3. **Storage.** Add a "Rights" column to Group settings, and a "Code hash" column to Groups, filled for rights groups'
   memberships. This changes the sheet's column layout. The alternative is to keep rights memberships in the Roles
   tab, which means two tables read together. *Recommendation: the two columns (option A in section 3).*
4. **Who changes a rights group.** Only an account or token holding `grant` at the rights' scope may change its
   members or its rights. The `players` right alone may not. No list or Add all on a rights group, and a player's own
   join never reaches one. *Recommendation: yes.*
5. **Rights with a target.** "Trainer of RA November 2026" is `follow` and `invite` on that group, carried by a
   separate group ("Trainers, RA November 2026"), never by its members. `live` stays instance-wide.
   *Recommendation: yes. It means one small trainers' group per cohort (RBAC's "role explosion", here about one a
   month).*
6. **Group names at the migration.** The migration names the groups "Platform admins", "Managers", "Curators" and
   "Trainers" (#1098's words), and they can be renamed on the Groups page afterwards. The Roles tab is kept read-only
   as the record, never deleted. *Recommendation: yes.*
7. **A merge.** A merge moves settings memberships (as today) but drops rights memberships, audited, as grants are
   today. *Recommendation: yes.*
8. **A confirm when giving rights.** Adding a player to a group with rights asks one confirm naming the rights ("Give
   X: Host live games?"). This is an exception to rule A2's one click with Undo, because it is about access.
   *Recommendation: yes.*
