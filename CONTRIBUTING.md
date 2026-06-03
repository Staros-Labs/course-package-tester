# Contributing

Thanks for helping improve Course Package Tester.

## Local Setup

```bash
npm ci
npm test
npm start
```

## Pull Requests

Before opening a pull request:

- keep changes inside the local tester scope
- add or update focused tests
- run `npm test`
- avoid adding network services, analytics, or automatic upload behavior
- update docs when behavior changes

Maintainers may decline features that move the project toward course authoring, hosted LMS/LRS behavior, or product-specific workflows.
