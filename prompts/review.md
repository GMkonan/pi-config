---
description: Review staged git changes focusing on bugs, security and error handling
argument-hint: "[focus]"
---
Review the staged changes (`git diff --cached`).

Focus on:
- Bugs and logic errors
- Security issues (injection, unsafe deserialization, secrets in code, path traversal)
- Error handling gaps (unhandled promises, swallowed errors, missing validation)
- Edge cases the diff doesn't account for

If an argument was given, pay special attention to it: ${1:-general code quality}

For each issue found, report:
1. **Severity** — critical / warning / nit
2. **File:line** — where exactly
3. **Problem** — what's wrong
4. **Suggestion** — how to fix it

If the staged changes look good, say so and briefly summarize what they do.
Do NOT make any changes — review only.
