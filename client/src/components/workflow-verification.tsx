import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, ExternalLink, RefreshCw, Github } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WorkflowStatus {
  hasFork: boolean;
  workflowsEnabled: boolean;
  needsFork: boolean;
  enableUrl?: string;
  message: string;
}

interface WorkflowVerificationProps {
  onVerificationComplete: (verified: boolean) => void;
}

export function WorkflowVerification({ onVerificationComplete }: WorkflowVerificationProps) {
  const [isManuallyVerified, setIsManuallyVerified] = useState(false);
  const { toast } = useToast();

  const { data: workflowStatus, isLoading, refetch } = useQuery<WorkflowStatus>({
    queryKey: ['/api/workflows/verify'],
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });

  // Notify parent component when verification status changes
  useEffect(() => {
    const isVerified = workflowStatus?.workflowsEnabled || workflowStatus?.needsFork || isManuallyVerified;
    onVerificationComplete(!!isVerified);
  }, [workflowStatus, isManuallyVerified, onVerificationComplete]);

  const handleManualVerification = () => {
    setIsManuallyVerified(true);
    toast({
      title: "Verification Confirmed",
      description: "Proceeding with deployment setup.",
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
              <h3 className="font-semibold text-slate-900 dark:text-white">Checking Workflow Status</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Verifying your GitHub repository and workflow configuration...
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
              <h3 className="font-semibold text-slate-900 dark:text-white">Verification Failed</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Unable to check workflow status. Please try again.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If workflows are enabled or fork is needed (will be created), show success
  if (workflowStatus.workflowsEnabled || workflowStatus.needsFork) {
    return (
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Workflow Verification</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {workflowStatus.message}
                </p>
              </div>
            </div>
            <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700">
              Ready
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If workflows are disabled, show enable step
  if (workflowStatus.hasFork && !workflowStatus.workflowsEnabled && !isManuallyVerified) {
    return (
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-xl">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Enable GitHub Workflows</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {workflowStatus.message}
                </p>
              </div>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-slate-900 dark:text-white text-sm">Required Action:</h4>
              <ol className="text-sm text-slate-600 dark:text-slate-400 space-y-1 list-decimal list-inside">
                <li>Click the button below to open your repository's Actions page</li>
                <li>Look for the green button that says "I understand my workflows, go ahead and enable them"</li>
                <li>Click that button to enable workflows</li>
                <li>Return here and click "I've enabled workflows" to continue</li>
              </ol>
            </div>

            <div className="flex space-x-3">
              {workflowStatus.enableUrl && (
                <Button
                  asChild
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  data-testid="button-enable-workflows"
                >
                  <a
                    href={workflowStatus.enableUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center"
                  >
                    <Github className="w-4 h-4 mr-2" />
                    Enable Workflows on GitHub
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </a>
                </Button>
              )}
              
              <Button
                variant="outline"
                onClick={handleManualVerification}
                data-testid="button-manual-verification"
              >
                I've enabled workflows
              </Button>
              
              <Button
                variant="ghost"
                onClick={handleCheckAgain}
                size="sm"
                data-testid="button-check-again"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Check Again
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
                <h3 className="font-semibold text-slate-900 dark:text-white">Workflows Verified</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Great! Your workflows should now be enabled and ready for deployment.
                </p>
              </div>
            </div>
            <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700">
              Verified
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}