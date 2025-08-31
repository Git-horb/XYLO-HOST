import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
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
    saveUninitialized: true,
    cookie: { 
      secure: false, // Set to false for now to allow HTTP in development
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax'
    }
  }));

  // Create HTTP server
  const server = createServer(app);
  
  // WebSocket server for live logs - use path to avoid Vite HMR conflicts
  const wss = new WebSocketServer({ 
    server,
    path: '/api/logs-ws' // Specific path to avoid conflicts with Vite HMR
  });
  
  // Store active log streams
  const activeStreams = new Map<string, Set<any>>();

  // WebSocket connection handler
  wss.on('connection', (ws, req) => {
    console.log('WebSocket client connected to logs endpoint');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'subscribe' && data.deploymentId) {
          // Subscribe to deployment logs
          if (!activeStreams.has(data.deploymentId)) {
            activeStreams.set(data.deploymentId, new Set());
          }
          activeStreams.get(data.deploymentId)!.add(ws);
          console.log(`Client subscribed to deployment: ${data.deploymentId}`);
          
          // Start streaming logs for this deployment
          startLogStreaming(data.deploymentId);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      // Remove from all active streams
      activeStreams.forEach((clients, deploymentId) => {
        clients.delete(ws);
        if (clients.size === 0) {
          activeStreams.delete(deploymentId);
        }
      });
      console.log('WebSocket client disconnected from logs endpoint');
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // Function to fetch GitHub Actions workflow run logs
  async function fetchWorkflowLogs(deploymentId: string, token: string) {
    try {
      const deployment = await storage.getDeployment(deploymentId);
      if (!deployment || !deployment.workflowUrl) return [];

      // Extract repo and workflow info from workflow URL
      const repoMatch = deployment.workflowUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!repoMatch) return [];

      const [, owner, repo] = repoMatch;
      
      // Get workflow runs
      const runs = await makeGitHubRequest('GET', `repos/${owner}/${repo}/actions/runs?per_page=10`, null, token);
      if (!runs || !runs.workflow_runs || runs.workflow_runs.length === 0) return [];

      const latestRun = runs.workflow_runs[0];
      if (!latestRun) return [];

      // Get jobs for the latest run
      const jobs = await makeGitHubRequest('GET', `repos/${owner}/${repo}/actions/runs/${latestRun.id}/jobs`, null, token);
      if (!jobs || !jobs.jobs || jobs.jobs.length === 0) return [];

      const logs = [];
      for (const job of jobs.jobs) {
        if (job.steps) {
          for (const step of job.steps) {
            if (step.conclusion !== null || step.status === 'in_progress') {
              logs.push({
                id: `${job.id}-${step.number}`,
                timestamp: step.started_at || step.created_at,
                step: step.name,
                status: step.conclusion || step.status || 'pending',
                message: `Step: ${step.name}`,
                runId: latestRun.id,
                jobId: job.id,
                stepNumber: step.number
              });
            }
          }
        }
      }

      return logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    } catch (error) {
      console.error('Error fetching workflow logs:', error);
      return [];
    }
  }

  // Function to start log streaming for a deployment
  async function startLogStreaming(deploymentId: string) {
    const deployment = await storage.getDeployment(deploymentId);
    if (!deployment) {
      console.log(`Deployment ${deploymentId} not found for log streaming`);
      return;
    }

    const clients = activeStreams.get(deploymentId);
    if (!clients || clients.size === 0) {
      console.log(`No clients connected for deployment ${deploymentId}`);
      return;
    }

    console.log(`Starting log streaming for deployment: ${deploymentId}, status: ${deployment.status}`);

    // Get the user's GitHub token from deployment data
    const token = deployment.githubToken;
    
    if (!token) {
      console.error(`No GitHub token found for deployment ${deploymentId}`);
      return;
    }
    
    console.log('Using user GitHub token for log streaming');

    const streamLogs = async () => {
      try {
        // Refresh deployment status each time
        const currentDeployment = await storage.getDeployment(deploymentId);
        if (!currentDeployment) {
          console.log(`Deployment ${deploymentId} no longer exists, stopping log stream`);
          return;
        }

        const logs = await fetchWorkflowLogs(deploymentId, token);
        console.log(`Fetched ${logs.length} logs for deployment ${deploymentId}`);
        
        // Broadcast logs to all connected clients for this deployment
        const message = JSON.stringify({
          type: 'logs',
          deploymentId,
          logs,
          timestamp: new Date().toISOString()
        });

        const currentClients = activeStreams.get(deploymentId);
        if (currentClients && currentClients.size > 0) {
          currentClients.forEach(client => {
            if (client.readyState === 1) { // WebSocket.OPEN
              console.log(`Sending ${logs.length} logs to client for deployment ${deploymentId}`);
              client.send(message);
            }
          });
        }

        // Continue streaming if deployment is still running and we have clients
        const stillHasClients = activeStreams.get(deploymentId)?.size ?? 0 > 0;
        if ((currentDeployment.status === 'running' || currentDeployment.status === 'pending') && stillHasClients) {
          setTimeout(streamLogs, 3000); // Poll every 3 seconds for more responsive updates
        } else {
          console.log(`Stopping log stream for ${deploymentId}. Status: ${currentDeployment.status}, Clients: ${stillHasClients}`);
        }
      } catch (error) {
        console.error('Error in log streaming:', error);
        // Retry after error
        const currentClients = activeStreams.get(deploymentId);
        if (currentClients && currentClients.size > 0) {
          setTimeout(streamLogs, 5000);
        }
      }
    };

    // Start streaming immediately
    streamLogs();
  }

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
      console.log(`GitHub API ${method} ${endpoint}`, data ? { hasData: true, keys: Object.keys(data) } : { hasData: false });
      
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
      console.error(`GitHub API Error ${method} ${endpoint}:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.response?.data?.message,
        errors: error.response?.data?.errors,
        originalError: error.message
      });
      
      if (error.response?.status === 404) return null;
      
      // Provide more specific error messages
      const errorMsg = error.response?.data?.message || error.message;
      if (errorMsg.includes('sha')) {
        throw new Error(`File update failed: ${errorMsg}. This usually means the file was modified since we last checked it.`);
      }
      
      throw new Error(errorMsg);
    }
  }

  // GitHub OAuth initiation
  app.get('/api/auth', (req: Request, res: Response) => {
    const state = Math.random().toString(36).substring(2, 15);
    req.session.state = state;
    
    // Debug logging for session creation
    console.log('OAuth init - created state:', state);
    console.log('OAuth init - session ID:', req.session.id);
    
    const callbackUrl = getCallbackUrl(req);
    res.redirect(`https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${state}&scope=repo,workflow`);
  });

  // GitHub OAuth callback
  app.get('/api/auth/callback', async (req: Request, res: Response) => {
    const { code, state } = req.query;
    
    // Debug logging for state validation
    console.log('OAuth callback - received state:', state);
    console.log('OAuth callback - session state:', req.session.state);
    console.log('OAuth callback - session ID:', req.session.id);
    
    if (state !== req.session.state) {
      console.error('State mismatch - possible session issue');
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers.host;
      return res.redirect(`${protocol}://${host}/?error=${encodeURIComponent('Authentication failed. Please try again.')}`);
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

      // Redirect to deployment page after successful authentication
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers.host;
      res.redirect(`${protocol}://${host}/deployments?authenticated=true`);
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

  // Repository setup endpoint (fork creation)
  app.post('/api/setup', async (req: Request, res: Response) => {
    try {
      const token = req.session.githubToken;
      const username = req.session.githubUsername;

      if (!token || !username) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Check if fork already exists
      let fork = null;
      try {
        fork = await makeGitHubRequest('GET', `repos/${username}/${REPO_NAME}`, null, token);
        if (fork.fork && fork.parent.full_name === `${REPO_OWNER}/${REPO_NAME}`) {
          return res.json({ 
            success: true, 
            message: 'Repository already exists and ready.',
            alreadyExists: true
          });
        }
      } catch (error) {
        // Fork doesn't exist, proceed with creation
      }

      // Create fork
      fork = await makeGitHubRequest('POST', `repos/${REPO_OWNER}/${REPO_NAME}/forks`, {}, token);
      
      // Wait a moment for fork to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));

      res.json({ 
        success: true, 
        message: 'Repository setup completed successfully.',
        forkUrl: fork.html_url,
        alreadyExists: false
      });
    } catch (error: any) {
      console.error('Setup error:', error);
      res.status(500).json({ 
        error: error.message || 'Setup failed. Please try again.' 
      });
    }
  });

  // Workflow verification endpoint
  app.get('/api/workflows/verify', async (req: Request, res: Response) => {
    try {
      const token = req.session.githubToken;
      const username = req.session.githubUsername;

      if (!token || !username) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Check if user has a fork
      let fork = null;
      try {
        fork = await makeGitHubRequest('GET', `repos/${username}/${REPO_NAME}`, null, token);
        if (!fork.fork || fork.parent.full_name !== `${REPO_OWNER}/${REPO_NAME}`) {
          return res.json({ 
            hasFork: false, 
            workflowsEnabled: false,
            needsFork: true,
            message: 'Repository fork required. Will be created during deployment.' 
          });
        }
      } catch (error) {
        return res.json({ 
          hasFork: false, 
          workflowsEnabled: false,
          needsFork: true,
          message: 'Repository fork required. Will be created during deployment.' 
        });
      }

      // Check if workflows are enabled
      try {
        const actionsPermissions = await makeGitHubRequest('GET', `repos/${username}/${REPO_NAME}/actions/permissions`, null, token);
        
        if (actionsPermissions && actionsPermissions.enabled !== false) {
          return res.json({ 
            hasFork: true, 
            workflowsEnabled: true,
            needsFork: false,
            message: 'Repository fork exists and workflows are enabled. Ready to deploy!' 
          });
        } else {
          return res.json({ 
            hasFork: true, 
            workflowsEnabled: false,
            needsFork: false,
            enableUrl: `https://github.com/${username}/${REPO_NAME}/actions`,
            message: 'Repository fork exists but workflows need to be enabled manually.' 
          });
        }
      } catch (actionsError: any) {
        if (actionsError.response?.status === 404) {
          // Actions are likely disabled
          return res.json({ 
            hasFork: true, 
            workflowsEnabled: false,
            needsFork: false,
            enableUrl: `https://github.com/${username}/${REPO_NAME}/actions`,
            message: 'Repository fork exists but workflows need to be enabled manually.' 
          });
        } else {
          return res.json({ 
            hasFork: true, 
            workflowsEnabled: false,
            needsFork: false,
            enableUrl: `https://github.com/${username}/${REPO_NAME}/actions`,
            message: 'Could not verify workflow status. Please check manually.' 
          });
        }
      }
    } catch (error: any) {
      console.error('Workflow verification error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Deploy endpoint with live logging
  app.post('/api/deploy', async (req: Request, res: Response) => {
    let deployment: any = null;
    
    try {
      const { sessionId, branchName } = deploymentRequestSchema.parse(req.body);
      const token = req.session.githubToken;
      const username = req.session.githubUsername;

      if (!token || !username) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Create initial deployment record
      deployment = await storage.createDeployment({
        sessionId,
        branchName: branchName || null,
        githubUsername: username,
        repositoryName: REPO_NAME,
        githubToken: token, // Store user's GitHub token for log access
        status: 'running',
        message: 'Deployment started'
      });

      // Helper function to log deployment steps
      const logStep = async (step: string, status: string, message: string) => {
        await storage.createDeploymentLog({
          deploymentId: deployment.id,
          step,
          status,
          message
        });
      };

      // Step 1: Get user info
      await logStep('init', 'running', 'Getting user information...');
      const user = await makeGitHubRequest('GET', 'user', null, token);
      await logStep('init', 'success', `Connected as ${user.login}`);
      
      // Step 2: Check/Create fork
      await logStep('fork', 'running', 'Checking repository fork...');
      let fork = null;
      try {
        fork = await makeGitHubRequest('GET', `repos/${user.login}/${REPO_NAME}`, null, token);
        if (!fork.fork || fork.parent.full_name !== `${REPO_OWNER}/${REPO_NAME}`) {
          fork = null;
        }
      } catch (error) {
        // Fork doesn't exist
      }
      
      // Pre-check: If fork exists, verify Actions are likely to work
      if (fork) {
        await logStep('actions-check', 'running', 'Checking GitHub Actions compatibility...');
        try {
          // Try to get Actions permissions - this will fail if Actions are disabled
          await makeGitHubRequest('GET', `repos/${user.login}/${REPO_NAME}/actions/permissions`, null, token);
          await logStep('actions-check', 'success', 'GitHub Actions are enabled and accessible');
        } catch (actionsError: any) {
          if (actionsError.response?.status === 404) {
            await logStep('actions-check', 'warning', `GitHub Actions may be disabled on your fork. You may need to enable them manually at: https://github.com/${user.login}/${REPO_NAME}/settings/actions`);
          } else {
            await logStep('actions-check', 'warning', 'Could not verify GitHub Actions status - proceeding with deployment');
          }
        }
      }

      if (!fork) {
        await logStep('fork', 'running', 'Creating repository fork...');
        fork = await makeGitHubRequest('POST', `repos/${REPO_OWNER}/${REPO_NAME}/forks`, {}, token);
        await new Promise(resolve => setTimeout(resolve, 2000));
        await logStep('fork', 'success', 'Repository fork created successfully');
        
        // Add important note about workflow enablement for new forks
        await logStep('fork-info', 'warning', `⚠️ New fork created. GitHub disables workflows on forks by default for security. You'll need to enable them manually one time.`);
      } else {
        await logStep('fork', 'success', 'Using existing repository fork');
        
        // Check if this is a fork and add helpful info
        if (fork.fork) {
          await logStep('fork-info', 'info', `🔄 Working with forked repository. If this is your first deployment, you may need to enable workflows manually.`);
        }
      }
      
      // Important: Check and auto-enable Actions if needed
      await logStep('actions-check', 'running', 'Verifying GitHub Actions are enabled on your fork...');
      try {
        const actionsPermissions = await makeGitHubRequest('GET', `repos/${user.login}/${REPO_NAME}/actions/permissions`, null, token);
        
        if (actionsPermissions && actionsPermissions.enabled === false) {
          // Actions are disabled, let's enable them automatically
          await logStep('actions-enable', 'running', 'GitHub Actions are disabled. Auto-enabling them now...');
          
          await makeGitHubRequest('PUT', `repos/${user.login}/${REPO_NAME}/actions/permissions`, {
            enabled: true,
            allowed_actions: 'all'
          }, token);
          
          await logStep('actions-enable', 'success', '✅ GitHub Actions have been automatically enabled!');
        } else {
          await logStep('actions-check', 'success', 'GitHub Actions are already enabled and ready');
        }
      } catch (actionsError: any) {
        if (actionsError.response?.status === 404) {
          // Likely means Actions are disabled entirely - try to enable them
          await logStep('actions-enable', 'running', 'GitHub Actions appear disabled. Attempting to auto-enable...');
          
          try {
            await makeGitHubRequest('PUT', `repos/${user.login}/${REPO_NAME}/actions/permissions`, {
              enabled: true,
              allowed_actions: 'all'
            }, token);
            
            await logStep('actions-enable', 'success', '✅ GitHub Actions have been automatically enabled!');
          } catch (enableError: any) {
            await logStep('actions-enable', 'failed', `Failed to auto-enable Actions (${enableError.response?.status}). You may need to enable them manually at: https://github.com/${user.login}/${REPO_NAME}/settings/actions`);
          }
        } else {
          await logStep('actions-check', 'warning', `Could not verify Actions status (${actionsError.response?.status}). Proceeding with deployment...`);
        }
      }

      // Step 3: Generate and create branch
      const finalBranchName = branchName && branchName.trim() ? 
        branchName.trim() : 
        `xylo-${Math.random().toString(36).substring(2, 8)}`;

      await logStep('branch', 'running', `Creating branch: ${finalBranchName}...`);

      // Check if branch exists
      const branchExists = await makeGitHubRequest('GET', `repos/${user.login}/${REPO_NAME}/git/ref/heads/${finalBranchName}`, null, token);
      if (branchExists) {
        await logStep('branch', 'failed', `Branch '${finalBranchName}' already exists`);
        throw new Error(`Branch '${finalBranchName}' already exists. Please choose a different name.`);
      }

      // Get main branch reference and create new branch
      const mainRef = await makeGitHubRequest('GET', `repos/${user.login}/${REPO_NAME}/git/ref/heads/${MAIN_BRANCH}`, null, token);
      await makeGitHubRequest('POST', `repos/${user.login}/${REPO_NAME}/git/refs`, {
        ref: `refs/heads/${finalBranchName}`,
        sha: mainRef.object.sha
      }, token);

      await logStep('branch', 'success', `Branch '${finalBranchName}' created successfully`);

      // Step 4: Update config file
      await logStep('config', 'running', 'Updating configuration file...');
      let configSha;
      let existingConfigContent = '';
      
      try {
        const fileData = await makeGitHubRequest('GET', `repos/${user.login}/${REPO_NAME}/contents/config.js?ref=${finalBranchName}`, null, token);
        configSha = fileData.sha;
        existingConfigContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
        console.log('Existing config content:', existingConfigContent);
      } catch (error) {
        // File doesn't exist, create with default structure
        existingConfigContent = `module.exports = {\n  SESSION_ID: 'session id here'\n};`;
        console.log('Config file not found, using default structure');
      }

      // Parse and update the existing config, preserving all other settings
      let updatedConfigContent;
      try {
        // Handle ES6 module config that reads SESSION_ID from environment variables
        if (existingConfigContent.includes('process.env.SESSION_ID')) {
          // Replace the fallback value in the SESSION_ID getter
          updatedConfigContent = existingConfigContent.replace(
            /get SESSION_ID\(\)\s*{\s*return\s+process\.env\.SESSION_ID\s*\|\|\s*['"`][^'"`]*['"`]\s*}/g,
            `get SESSION_ID() { return process.env.SESSION_ID || '${sessionId}' }`
          );
          
          // Also handle single line format
          if (updatedConfigContent === existingConfigContent) {
            updatedConfigContent = existingConfigContent.replace(
              /(get SESSION_ID\(\)\s*{\s*return\s+process\.env\.SESSION_ID\s*\|\|\s*)['"`][^'"`]*['"`]/g,
              `$1'${sessionId}'`
            );
          }
        } else if (existingConfigContent.includes('SESSION_ID')) {
          // Handle other SESSION_ID formats (legacy support)
          const lines = existingConfigContent.split('\n');
          const updatedLines = lines.map(line => {
            if (line.includes('SESSION_ID')) {
              if (line.includes(':')) {
                return line.replace(/(\s*SESSION_ID\s*:\s*).*$/, `$1"${sessionId}"`);
              } else if (line.includes('=')) {
                return line.replace(/(\s*SESSION_ID\s*=\s*).*$/, `$1"${sessionId}"`);
              }
            }
            return line;
          });
          updatedConfigContent = updatedLines.join('\n');
        } else {
          // Add SESSION_ID if it doesn't exist - create .env file instead
          console.log('SESSION_ID not found in config, will create .env file');
          updatedConfigContent = existingConfigContent; // Keep config unchanged
        }
        
        // Ensure content actually changed for env-based configs
        if (updatedConfigContent === existingConfigContent && existingConfigContent.includes('process.env.SESSION_ID')) {
          console.log('Environment-based config detected, forcing fallback value update...');
          // More aggressive replacement for environment configs
          updatedConfigContent = existingConfigContent.replace(
            /(process\.env\.SESSION_ID\s*\|\|\s*)['"`][^'"`]*['"`]/g,
            `$1'${sessionId}'`
          );
        }
      } catch (error) {
        console.log('Error in config processing:', error);
        updatedConfigContent = existingConfigContent;
      }

      console.log('Session ID being written:', sessionId);
      console.log('Updated config content:', updatedConfigContent);

      const configUpdateData: any = {
        message: `Update config.js for ${finalBranchName}`,
        content: Buffer.from(updatedConfigContent).toString('base64'),
        branch: finalBranchName
      };
      
      if (configSha) {
        configUpdateData.sha = configSha;
        console.log('Using SHA for config.js update:', configSha);
      } else {
        console.log('No SHA provided - creating new config.js file');
      }
      
      await makeGitHubRequest('PUT', `repos/${user.login}/${REPO_NAME}/contents/config.js`, configUpdateData, token);

      // Also create/update .env file for environment variables
      try {
        let envSha;
        let existingEnvContent = '';
        
        try {
          const envFileData = await makeGitHubRequest('GET', `repos/${user.login}/${REPO_NAME}/contents/.env?ref=${finalBranchName}`, null, token);
          envSha = envFileData.sha;
          existingEnvContent = Buffer.from(envFileData.content, 'base64').toString('utf-8');
        } catch (error) {
          // .env file doesn't exist, will create new
          console.log('.env file not found, creating new one');
        }

        // Update or add SESSION_ID in .env file
        let updatedEnvContent;
        if (existingEnvContent.includes('SESSION_ID')) {
          // Replace existing SESSION_ID in .env
          updatedEnvContent = existingEnvContent.replace(
            /SESSION_ID\s*=\s*.*/g,
            `SESSION_ID=${sessionId}`
          );
        } else {
          // Add SESSION_ID to existing .env content
          updatedEnvContent = existingEnvContent + (existingEnvContent ? '\n' : '') + `SESSION_ID=${sessionId}`;
        }

        const envUpdateData: any = {
          message: `Update .env with session ID for ${finalBranchName}`,
          content: Buffer.from(updatedEnvContent).toString('base64'),
          branch: finalBranchName
        };
        
        if (envSha) {
          envUpdateData.sha = envSha;
          console.log('Using SHA for .env update:', envSha);
        } else {
          console.log('No SHA provided - creating new .env file');
        }
        
        await makeGitHubRequest('PUT', `repos/${user.login}/${REPO_NAME}/contents/.env`, envUpdateData, token);

        console.log('.env file updated with SESSION_ID');
      } catch (error) {
        console.log('Error updating .env file:', error);
        // Continue even if .env update fails, since we updated the config fallback
      }

      await logStep('config', 'success', 'Configuration file updated with session ID');

      // Step 5: Create workflow
      await logStep('workflow', 'running', 'Creating GitHub Actions workflow...');
      
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
          
      - name: Debug Environment
        run: |
          echo "=== ENVIRONMENT DEBUG ==="
          echo "Node version: \$(node --version)"
          echo "NPM version: \$(npm --version)"
          echo "Working directory: \$(pwd)"
          echo "Files in current directory:"
          ls -la
          echo "=== SESSION ID CHECK ==="
          if [ -f ".env" ]; then
            echo ".env file found:"
            cat .env
          else
            echo "No .env file found"
          fi
          echo "=== CONFIG FILE CHECK ==="
          if [ -f "config.js" ]; then
            echo "config.js content:"
            cat config.js
          else
            echo "No config.js found"
          fi
          
      - name: Install Dependencies
        run: |
          echo "=== INSTALLING DEPENDENCIES ==="
          npm install --verbose
          echo "=== DEPENDENCY TREE ==="
          npm list --depth=0
          
      - name: Pre-run Checks
        run: |
          echo "=== PRE-RUN CHECKS ==="
          echo "Checking package.json scripts:"
          cat package.json | grep -A 10 '"scripts"'
          echo "=== CHECKING FOR MAIN FILES ==="
          if [ -f "index.js" ]; then echo "✓ index.js found"; else echo "✗ index.js missing"; fi
          if [ -f "app.js" ]; then echo "✓ app.js found"; else echo "✗ app.js missing"; fi
          if [ -f "main.js" ]; then echo "✓ main.js found"; else echo "✗ main.js missing"; fi
          
      - name: Run Bot with Detailed Logging
        run: |
          echo "=== STARTING XYLO-MD BOT ==="
          echo "Timestamp: \$(date)"
          echo "Starting bot with detailed logging..."
          
          # Function to run bot with logging
          run_bot() {
            echo ">>> Attempting to start bot..."
            npm start 2>&1 | while IFS= read -r line; do
              echo "[\$(date '+%Y-%m-%d %H:%M:%S')] \$line"
            done
            echo ">>> Bot process ended with exit code: \$?"
          }
          
          # Run bot in loop with detailed error handling
          timeout 18000 bash -c '
            attempt=1
            while true; do
              echo "=== ATTEMPT #\$attempt ==="
              run_bot() {
                echo ">>> Starting bot attempt #\$attempt at \$(date)"
                npm start 2>&1 | while IFS= read -r line; do
                  echo "[\$(date +"%H:%M:%S")] \$line"
                done
                exit_code=\$?
                echo ">>> Bot stopped with exit code: \$exit_code at \$(date)"
                return \$exit_code
              }
              
              if run_bot; then
                echo "Bot exited normally, restarting in 5 seconds..."
              else
                echo "Bot crashed, analyzing error and restarting in 10 seconds..."
                echo "=== ERROR ANALYSIS ==="
                echo "Checking system resources:"
                free -h
                df -h
                echo "Recent system messages:"
                dmesg | tail -5 2>/dev/null || echo "No system messages available"
              fi
              
              attempt=\$((attempt + 1))
              if [ \$attempt -gt 1 ]; then
                echo "Waiting before restart..."
                sleep 10
              else
                sleep 5
              fi
            done
          ' || echo "Timeout reached after 5 hours"
          
      - name: Post-Run Analysis
        if: always()
        run: |
          echo "=== POST-RUN ANALYSIS ==="
          echo "Final timestamp: \$(date)"
          echo "Checking for any log files:"
          find . -name "*.log" -type f 2>/dev/null || echo "No log files found"
          echo "=== FINAL SYSTEM STATE ==="
          free -h
          df -h
          
      - name: Re-Trigger Workflow
        if: always()
        run: |
          echo "=== AUTO-RESTART ==="
          echo "Preparing to restart workflow at \$(date)"
          sleep 30
          curl -X POST \\
            -H "Authorization: Bearer \${{ secrets.GITHUB_TOKEN }}" \\
            -H "Accept: application/vnd.github.v3+json" \\
            https://api.github.com/repos/\${{ github.repository }}/actions/workflows/${WORKFLOW_FILE}/dispatches \\
            -d '{"ref":"${finalBranchName}"}'
          echo "Restart triggered successfully"
`;

      // Check if workflow file already exists to get SHA for update
      let workflowSha;
      try {
        const existingWorkflow = await makeGitHubRequest('GET', `repos/${user.login}/${REPO_NAME}/contents/.github/workflows/${WORKFLOW_FILE}?ref=${finalBranchName}`, null, token);
        workflowSha = existingWorkflow?.sha;
        console.log('Existing workflow file found, will update with SHA:', workflowSha);
      } catch (error) {
        console.log('No existing workflow file found, creating new one');
      }
      
      const workflowUpdateData: any = {
        message: `Create workflow for ${finalBranchName}`,
        content: Buffer.from(workflowContent).toString('base64'),
        branch: finalBranchName
      };
      
      if (workflowSha) {
        workflowUpdateData.sha = workflowSha;
      }
      
      await makeGitHubRequest('PUT', `repos/${user.login}/${REPO_NAME}/contents/.github/workflows/${WORKFLOW_FILE}`, workflowUpdateData, token);

      await logStep('workflow', 'success', 'GitHub Actions workflow created');

      // Step 6: Trigger deployment (only if workflow was created successfully)
      await logStep('deploy', 'running', 'Triggering deployment workflow...');
      
      // Wait for GitHub to process the new workflow file and Actions enablement
      console.log('Waiting for GitHub to process workflow file and Actions settings...');
      await new Promise(resolve => setTimeout(resolve, 8000)); // Extended wait time for Actions enablement
      
      try {
        // First verify the workflow file was created
        console.log('Verifying workflow file exists...');
        const workflowCheck = await makeGitHubRequest('GET', `repos/${user.login}/${REPO_NAME}/contents/.github/workflows/${WORKFLOW_FILE}?ref=${finalBranchName}`, null, token);
        
        if (!workflowCheck) {
          throw new Error('Workflow file was not created successfully. Please add the workflow file manually to your repository.');
        }
        
        // Check if GitHub Actions are enabled on this repository
        console.log('Checking if GitHub Actions are enabled...');
        try {
          const repoInfo = await makeGitHubRequest('GET', `repos/${user.login}/${REPO_NAME}`, null, token);
          const actionsEnabled = await makeGitHubRequest('GET', `repos/${user.login}/${REPO_NAME}/actions/permissions`, null, token);
          console.log('Repository Actions permissions:', actionsEnabled);
        } catch (actionsError: any) {
          console.warn('Could not check Actions permissions:', actionsError.message);
        }
        
        console.log('Workflow file verified, triggering workflow...');
        console.log(`Triggering workflow: repos/${user.login}/${REPO_NAME}/actions/workflows/${WORKFLOW_FILE}/dispatches`);
        console.log(`Branch: ${finalBranchName}`);
        
        const dispatchResult = await makeGitHubRequest('POST', `repos/${user.login}/${REPO_NAME}/actions/workflows/${WORKFLOW_FILE}/dispatches`, {
          ref: finalBranchName
        }, token);
        
        console.log('Workflow dispatch result:', dispatchResult);
        
        // Update deployment status to running since workflow was triggered
        await storage.updateDeployment(deployment.id, {
          status: 'running',
          message: 'Bot deployment workflow is now running'
        });
        
        await logStep('deploy', 'success', '✅ Deployment workflow triggered successfully! Check GitHub Actions tab to see progress.');
      } catch (dispatchError: any) {
        console.error('Workflow dispatch failed:', dispatchError);
        console.error('Dispatch error details:', {
          status: dispatchError.response?.status,
          statusText: dispatchError.response?.statusText,
          data: dispatchError.response?.data,
          message: dispatchError.message
        });
        
        // Check if this is a fork to provide more specific guidance
        const isFork = fork && fork.fork === true;
        
        let errorMessage = 'Failed to trigger workflow';
        let instructions = '';
        
        if (dispatchError.response?.status === 404) {
          if (isFork) {
            errorMessage = '🔒 Fork workflows need manual enablement (one-time setup)';
            instructions = `GitHub automatically disables workflows on forked repositories for security.

🔧 QUICK FIX (30 seconds):
1. Open: https://github.com/${user.login}/${REPO_NAME}/actions
2. Click: "I understand my workflows, go ahead and enable them" 
3. Return here and deploy again

✨ GOOD NEWS: This is only needed once! After enabling, all future deployments will work automatically.

This is a GitHub security requirement that cannot be bypassed via API.`;
          } else {
            errorMessage = 'Workflow not found or Actions disabled';
            instructions = `Please check:
1. Actions are enabled: https://github.com/${user.login}/${REPO_NAME}/settings/actions
2. Workflow file exists: https://github.com/${user.login}/${REPO_NAME}/blob/${finalBranchName}/.github/workflows/${WORKFLOW_FILE}`;
          }
        } else if (dispatchError.response?.status === 403) {
          errorMessage = 'Insufficient permissions to trigger GitHub Actions';
          instructions = 'Please ensure you have admin or write access to the repository and try again.';
        } else {
          errorMessage = `Workflow dispatch failed: ${dispatchError.message}`;
          instructions = `Please manually trigger the workflow:
1. Go to https://github.com/${user.login}/${REPO_NAME}/actions
2. Click on "XYLO-MD-DEPLOY" workflow
3. Click "Run workflow" and select branch: ${finalBranchName}`;
        }
        
        await logStep('deploy', 'failed', `${errorMessage}. ${instructions}`);
        
        // Update deployment with specific instructions
        await storage.updateDeployment(deployment.id, {
          status: 'failed',
          message: `${errorMessage}\n\n${instructions}`
        });
        
        throw new Error(errorMessage);
      }

      const workflowUrl = `https://github.com/${user.login}/${REPO_NAME}/actions`;

      // Update deployment with workflow URL (status already set to 'running' above)
      await storage.updateDeployment(deployment.id, {
        branchName: finalBranchName,
        workflowUrl
      });

      res.json({ 
        success: true, 
        message: 'Deployment successful!', 
        deploymentId: deployment.id,
        branch: finalBranchName, 
        repository: `${user.login}/${REPO_NAME}`,
        workflowUrl
      });

    } catch (error: any) {
      console.error('Deployment error:', error);
      
      if (deployment) {
        await storage.updateDeployment(deployment.id, {
          status: 'failed',
          message: error.message
        });
        
        await storage.createDeploymentLog({
          deploymentId: deployment.id,
          step: 'error',
          status: 'failed',
          message: error.message
        });
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

  // Get deployment logs
  app.get('/api/deployments/:id/logs', async (req: Request, res: Response) => {
    if (!req.session.githubUsername) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const deployment = await storage.getDeployment(req.params.id);
      if (!deployment || deployment.githubUsername !== req.session.githubUsername) {
        return res.status(404).json({ error: 'Deployment not found' });
      }

      const logs = await storage.getDeploymentLogs(req.params.id);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single deployment
  app.get('/api/deployments/:id', async (req: Request, res: Response) => {
    if (!req.session.githubUsername) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const deployment = await storage.getDeployment(req.params.id);
      if (!deployment || deployment.githubUsername !== req.session.githubUsername) {
        return res.status(404).json({ error: 'Deployment not found' });
      }

      res.json(deployment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return server;
}
