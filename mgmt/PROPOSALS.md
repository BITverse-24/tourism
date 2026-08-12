# Proposals

## 1. Install GitHub issue templates at repository root

**Target:** `.github/ISSUE_TEMPLATE/`

**Issue:** GitHub only discovers issue forms/templates from the repository-root `.github` directory, while this task is restricted to writes inside `mgmt/`.

**Evidence:** No `.github` directory existed during inspection; the orchestration templates are available under `mgmt/.github/ISSUE_TEMPLATE/`.

**Suggested change:** Copy or move the compatible templates into the repository-root `.github/ISSUE_TEMPLATE/` directory.

**Reason:** Without this change, GitHub users will not see the standardized Task, Research, and Bug forms when creating issues.

**Impact:** Preserve any future unrelated root `.github` files and verify the forms against the repository's GitHub settings.
