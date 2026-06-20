# Tarot Card Generation

## Git Workflow

- **Always develop on `main`** — there is only one developer, so no feature branches are needed.
- Before starting any work, pull the latest main: `git pull origin main`
- When pushing, if the push is rejected because the remote has new commits, pull and reconcile before retrying:
  ```
  git pull origin main
  git push -u origin main
  ```
- Do not create feature branches or open pull requests unless explicitly asked.
