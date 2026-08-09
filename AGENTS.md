# AGENTS.md

## File Access Policy

The agent must follow these filesystem access rules for every task.

### Write Access

* The agent may have **write access to exactly one directory per task**.
* The writable directory must be selected based on the task-specific instructions.
* The agent must determine the writable directory **before making any file changes**.
* Once selected, that directory is the agent's **sole writable location** for the duration of the task.
* The agent must not create, modify, delete, rename, or move files or directories outside the selected writable directory.
* Parent directories, sibling directories, and other project directories remain read-only.
* If the instructions do not clearly identify which directory should be writable, the agent must ask for clarification rather than assuming multiple writable locations.

### Read Access

The agent may read files outside the writable directory when necessary to complete the task.

When reading other directories:

* Treat all directories other than the selected writable directory as **read-only**.
* Do not modify files merely because they contain stale, incorrect, incomplete, or inconvenient information.
* Do not create temporary files in read-only directories.
* Do not rename, move, delete, or overwrite files in read-only directories.
* Reading source code, configuration, documentation, tests, schemas, and other reference material is permitted when needed.
* Prefer reading only the files necessary to understand or complete the task.
* Do not unnecessarily scan unrelated directories or access unrelated sensitive data.

## Proposals for Changes Outside the Writable Directory

While working, the agent may discover problems, inconsistencies, missing functionality, incorrect information, or other changes that should be made in directories it cannot write to.

The agent must **not make those changes directly**.

Instead, when such a change is genuinely needed, the agent must record it in a `PROPOSALS.md` file in the **root of the selected writable directory**.

### When to Create `PROPOSALS.md`

Create `PROPOSALS.md` **only if there is at least one concrete proposal** for a change outside the writable directory.

Do not create an empty `PROPOSALS.md` merely because the mechanism exists.

A proposal should be included when:

* something in another directory is incorrect and should be fixed;
* something is missing from another directory and should be added;
* another directory contains an inconsistency that affects the current task;
* a change outside the writable boundary would materially improve correctness or maintainability;
* the agent identifies a follow-up change that should be handled by the person or agent responsible for that directory.

Do **not** create proposals for inconsequential stylistic preferences, speculative improvements, or unrelated cleanup unless they are relevant to the task.

### Location

`PROPOSALS.md` must always be created at:

```text
<selected-writable-directory>/PROPOSALS.md
```

It must **not** be created in:

* the project root;
* a parent directory;
* a sibling directory;
* the directory where the proposed change would eventually be made;
* or any other location.

This ensures that the person handling the writable directory can review and forward the proposals to the appropriate person or agent.

### Proposal Contents

Each proposal should contain enough information for another person or agent to understand and implement the change without having to rediscover the issue.

For each proposal, include, where applicable:

* **Target:** the directory and/or file that should be changed.
* **Issue:** what is currently incorrect, missing, or inconvenient.
* **Evidence:** what the agent observed that led to the proposal.
* **Suggested change:** what should be changed.
* **Reason:** why the change is needed or useful.
* **Impact:** any relevant consequences, dependencies, or considerations.

Use concrete paths and references whenever possible.

Example:

```markdown
# Proposals

## 1. Update shared configuration

**Target:** `../shared/config/`

**Issue:** The configuration still references the deprecated `foo_v1` option.

**Evidence:** `src/foo/loader.ts` expects `foo_v2`, but the shared configuration provides `foo_v1`.

**Suggested change:** Update the shared configuration to use `foo_v2`.

**Reason:** Without this change, consumers using the shared configuration may fail to initialize.

**Impact:** The owner of `../shared/config/` should verify compatibility before applying the change.
```

### Do Not Implement Proposals

Creating a proposal does **not** grant permission to make the proposed change.

The agent must:

1. Observe the issue.
2. Record the proposed change in `<selected-writable-directory>/PROPOSALS.md`.
3. Leave the affected external directory unchanged.
4. Continue the task using the external directory as read-only.

The proposal is intended to be handed off to the person or agent responsible for the target directory.

### Existing `PROPOSALS.md`

If a `PROPOSALS.md` already exists in the root of the selected writable directory:

* Read it before adding new proposals.
* Preserve existing proposals.
* Add new proposals rather than replacing existing ones.
* Avoid creating duplicate proposals.
* Update an existing proposal if the newly discovered information is clearly about the same issue.

## Selecting the Writable Directory

The writable directory should be chosen according to the task instructions.

For example:

* If the task asks to modify a component under `src/foo/`, select `src/foo/`.
* If the task asks to generate an artifact under `output/`, select `output/`.
* If the task explicitly names a destination directory, that directory takes precedence.
* If multiple candidate directories are mentioned, select **one** based on the intended output location and keep every other directory read-only.

Do not interpret access to multiple directories as permission to write to multiple directories.

## Boundary Rule

At all times, maintain this invariant:

> **One task → one writable directory. All other directories → read-only.**

Before every filesystem operation that can change anything, verify that its target is inside the selected writable directory.

If an operation would modify anything outside that directory, do not perform it. Record the required change as a proposal instead, when appropriate.

## Deletion and Renaming

Deletion and renaming are write operations.

Therefore:

* Files may only be deleted within the selected writable directory.
* Files may only be renamed within the selected writable directory.
* Moving a file from a read-only directory into the writable directory is not permitted if the operation modifies the source directory.
* Moving a file out of the writable directory into another directory is not permitted because it modifies a location outside the writable boundary.

When necessary, recreate or copy required content inside the writable directory instead.

## Generated and Temporary Content

Generated files, build artifacts, patches, scripts, backups, and temporary data must stay within the writable directory.

Do not place temporary content in other directories unless the task explicitly grants write access to that location.

## Safety Check

Before every write operation, establish:

1. **What directory is writable?**
2. **Is the target path inside that directory?**
3. **Does the operation modify anything outside that directory?**

If the answer to #2 is no, or #3 is yes, the operation must not be performed.

If the desired change is outside the writable boundary and is relevant to the task, record it in `PROPOSALS.md` instead.

## Priority

Task-specific instructions may identify or constrain the writable directory. Follow those instructions when selecting the single writable directory, but never expand write access to additional directories unless explicitly instructed to do so.

When instructions conflict or leave the writable location ambiguous, preserve the more restrictive rule and ask for clarification.
