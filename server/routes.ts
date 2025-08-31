import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import axios from "axios";
import { storage } from "./storage";
import { deploymentRequestSchema } from "@shared/schema";

// Extend session data interface
declare module "express-session" {
  interface SessionData {
    state?: string;
    githubToken?: string;
    githubUsername?: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'xylo-md-deployment-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || process.env.VITE_GITHUB_CLIENT_ID;
  const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || process.env.VITE_GITHUB_CLIENT_SECRET;
  const REPO_OWNER = process.env.REPO_OWNER || 'XYLO-MD';
  const REPO_NAME = process.env.REPO_NAME || 'XYLO-MD';
  const MAIN_BRANCH = process.env.MAIN_BRANCH || 'main';
  const WORKFLOW_FILE = process.env.WORKFLOW_FILE || 'deploy.yml';

  // Get callback URL dynamically
  const getCallbackUrl = (req: Request) => {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    return `${protocol}://${host}/api/auth/callback`;
  };

  async function makeGitHubRequest(method: string, endpoint: string, data: any, token: string) {
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
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw new Error(error.response?.data?.message || error.message);
    }
  }

  // GitHub OAuth initiation
  app.get('/api/auth', (req: Request, res: Response) => {
    const state = Math.random().toString(36).substring(2, 15);
    req.session.state = state;
    const callbackUrl = getCallbackUrl(req);
    res.redirect(`https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${state}&scope=repo,workflow`);
  });

  // GitHub OAuth callback
  app.get('/api/auth/callback', async (req: Request, res: Response) => {
    const { code, state } = req.query;
    
    if (state !== req.session.state) {
      return res.status(403).json({ error: 'Invalid state parameter' });
    }

    try {
      const callbackUrl = getCallbackUrl(req);
      const response = await axios.post('https://github.com/login/oauth/access_token', {
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: callbackUrl
      }, { 
        headers: { 'Accept': 'application/json' } 
      });

      const accessToken = response.data.access_token;
      if (!accessToken) {
        throw new Error('Failed to obtain access token');
      }

      // Get user info
      const userResponse = await makeGitHubRequest('GET', 'user', null, accessToken);
      
      req.session.githubToken = accessToken;
      req.session.githubUsername = userResponse.login;

      // Redirect to frontend with success
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers.host;
      res.redirect(`${protocol}://${host}/?authenticated=true`);
    } catch (error: any) {
      console.error('OAuth error:', error);
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers.host;
      res.redirect(`${protocol}://${host}/?error=${encodeURIComponent(error.message)}`);
    }
  });

  // Check authentication status
  app.get('/api/auth/status', (req: Request, res: Response) => {
    if (req.session.githubToken && req.session.githubUsername) {
      res.json({ 
        authenticated: true, 
        username: req.session.githubUsername 
      });
    } else {
      res.json({ authenticated: false });
    }
  });

  // Logout
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to logout' });
      }
      res.json({ success: true });
    });
  });

  // Deploy endpoint
  app.post('/api/deploy', async (req: Request, res: Response) => {
    try {
      const { sessionId, branchName } = deploymentRequestSchema.parse(req.body);
      const token = req.session.githubToken;
      const username = req.session.githubUsername;

      if (!token || !username) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Get user info
      const user = await makeGitHubRequest('GET', 'user', null, token);
      
      // Check if fork exists
      let fork = null;
      try {
        fork = await makeGitHubRequest('GET', `repos/${user.login}/${REPO_NAME}`, null, token);
        if (!fork.fork || fork.parent.full_name !== `${REPO_OWNER}/${REPO_NAME}`) {
          fork = null;
        }
      } catch (error) {
        // Fork doesn't exist
      }

      // Create fork if it doesn't exist
      if (!fork) {
        fork = await makeGitHubRequest('POST', `repos/${REPO_OWNER}/${REPO_NAME}/forks`, {}, token);
        // Wait a moment for fork to be ready
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Generate branch name if not provided
      const finalBranchName = branchName && branchName.trim() ? 
        branchName.trim() : 
        `xylo-${Math.random().toString(36).substring(2, 8)}`;

      // Check if branch exists
      const branchExists = await makeGitHubRequest('GET', `repos/${user.login}/${REPO_NAME}/git/ref/heads/${finalBranchName}`, null, token);
      if (branchExists) {
        return res.status(400).json({ 
          error: `Branch '${finalBranchName}' already exists. Please choose a different name.` 
        });
      }

      // Get main branch reference
      const mainRef = await makeGitHubRequest('GET', `repos/${user.login}/${REPO_NAME}/git/ref/heads/${MAIN_BRANCH}`, null, token);
      
      // Create new branch
      await makeGitHubRequest('POST', `repos/${user.login}/${REPO_NAME}/git/refs`, {
        ref: `refs/heads/${finalBranchName}`,
        sha: mainRef.object.sha
      }, token);

      // Update config.js file
      let configSha;
      try {
        const fileData = await makeGitHubRequest('GET', `repos/${user.login}/${REPO_NAME}/contents/config.js?ref=${finalBranchName}`, null, token);
        configSha = fileData.sha;
      } catch (error) {
        // File doesn't exist, will create new
      }

      await makeGitHubRequest('PUT', `repos/${user.login}/${REPO_NAME}/contents/config.js`, {
        message: `Update config.js for ${finalBranchName}`,
        content: Buffer.from(`module.exports = { SESSION_ID: "${sessionId}" };`).toString('base64'),
        branch: finalBranchName,
        sha: configSha
      }, token);

      // Create workflow file
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

      // Trigger workflow
      await makeGitHubRequest('POST', `repos/${user.login}/${REPO_NAME}/actions/workflows/${WORKFLOW_FILE}/dispatches`, {
        ref: finalBranchName
      }, token);

      // Save deployment to storage
      await storage.createDeployment({
        sessionId,
        branchName: finalBranchName,
        githubUsername: user.login,
        repositoryName: REPO_NAME,
        status: 'success',
        message: 'Deployment completed successfully'
      });

      res.json({ 
        success: true, 
        message: 'Deployment successful!', 
        branch: finalBranchName, 
        repository: `${user.login}/${REPO_NAME}` 
      });
    } catch (error: any) {
      console.error('Deployment error:', error);
      
      // Save failed deployment if we have user info
      if (req.session.githubUsername) {
        try {
          await storage.createDeployment({
            sessionId: req.body.sessionId || '',
            branchName: req.body.branchName || '',
            githubUsername: req.session.githubUsername,
            repositoryName: REPO_NAME,
            status: 'failed',
            message: error.message
          });
        } catch (storageError) {
          console.error('Failed to save deployment error:', storageError);
        }
      }

      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // Get user deployments
  app.get('/api/deployments', async (req: Request, res: Response) => {
    if (!req.session.githubUsername) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const deployments = await storage.getDeploymentsByUser(req.session.githubUsername);
      res.json(deployments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
