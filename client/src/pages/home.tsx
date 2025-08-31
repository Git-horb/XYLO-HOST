import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { API_BASE_URL } from '@/lib/config';
import { Github, Zap, Shield, Heart, BarChart3, CheckCircle, XCircle, Info } from 'lucide-react';

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-sm border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-accent-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">XYLO-MD</h1>
                <p className="text-sm text-primary-foreground/80">Deployment Platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {authStatus?.authenticated && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.href = '/deployments'}
                  className="text-primary-foreground hover:bg-primary/20"
                  data-testid="button-view-deployments"
                >
                  View Deployments
                </Button>
              )}
              <div className="hidden sm:flex items-center space-x-2 text-sm text-primary-foreground/80">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span data-testid="status-deployment">
                  {authStatus?.authenticated ? `Connected as ${authStatus.username}` : 'Ready to Deploy'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Deploy Your WhatsApp Bot in Minutes</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Seamlessly deploy XYLO-MD to GitHub with automated workflows, session management, and continuous deployment.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Login/Deployment Card */}
          {!showDeployment ? (
            <Card className="shadow-lg border-0 bg-gradient-to-br from-card to-card/80">
              <CardContent className="p-6 sm:p-8">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-secondary/10 rounded-xl flex items-center justify-center mx-auto mb-4 ring-1 ring-secondary/20">
                    <Github className="w-8 h-8 text-secondary" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-semibold mb-2">Connect with GitHub</h3>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    Securely authenticate with GitHub to access your repositories and deploy your bot.
                  </p>
                </div>
                
                <Button 
                  onClick={handleLogin}
                  className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-medium py-3 sm:py-4 px-6 h-auto shadow-sm transition-all duration-200 hover:scale-[1.02]"
                  data-testid="button-github-login"
                >
                  <Github className="w-5 h-5 mr-3" />
                  Continue with GitHub
                </Button>

                <div className="mt-6 text-center">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    By connecting, you agree to our deployment terms and GitHub's privacy policy.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-lg border-0 bg-gradient-to-br from-card to-card/80">
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-semibold">Deploy XYLO-MD</h3>
                    <p className="text-muted-foreground">Configure and deploy your bot instance</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-accent rounded-full animate-pulse"></div>
                    <span className="text-sm text-muted-foreground" data-testid="text-username">
                      {authStatus?.username || 'authenticated'}
                    </span>
                  </div>
                </div>

                <form onSubmit={handleDeploy} className="space-y-6">
                  <div>
                    <Label htmlFor="sessionId" className="block text-sm font-medium text-foreground mb-2">
                      Session ID *
                    </Label>
                    <Input
                      type="text"
                      id="sessionId"
                      value={sessionId}
                      onChange={(e) => setSessionId(e.target.value)}
                      className="w-full"
                      placeholder="Enter your WhatsApp session ID"
                      data-testid="input-session-id"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Your unique WhatsApp session identifier for bot authentication
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="branchName" className="block text-sm font-medium text-foreground mb-2">
                      Branch Name (Optional)
                    </Label>
                    <Input
                      type="text"
                      id="branchName"
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      className="w-full"
                      placeholder="Auto-generated if empty"
                      data-testid="input-branch-name"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Custom branch name for your deployment (e.g., "production", "my-bot")
                    </p>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 border border-border">
                    <div className="flex items-start space-x-3">
                      <div className="w-5 h-5 bg-secondary/20 rounded-full flex items-center justify-center mt-0.5">
                        <Info className="w-3 h-3 text-secondary" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">Deployment Process</h4>
                        <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                          <li>• Fork XYLO-MD repository to your account</li>
                          <li>• Create new branch with your configuration</li>
                          <li>• Setup GitHub Actions workflow</li>
                          <li>• Deploy and start your bot automatically</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={deployMutation.isPending}
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-medium py-4 px-6 h-auto shadow-sm"
                    data-testid="button-deploy"
                  >
                    {deployMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent-foreground mr-2"></div>
                        Deploying...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5 mr-2" />
                        Deploy Bot
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Features Panel */}
          <Card className="shadow-lg">
            <CardContent className="p-8">
              <h3 className="text-xl font-semibold mb-6">Platform Features</h3>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <h4 className="font-medium">Secure Authentication</h4>
                    <p className="text-sm text-muted-foreground">
                      GitHub OAuth integration with state validation and secure session management
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Heart className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-medium">Automated Workflows</h4>
                    <p className="text-sm text-muted-foreground">
                      GitHub Actions integration with automatic restart and continuous deployment
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">Lightning Fast</h4>
                    <p className="text-sm text-muted-foreground">
                      Deploy your WhatsApp bot in under 2 minutes with optimized configurations
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h4 className="font-medium">Real-time Monitoring</h4>
                    <p className="text-sm text-muted-foreground">
                      Monitor deployment status with detailed logs and error reporting
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <Card className="mt-16 shadow-lg">
          <CardContent className="p-8">
            <h3 className="text-2xl font-semibold text-center mb-8">How It Works</h3>
            <div className="grid md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-secondary">1</span>
                </div>
                <h4 className="font-semibold mb-2">Connect GitHub</h4>
                <p className="text-sm text-muted-foreground">
                  Authenticate securely with your GitHub account to access repositories
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-accent">2</span>
                </div>
                <h4 className="font-semibold mb-2">Configure Bot</h4>
                <p className="text-sm text-muted-foreground">
                  Provide your session ID and optional branch name for deployment
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">3</span>
                </div>
                <h4 className="font-semibold mb-2">Auto Deploy</h4>
                <p className="text-sm text-muted-foreground">
                  Automated repository forking, configuration, and workflow setup
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-muted-foreground">4</span>
                </div>
                <h4 className="font-semibold mb-2">Bot Running</h4>
                <p className="text-sm text-muted-foreground">
                  Your WhatsApp bot is live with automatic restart and monitoring
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="bg-muted border-t border-border mt-16">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-accent-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">XYLO-MD Deployment Platform</p>
                <p className="text-xs text-muted-foreground">Powered by GitHub Actions</p>
              </div>
            </div>
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Documentation</a>
              <a href="#" className="hover:text-foreground transition-colors">Support</a>
              <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
