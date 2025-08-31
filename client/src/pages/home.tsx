import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { API_BASE_URL } from '@/lib/config';
import { Github, Zap, Shield, Heart, BarChart3, CheckCircle, XCircle, Info, Settings } from 'lucide-react';
import { WorkflowVerification } from '@/components/workflow-verification';

interface AuthStatus {
  authenticated: boolean;
  username?: string;
}

interface DeploymentResponse {
  success: boolean;
  message: string;
  deploymentId?: string;
  branch?: string;
  repository?: string;
  workflowUrl?: string;
  error?: string;
}

export default function Home() {
  const [sessionId, setSessionId] = useState('');
  const [branchName, setBranchName] = useState('');
  const [showDeployment, setShowDeployment] = useState(false);
  const [workflowVerified, setWorkflowVerified] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [setupCompleted, setSetupCompleted] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check authentication status
  const { data: authStatus, isLoading: authLoading } = useQuery<AuthStatus>({
    queryKey: ['/api/auth/status'],
  });

  // Handle URL parameters for authentication feedback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authenticated = urlParams.get('authenticated');
    const error = urlParams.get('error');

    if (authenticated === 'true') {
      setShowDeployment(true);
      toast({
        title: "Authentication Successful",
        description: "You can now deploy your XYLO-MD bot.",
      });
      // Clean URL
      window.history.replaceState({}, document.title, '/');
    } else if (error) {
      toast({
        title: "Authentication Failed",
        description: decodeURIComponent(error),
        variant: "destructive",
      });
      // Clean URL
      window.history.replaceState({}, document.title, '/');
    }
  }, [toast]);

  // Show deployment form if authenticated
  useEffect(() => {
    if (authStatus?.authenticated) {
      setShowDeployment(true);
    }
  }, [authStatus]);

  // Setup mutation
  const setupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `${API_BASE_URL}/setup`, {});
      return response.json() as Promise<{ success: boolean; message: string; alreadyExists: boolean }>;
    },
    onSuccess: (data) => {
      if (data.success) {
        setSetupCompleted(true);
        setSetupRequired(false);
        toast({
          title: "Repository Setup Complete",
          description: data.alreadyExists ? "Using existing repository." : "Repository fork created successfully.",
        });
        // Refetch workflow status
        queryClient.invalidateQueries({ queryKey: ['/api/workflows/verify'] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to setup repository",
        variant: "destructive",
      });
    },
  });

  // Deploy mutation
  const deployMutation = useMutation({
    mutationFn: async (data: { sessionId: string; branchName?: string }) => {
      const response = await apiRequest('POST', `${API_BASE_URL}/deploy`, data);
      return response.json() as Promise<DeploymentResponse>;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Deployment Successful!",
          description: `Your bot has been deployed to branch: ${data.branch}`,
        });
        setSessionId('');
        setBranchName('');
        // Navigate to deployment details
        if (data.deploymentId) {
          window.location.href = `/deployments/${data.deploymentId}`;
        }
      } else {
        throw new Error(data.error || 'Deployment failed');
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Deployment Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth`;
  };

  const handleDeploy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId.trim()) {
      toast({
        title: "Validation Error",
        description: "Session ID is required",
        variant: "destructive",
      });
      return;
    }
    deployMutation.mutate({ 
      sessionId: sessionId.trim(), 
      branchName: branchName.trim() || undefined 
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-slate-600 dark:text-slate-400 mt-4 font-medium">Loading platform...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Modern Navigation Header */}
      <nav className="backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">XYLO-MD</h1>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Deployment Platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {authStatus?.authenticated && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.href = '/deployments'}
                  className="hidden sm:flex hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  data-testid="button-view-deployments"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Deployments
                </Button>
              )}
              <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                <div className={`w-2 h-2 rounded-full ${
                  authStatus?.authenticated ? 'bg-green-500' : 'bg-yellow-500'
                }`}></div>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300" data-testid="status-deployment">
                  {authStatus?.authenticated ? authStatus.username : 'Ready'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 dark:from-blue-600/20 dark:via-purple-600/20 dark:to-pink-600/20"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
            <div className="text-center">
              <div className="mb-8">
                <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border border-blue-200/50 dark:border-blue-700/50 rounded-full px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 mb-6">
                  <Zap className="w-4 h-4" />
                  <span>Lightning Fast Deployment</span>
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
                  <span className="bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent">
                    Deploy Your WhatsApp Bot
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    in Minutes
                  </span>
                </h1>
              </div>
              <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
                Professional deployment platform for XYLO-MD WhatsApp bots with automated GitHub integration, 
                real-time monitoring, and enterprise-grade reliability.
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Login/Deployment Card */}
            <div className="order-2 lg:order-1">
              {!showDeployment ? (
                <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-xl">
                  <CardContent className="p-8 lg:p-10">
                    <div className="text-center mb-8">
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg ring-4 ring-blue-100 dark:ring-blue-900/30">
                        <Github className="w-10 h-10 text-white" />
                      </div>
                      <h2 className="text-2xl lg:text-3xl font-bold mb-3 text-slate-900 dark:text-white">
                        Connect with GitHub
                      </h2>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                        Securely authenticate with your GitHub account to access repositories and deploy your WhatsApp bot with enterprise-grade automation.
                      </p>
                    </div>
                    
                    <Button 
                      onClick={handleLogin}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-6 h-auto shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl rounded-xl"
                      data-testid="button-github-login"
                    >
                      <Github className="w-5 h-5 mr-3" />
                      Continue with GitHub
                    </Button>

                    <div className="mt-6 text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Secure OAuth • No passwords stored • GitHub's privacy policy applies
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-xl">
                  <CardContent className="p-8 lg:p-10">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 space-y-4 sm:space-y-0">
                      <div>
                        <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">
                          Deploy XYLO-MD
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">
                          Configure and launch your bot instance
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-green-700 dark:text-green-400" data-testid="text-username">
                          {authStatus?.username || 'Connected'}
                        </span>
                      </div>
                    </div>

                    {/* Setup and Verification Steps */}
                    <div className="mb-8 space-y-4">
                      {setupRequired && !setupCompleted && (
                        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-xl">
                          <CardContent className="p-6">
                            <div className="space-y-4">
                              <div className="flex items-center space-x-3">
                                <Settings className="w-5 h-5 text-blue-500" />
                                <div>
                                  <h3 className="font-semibold text-slate-900 dark:text-white">Repository Setup Required</h3>
                                  <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Initialize your bot repository and configure XYLO servers.
                                  </p>
                                </div>
                              </div>
                              <Button
                                onClick={() => setupMutation.mutate()}
                                disabled={setupMutation.isPending}
                                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
                                data-testid="button-setup-repository"
                              >
                                {setupMutation.isPending ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                    Setting up repository...
                                  </>
                                ) : (
                                  <>
                                    <Settings className="w-4 h-4 mr-2" />
                                    Setup Repository
                                  </>
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                      
                      {(!setupRequired || setupCompleted) && (
                        <WorkflowVerification 
                          onVerificationComplete={setWorkflowVerified}
                          onSetupRequired={setSetupRequired}
                        />
                      )}
                    </div>

                    <form onSubmit={handleDeploy} className="space-y-6">
                      <div className="space-y-5">
                        <div>
                          <Label htmlFor="sessionId" className="block text-sm font-semibold text-slate-900 dark:text-white mb-3">
                            WhatsApp Session ID *
                          </Label>
                          <Input
                            type="text"
                            id="sessionId"
                            value={sessionId}
                            onChange={(e) => setSessionId(e.target.value)}
                            className="w-full h-12 px-4 border-slate-300 dark:border-slate-600 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 transition-all"
                            placeholder="Enter your unique session identifier"
                            data-testid="input-session-id"
                            required
                          />
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                            Your WhatsApp session identifier for secure bot authentication
                          </p>
                        </div>

                        <div>
                          <Label htmlFor="branchName" className="block text-sm font-semibold text-slate-900 dark:text-white mb-3">
                            Branch Name <span className="text-slate-500 font-normal">(Optional)</span>
                          </Label>
                          <Input
                            type="text"
                            id="branchName"
                            value={branchName}
                            onChange={(e) => setBranchName(e.target.value)}
                            className="w-full h-12 px-4 border-slate-300 dark:border-slate-600 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 transition-all"
                            placeholder="Auto-generated if left empty"
                            data-testid="input-branch-name"
                          />
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                            Custom branch name for your deployment (e.g., production, staging)
                          </p>
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200/50 dark:border-blue-700/50 rounded-xl p-6">
                        <div className="flex items-start space-x-4">
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Info className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Automated Deployment Process</h4>
                            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1.5 leading-relaxed">
                              <li className="flex items-center space-x-2">
                                <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                                <span>Fork XYLO-MD repository to your account</span>
                              </li>
                              <li className="flex items-center space-x-2">
                                <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                                <span>Create new branch with your configuration</span>
                              </li>
                              <li className="flex items-center space-x-2">
                                <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                                <span>Setup XYLO server configuration</span>
                              </li>
                              <li className="flex items-center space-x-2">
                                <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                                <span>Deploy and start your bot automatically</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={deployMutation.isPending || !workflowVerified || setupRequired}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold py-4 px-6 h-auto shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl rounded-xl disabled:scale-100 disabled:shadow-md"
                        data-testid="button-deploy"
                      >
                        {deployMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                            Deploying Your Bot...
                          </>
                        ) : setupRequired ? (
                          <>
                            <XCircle className="w-5 h-5 mr-3" />
                            Complete Repository Setup Above
                          </>
                        ) : !workflowVerified ? (
                          <>
                            <XCircle className="w-5 h-5 mr-3" />
                            Complete Server Verification Above
                          </>
                        ) : (
                          <>
                            <Zap className="w-5 h-5 mr-3" />
                            Deploy Bot Now
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Features Panel */}
            <div className="order-1 lg:order-2 space-y-6">
              <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-xl">
                <CardContent className="p-8">
                  <h3 className="text-xl font-bold mb-8 text-slate-900 dark:text-white">Why Choose XYLO-MD?</h3>
                  <div className="space-y-6">
                    <div className="group">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow">
                          <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Enterprise Security</h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                            GitHub OAuth with state validation, secure session management, and encrypted token storage
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="group">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow">
                          <Heart className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Smart Automation</h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                            XYLO server integration with intelligent restart, continuous deployment, and error recovery
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="group">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow">
                          <Zap className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Lightning Fast</h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                            Deploy in under 90 seconds with optimized configurations and instant scaling
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="group">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow">
                          <BarChart3 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Live Monitoring</h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                            Real-time deployment logs, health checks, and comprehensive error reporting
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* How It Works Section */}
          <div className="mt-20">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                How It Works
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                Four simple steps to get your WhatsApp bot deployed and running
              </p>
            </div>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center group">
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                    <span className="text-2xl font-bold text-white">1</span>
                  </div>
                  <div className="absolute top-1/2 left-full w-8 h-0.5 bg-gradient-to-r from-blue-300 to-transparent hidden lg:block transform -translate-y-1/2"></div>
                </div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Connect GitHub</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Secure OAuth authentication with your GitHub account for repository access
                </p>
              </div>

              <div className="text-center group">
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                    <span className="text-2xl font-bold text-white">2</span>
                  </div>
                  <div className="absolute top-1/2 left-full w-8 h-0.5 bg-gradient-to-r from-purple-300 to-transparent hidden lg:block transform -translate-y-1/2"></div>
                </div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Configure Bot</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Enter your WhatsApp session ID and custom deployment preferences
                </p>
              </div>

              <div className="text-center group">
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                    <span className="text-2xl font-bold text-white">3</span>
                  </div>
                  <div className="absolute top-1/2 left-full w-8 h-0.5 bg-gradient-to-r from-green-300 to-transparent hidden lg:block transform -translate-y-1/2"></div>
                </div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Auto Deploy</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Automated repository forking, configuration setup, and workflow deployment
                </p>
              </div>

              <div className="text-center group">
                <div className="mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                    <span className="text-2xl font-bold text-white">4</span>
                  </div>
                </div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Bot Live</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Your WhatsApp bot runs with automatic monitoring and intelligent restarts
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modern Footer */}
      <footer className="relative bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 border-t border-slate-200 dark:border-slate-700 mt-20">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-6 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-white text-lg">XYLO-MD</p>
                <p className="text-sm text-slate-400">Professional Deployment Platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-8 text-sm">
              <a href="#" className="text-slate-400 hover:text-white transition-colors font-medium">
                Documentation
              </a>
              <a 
                href="https://whatsapp.com/channel/0029VbAsXu9G8l58euAhew3f" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-white transition-colors font-medium"
              >
                Support
              </a>
              <a 
                href="https://github.com/DAV-EX" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-white transition-colors font-medium flex items-center space-x-1"
              >
                <Github className="w-4 h-4" />
                <span>GitHub</span>
              </a>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-700 text-center">
            <p className="text-xs text-slate-500">
              &copy; 2025@DavidXTech integrated with XYLO server
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}