require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, CALLBACK_URL, REPO_OWNER, REPO_NAME, MAIN_BRANCH, WORKFLOW_FILE } = process.env;

async function makeGitHubRequest(method, endpoint, data, token) {
  const url = `https://api.github.com/${endpoint}`;
  try {
    const response = await axios({
      method,
      url,
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'xylo-md-deployment'
      },
      data
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) return null;
    throw new Error(error.response?.data?.message || error.message);
  }
}

app.get('/api/auth', (req, res) => {
  const state = Math.random().toString(36).substring(2, 15);
  req.session.state = state;
  res.redirect(`https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${CALLBACK_URL}&state=${state}&scope=repo,workflow`);
});

app.get('/api/auth/callback', async (req, res) => {
  const { code, state } = req.query;
  if (state !== req.session.state) return res.status(403).json({ error: 'Invalid state' });
  try {
    const response = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: CALLBACK_URL
    }, { headers: { 'Accept': 'application/json' } });

    const accessToken = response.data.access_token;
    if (!accessToken) throw new Error('Failed to obtain access token');
    req.session.token = accessToken;
    res.redirect(process.env.FRONTEND_URL);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/check-auth', (req, res) => {
  if (req.session.token) {
    res.json({ authenticated: true });
  } else {
    res.status(401).json({ authenticated: false });
  }
});

app.post('/api/deploy', async (req, res) => {
  try {
    const { sessionId, branchName } = req.body;
    const token = req.session.token;
    if (!sessionId || !token) throw new Error('Session ID and token required');

    const user = await makeGitHubRequest('GET', 'user', null, token);
    let fork = null;
    try {
      fork = await makeGitHubRequest('GET', `repos/${user.login}/${REPO_NAME}`, null, token);
      if (!fork.fork || fork.parent.full_name !== `${REPO_OWNER}/${REPO_NAME}`) fork = null;
    } catch (error) {}

    if (!fork) {
      fork = await makeGitHubRequest('POST', `repos/${REPO_OWNER}/${REPO_NAME}/forks`, {}, token);
    }

    const finalBranchName = branchName && branchName.trim() ? branchName : `xylo-${Math.random().toString(36).substring(2, 8)}`;
    const branchExists = await makeGitHubRequest('GET', `repos/${user.login}/${REPO_NAME}/git/ref/heads/${finalBranchName}`, null, token);
    if (branchExists) {
      return res.json({ success: false, message: `Branch ${finalBranchName} exists. Try another.` });
    }

    const mainRef = await makeGitHubRequest('GET', `repos/${user.login}/${REPO_NAME}/git/ref/heads/${MAIN_BRANCH}`, null, token);
    await makeGitHubRequest('POST', `repos/${user.login}/${REPO_NAME}/git/refs`, {
      ref: `refs/heads/${finalBranchName}`,
      sha: mainRef.object.sha
    }, token);

    let configSha;
    try {
      const fileData = await makeGitHubRequest('GET', `repos/${user.login}/${REPO_NAME}/contents/config.js?ref=${finalBranchName}`, null, token);
      configSha = fileData.sha;
    } catch (error) {}

    await makeGitHubRequest('PUT', `repos/${user.login}/${REPO_NAME}/contents/config.js`, {
      message: `Update config.js for ${finalBranchName}`,
      content: Buffer.from(`module.exports = { SESSION_ID: "${sessionId}" };`).toString('base64'),
      branch: finalBranchName,
      sha: configSha
    }, token);

    const workflowContent = `name: XYLO-MD-DEPLOY
on:
  workflow_dispatch:
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install Dependencies
        run: npm install
      - name: Run Bot
        run: |
          echo "Running XYLO-MD..."
          timeout 18000 bash -c 'while true; do npm start || echo "Bot crashed, restarting..."; sleep 2; done'
      - name: Re-Trigger Workflow
        if: always()
        run: |
          echo "Re-running workflow..."
          curl -X POST \\
            -H "Authorization: Bearer \${{ secrets.GITHUB_TOKEN }}" \\
            -H "Accept: application/vnd.github.v3+json" \\
            https://api.github.com/repos/\${{ github.repository }}/actions/workflows/${WORKFLOW_FILE}/dispatches \\
            -d '{"ref":"${finalBranchName}"}'
`;

    await makeGitHubRequest('PUT', `repos/${user.login}/${REPO_NAME}/contents/.github/workflows/${WORKFLOW_FILE}`, {
      message: `Create workflow for ${finalBranchName}`,
      content: Buffer.from(workflowContent).toString('base64'),
      branch: finalBranchName
    }, token);

    await makeGitHubRequest('POST', `repos/${user.login}/${REPO_NAME}/actions/workflows/${WORKFLOW_FILE}/dispatches`, {
      ref: finalBranchName
    }, token);

    res.json({ success: true, message: 'Deployment successful!', branch: finalBranchName, repo: `${user.login}/${REPO_NAME}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));