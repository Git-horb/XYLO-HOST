import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, ExternalLink, RefreshCw, Server, Settings, Github } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WorkflowStatus {
  hasFork: boolean;
  workflowsEnabled: boolean;
  needsFork: boolean;
  enableUrl?: string;
  message: string;
  githubUsername?: string;
  isFirstDeployment?: boolean;
}

interface WorkflowVerificationProps {
  onVerificationComplete: (verified: boolean) => void;
  onSetupRequired: (setupNeeded: boolean) => void;
}

export function WorkflowVerification({ onVerificationComplete, onSetupRequired }: WorkflowVerificationProps) {
  const [isManuallyVerified, setIsManuallyVerified] = useState(false);
  const [hasVerifiedManually, setHasVerifiedManually] = useState(false);
  const { toast } = useToast();

  const { data: workflowStatus, isLoading, refetch } = useQuery<WorkflowStatus>({
    queryKey: ['/api/workflows/verify'],
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });

  // Notify parent component when verification status changes
  useEffect(() => {
    const isVerified = workflowStatus?.workflowsEnabled || isManuallyVerified;
    const needsSetup = workflowStatus?.needsFork || !workflowStatus?.hasFork;
    onVerificationComplete(!!isVerified);
    onSetupRequired(!!needsSetup);
  }, [workflowStatus, isManuallyVerified, onVerificationComplete, onSetupRequired]);

  const handleManualVerification = () => {
    setIsManuallyVerified(true);
    toast({
      title: "Server Verification Complete",
      description: "XYLO servers are ready for deployment.",
    });
  };

  const handleCheckAgain = () => {
    setIsManuallyVerified(false);
    refetch();
  };

  if (isLoading) {
    return (
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-xl">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Checking Server Status</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Verifying XYLO server availability and configuration...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!workflowStatus) {
    return (
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-xl">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <XCircle className="w-5 h-5 text-red-500" />
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Server Check Failed</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Unable to connect to XYLO servers. Please try again.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If servers are ready, show success with optional verification button
  if (workflowStatus.workflowsEnabled) {
    const showVerificationButton = workflowStatus.isFirstDeployment && !hasVerifiedManually;
    
    return (
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-xl">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">XYLO Servers Ready</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    All systems operational. Ready for deployment.
                  </p>
                </div>
              </div>
              <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700">
                Online
              </Badge>
            </div>
            
            {showVerificationButton && workflowStatus.githubUsername && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-white text-sm">First-Time Setup Verification</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Please verify that your XYLO server setup is working correctly by checking the deployment status.
                    </p>
                  </div>
                  <div className="flex space-x-3">
                    <Button
                      asChild
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                      data-testid="button-verify-deployment"
                    >
                      <a
                        href={`https://github.com/${workflowStatus.githubUsername}/XYLO-MD/actions`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center"
                      >
                        <Github className="w-4 h-4 mr-2" />
                        Verify Deployment Status
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setHasVerifiedManually(true);
                        toast({
                          title: "Verification Complete",
                          description: "Future deployments will skip manual verification.",
                        });
                      }}
                      data-testid="button-skip-verification"
                    >
                      Skip Verification
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    This verification is only required for your first deployment. Future deployments will be automatic.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // If setup is needed, don't show verification - let parent handle setup flow
  if (workflowStatus.needsFork) {
    return null; // Parent will show setup button instead
  }

  // If servers need setup, show verification step
  if (workflowStatus.hasFork && !workflowStatus.workflowsEnabled && !isManuallyVerified) {
    return (
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-xl">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Activate XYLO Servers</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Server activation required for your bot instance.
                </p>
              </div>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-slate-900 dark:text-white text-sm">Activation Steps:</h4>
              <ol className="text-sm text-slate-600 dark:text-slate-400 space-y-1 list-decimal list-inside">
                <li>Click the server activation button below</li>
                <li>Authorize XYLO to activate deployment servers</li>
                <li>Return here and confirm activation is complete</li>
                <li>Your bot will be ready for deployment</li>
              </ol>
            </div>

            <div className="flex space-x-3">
              {workflowStatus.enableUrl && (
                <Button
                  asChild
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  data-testid="button-enable-servers"
                >
                  <a
                    href={workflowStatus.enableUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center"
                  >
                    <Server className="w-4 h-4 mr-2" />
                    Activate XYLO Servers
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </a>
                </Button>
              )}
              
              <Button
                variant="outline"
                onClick={handleManualVerification}
                data-testid="button-manual-verification"
              >
                Servers Activated
              </Button>
              
              <Button
                variant="ghost"
                onClick={handleCheckAgain}
                size="sm"
                data-testid="button-check-again"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Check Status
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If manually verified, show confirmation
  if (isManuallyVerified) {
    return (
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Servers Activated</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Perfect! XYLO servers are now active and ready for deployment.
                </p>
              </div>
            </div>
            <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700">
              Active
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}