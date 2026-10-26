# Git Workflow

This document describes how Git and GitHub are used in the Journal app repository:
https://github.com/kamikazinancy32-stack/journal-app

## 1. Branching strategy

| Branch | Purpose |
| --- | --- |
| `main` | Stable code: the version that is submitted. Only updated by a release pull request from `dev`. |
| `dev` | Integration branch. Every finished piece of work is merged here first and tested together. |
| `feature/<name>` | A new feature, e.g. `feature/journal-entries` |
| `fix/<name>` | A bug fix, e.g. `fix/empty-title-check` |
| `docs/<name>` | Documentation only, e.g. `docs/git-workflow` |
| `chore/<name>` | Setup or tooling with no app behaviour change, e.g. `chore/tsc-config` |

Every `feature/*`, `fix/*`, `docs/*` and `chore/*` branch is created from the **latest `dev`** and merged back into `dev` through a pull request. Nobody commits directly to `main` or `dev`.

```
main      ●─────────────────────────────────────────●  release (dev → main)
           \                                       /
dev         ●───────────●───────────────●─────────●
             \         /  \            /
feature/...   ●──●──●─●    ●──●──●────●   docs/..., fix/..., chore/... work the same way
```

## 2. Commit message convention

Commits follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): short description
```

- **type**: what kind of change it is (see the table below)
- **scope**: the part of the app it touches, e.g. `journal`, `ui`, `storage`, `types`, `config`
- **description**: lowercase, in the imperative mood ("add", not "added"), and no full stop at the end
- One logical change per commit, so each commit is small and easy to review

| Type | Used for |
| --- | --- |
| `feat` | A new feature |
| `fix` | A bug fix |
| `refactor` | A code change that does not change behaviour |
| `style` | Visual or formatting changes |
| `docs` | Documentation only |
| `test` | Adding or updating tests |
| `chore` | Tooling, configuration, dependencies, build output |

Real examples from this repository:

```
feat(journal): add generic findByProperty helper
feat(journal): validate Partial<JournalEntry> input in addEntry and editEntry
feat(journal): filter entries by mood and search text
feat(ui): add mood filter and search controls
refactor(types): replace mood union with a Mood enum
refactor(structure): merge modules into journal.ts, storage.ts, ui.ts and types.ts
chore(config): emit es2020 javascript to dist with tsc
chore(deps): add ts-node as a dev dependency
docs(readme): add README with setup, structure and compiler notes
docs(github): add pull request template
```

> The first commits on `feature/journal-entries` used an older format (`feat(store) - Added JournalStore class ...`). They were already pushed, so they were left unchanged: rewriting shared history would need a force-push. All later commits use the format above.

## 3. Pull request process

1. **Start from the latest `dev`:**
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feature/<name>
   ```
2. **Work in small commits** that follow the convention above.
3. **Check the build** before pushing: `npx tsc` must finish with **0 errors**.
4. **Push the branch:** `git push -u origin feature/<name>`
5. **Open a pull request into `dev`** on GitHub:
   - the title uses the same format as commits, e.g. `feat(journal): add, edit, delete, filter and search journal entries`
   - the description follows the template (Description, Changes, Testing, Screenshots)
   - add a label: `feature`, `bug` or `documentation`
6. **Review:** the TA reviews the pull request. If changes are requested, new commits are pushed to the same branch and the pull request updates automatically. **Authors never merge their own pull requests**; the TA approves first.
7. **After the merge:**
   ```bash
   git checkout dev
   git pull origin dev
   git branch -d feature/<name>                 # delete the local branch
   git push origin --delete feature/<name>      # delete the branch on GitHub
   ```
8. **Release:** when all work is in `dev` and the build passes, a pull request from `dev` into `main` is opened for the final submission.

| PR | Branch | Status |
| --- | --- | --- |
| #1 | `feature/journal-entries` → `dev` | Waiting for review |
| | `docs/git-workflow` → `dev` | Waiting for review |

## 4. Resolving merge conflicts

A merge conflict happens when two branches change **the same lines of the same file**, and Git cannot decide which version to keep. For example, two feature branches might both edit the `JournalEntry` interface in `src/types.ts`.

**Steps to resolve it:**

1. Bring the latest `dev` into your feature branch:
   ```bash
   git checkout feature/<name>
   git fetch origin
   git merge origin/dev
   ```
   Git stops and reports something like `CONFLICT (content): Merge conflict in src/types.ts`.
2. Run `git status` to list every file with a conflict ("both modified").
3. Open each file and find the conflict markers:
   ```
   <<<<<<< HEAD
   the version on your feature branch
   =======
   the version coming from dev
   >>>>>>> origin/dev
   ```
4. Decide what the code should be: keep one side, or combine both. Then **delete all three marker lines**.
5. Check that the result still compiles and works:
   ```bash
   npx tsc
   ```
6. Mark the files as resolved and finish the merge:
   ```bash
   git add src/types.ts
   git commit -m "fix(types): resolve merge conflict in entry types"
   git push
   ```
   The pull request updates automatically.

To cancel a merge that went wrong before committing, run `git merge --abort`. This puts the branch back exactly as it was.

## 5. Git commands used

| Command | What it does |
| --- | --- |
| `git status` | Shows the current branch and which files are changed, staged or untracked |
| `git branch -a` | Lists all local and remote branches |
| `git log --oneline --graph --all` | Shows the commit history as a compact graph |
| `git checkout dev` | Switches to the `dev` branch |
| `git checkout -b feature/<name>` | Creates a new branch and switches to it |
| `git pull origin dev` | Downloads new commits from GitHub and merges them into the current branch |
| `git fetch origin` | Downloads new commits from GitHub without merging them |
| `git add <file>` | Stages a file for the next commit |
| `git commit -m "type(scope): message"` | Saves the staged changes as a commit |
| `git push -u origin <branch>` | Uploads the branch to GitHub and links the local branch to it |
| `git merge origin/dev` | Merges the latest `dev` into the current branch |
| `git merge --abort` | Cancels a merge that has conflicts and restores the branch |
| `git mv <old> <new>` | Renames a file, keeping its history |
| `git branch -d <branch>` | Deletes a local branch that has been merged |
| `git push origin --delete <branch>` | Deletes a branch on GitHub |
| `gh pr create --base dev --label feature` | Opens a pull request into `dev` from the terminal |

## 6. Screenshots

<!-- Add screenshots here -->

- Branch list on GitHub: _screenshot_
- Commit history (`git log --oneline --graph --all`): _screenshot_
- An open pull request with the template filled in: _screenshot_
- A review / approval on a pull request: _screenshot_
- Merged pull requests list: _screenshot_
