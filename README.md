# PR set issue properties

A GitHub Action help you set issue's properties (labels and milestone) to pull requst.

This is a fork of [actions-cool/pr-extract-issues](https://github.com/actions-cool/pr-extract-issues).

## 🚀 How to use?

### Preview

https://github.com/actions-cool/pr-extract-issues/pull/15

> Please pay attention to the trigger timing

```yml
name: PR Extract Issues

on:
  pull_request:
    types: [opened, edited, synchronize, closed]

jobs:
  extract:
    runs-on: ubuntu-latest
    steps:
      - uses: ceskyDJ/pr-set-issue-properties@v1.2.0
        with:
          way: 'commit'
          issues-labels: 'l1, l2'
          issues-comment: |
            Linked pull request: ${number}
          issues-close: true
```

### Input

| Name | Desc | Type | Required |
| -- | -- | -- | -- |
| token | GitHub token | string | ✖ |
| way | The way to query issues. Options: `title` `body` `commit` | string | ✔ |
| filter-label | Further filter issues through label | string | ✖ |
| issues-labels | Extra labels on issues | string | ✖ |
| issues-comment | Extra comment on issues | string | ✖ |
| issues-close | Extra close issues | string | ✖ |

- `title`: The PR title. Will only match like
  - fix: fix other #123 #456 #789
    - Get: 123 456 789
  - refctore: use other #222 #333#44
    - Get: 222 33344
  - So you should start with a space # and end with a space
- `body`：The PR body
  - Like: https://github.com/actions-cool/pr-extract-issues/pull/4
  - Support for Github issue linking (`close #n`, `fix #n`, `resolve #n`, ...)
  - New linking (without closing issues): `issue #n`, `task #n`
- `commit`: Like `title`
- `filter-label`: Note that github default hooks. That is, `fix` `close` `resolve` directly followed by issue number will be closed after success merge
- `issues-labels`: Support multiple, need to be separated by comma
- `issues-comment`: `${number}` will be replaced with the current pull request number
- `issues-close`: Whether close issue

### Output

- `issues`: Get issues numbers

## Changelog

[CHANGELOG](./CHANGELOG.md)

## LICENSE

[MIT](./LICENSE)
