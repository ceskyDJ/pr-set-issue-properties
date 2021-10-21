const core = require('@actions/core');
const { Octokit } = require('@octokit/rest');
const github = require('@actions/github');
const { dealStringToArr } = require('actions-util');

// **********************************************************
const token = core.getInput('token');
const octokit = new Octokit({ auth: `token ${token}` });
const context = github.context;

const outEventErr = `This Action only support "pull_request" "pull_request_target"！`;

async function run() {
  try {
    const { owner, repo } = context.repo;
    if (context.eventName === 'pull_request_target' || context.eventName === 'pull_request') {
      const title = context.payload.pull_request.title;
      const body = context.payload.pull_request.body;
      const number = context.payload.pull_request.number;

      let issues = [];
      const way = core.getInput('way');
      if (way === 'title') {
        let arr = title.split(' ');
        arr.forEach(it => {
          if (it.startsWith('#')) {
            issues.push(it.replace('#', ''));
          }
        });
      } else if (way === 'body') {
        if (body === null) {
          await octokit.issues.createComment({
            owner,
            repo,
            issue_number: number,
            body: '[Automation] Pull request description is empty. Create it at least for linking issue, please.',
          });

          core.setFailed('Pull request description is empty');

          return;
        }

        let line = body.split('\n');
        line.forEach(it => {
          if (!it.includes('#')) {
            return;
          }

          let regexResult;
          if (
            (regexResult = it.match(
              /((close[sd]?)|(fix(e[sd])?)|(resolve[sd]?)) #([1-9][0-9]*)/i,
            )) !== null
          ) {
            // Github linked issues
            issues.push(regexResult[6]);
          } else if ((regexResult = it.match(/(issue|task) #([1-9][0-9]*)/i)) !== null) {
            // Own linking system (without closing issues)
            issues.push(regexResult[2]);
          }
        });
      } else if (way === 'commit') {
        const { data: commits } = await octokit.pulls.listCommits({
          owner,
          repo,
          pull_number: number,
          // 一般不会超过 100 个 commit 吧，😌 不想分页了，暂时保留
          per_page: 100,
        });
        commits.forEach(commit => {
          let message = commit.commit.message;
          let messageArr = message.split(' ');
          messageArr.forEach(it => {
            if (it.startsWith('#')) {
              issues.push(it.replace('#', ''));
            }
          });
        });
      } else {
        core.setFailed('Wrong way!');
      }

      const filterLabel = core.getInput('filter-label');
      if (filterLabel) {
        let arr = [];
        for await (let no of issues) {
          const {
            data: { labels },
          } = await octokit.issues.get({
            owner,
            repo,
            issue_number: no,
          });
          let o = labels.find(k => k.name == filterLabel);
          if (o) {
            arr.push(no);
          }
        }
        issues = [...arr];
      }

      core.info(`[Action: Query Issues][${issues}]`);
      core.setOutput('issues', issues);

      const labels = core.getInput('issues-labels');
      const comment = core.getInput('issues-comment');
      const close = core.getInput('issues-close');

      // Extra actions (by config)
      if (!labels && !comment && !close) {
        return false;
      }

      for await (let issue of issues) {
        // Adding labels to issue
        if (labels) {
          await octokit.issues.addLabels({
            owner,
            repo,
            issue_number: issue,
            labels: dealStringToArr(labels),
          });
          core.info(`Actions: [add-labels][${issue}][${labels}] success!`);
        }

        // Adding comment to issue
        if (comment) {
          const body = comment.replace('${number}', `#${number}`);
          await octokit.issues.createComment({
            owner,
            repo,
            issue_number: issue,
            body,
          });
          core.info(`Actions: [create-comment][${issue}][${body}] success!`);
        }

        // Closing issue
        if (close === 'true') {
          await octokit.issues.update({
            owner,
            repo,
            issue_number: issue,
            state: 'closed',
          });
          core.info(`Actions: [close-issue][${issue}] success!`);
        }
      }

      // The first issue is reference - its properties will be set to the pull request
      // Of course, this is used only when there is some linked issue
      if (issues.length > 0) {
        const referenceIssue = issues[0];

        // Load reference issue
        const referenceData = await octokit.issues.get({
          owner,
          repo,
          issue_number: referenceIssue,
        });

        core.info('Actions: [get-properties] success!');

        // Set labels and milestone to pull request
        await octokit.issues.update({
          owner,
          repo,
          issue_number: number,
          labels: referenceData.data.labels,
          milestone: referenceData.data.milestone.number,
        });
        core.info('Actions: [copy-properties] success!');
      } else {
        await octokit.issues.createComment({
          owner,
          repo,
          issue_number: number,
          body: '[Automation] There is no issue to link with this pull request. Add linked issue to the description, please.',
        });

        core.setFailed(
          'You need to link issue using its ID in pull request description with the right keyword before',
        );
      }
    } else {
      core.setFailed(outEventErr);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
