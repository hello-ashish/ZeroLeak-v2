# Git Workflow for ZeroLeak-v2

This repo is being worked on by two people at the same time: one backend developer and one frontend developer. To avoid branch divergence and accidental overwrites, do not push directly to `main` unless you are coordinating carefully.

## Recommended team workflow

Use separate feature branches for each developer and merge into `main` through pull requests.

### 1) Start from main

```bash
git checkout main
git pull --no-rebase --tags origin main
```

### 2) Create your own feature branch

Backend:

```bash
git checkout -b backend/auth-flow
```

Frontend:

```bash
git checkout -b frontend/dashboard-ui
```

### 3) Work locally and commit

```bash
git add .
git commit -m "Describe your changes"
```

### 4) Push your branch

```bash
git push -u origin backend/auth-flow
```

or

```bash
git push -u origin frontend/dashboard-ui
```

### 5) Open a pull request on GitHub

- Backend PR: target `main`
- Frontend PR: target `main`

Only after review and approval should the branch be merged.

---

## If Git says branches have diverged

This usually means both people changed the same branch history. Use one of these commands:

### Safe default for shared repos

```bash
git pull --no-rebase --tags origin main
```

This merges the remote changes into your local branch instead of rebasing.

### If you want to set this as the default for this repo

```bash
git config pull.rebase false
```

Then future pulls will use merge by default.

---

## If you have uncommitted changes

Before pulling:

```bash
git stash push -u -m "temporary before pull"
```

After pulling:

```bash
git stash pop
```

---

## Useful commands

Check status:

```bash
git status
```

View branches:

```bash
git branch -a
```

Fetch latest remote changes without merging:

```bash
git fetch origin
```

Check upstream tracking:

```bash
git branch -vv
```

---

## Best practice for this project

Because backend and frontend are being developed by different people, the cleanest structure is:

- `main` = production-ready branch
- `backend/*` = backend work
- `frontend/*` = frontend work
- merge only through pull requests

This prevents direct overwrite conflicts and keeps the repo organized.

---

## Quick example workflow

```bash
git checkout main
git pull --no-rebase --tags origin main
git checkout -b backend/register-api
git add .
git commit -m "Add admin register endpoint"
git push -u origin backend/register-api
```

Then open the PR on GitHub and merge after review.
