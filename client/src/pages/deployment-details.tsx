import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  ExternalLink, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Terminal,
  GitBranch,
  Calendar,
  User,
  Activity,
  Wifi,
  WifiOff,
  Github,
  Zap
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import type { Deployment, DeploymentLog } from '@shared/schema';

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'success':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'failed':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'running':
      return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
    default:
      return <Clock className="w-4 h-4 text-yellow-500" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'success':
      return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700';
    case 'failed':
      return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700';
    case 'running':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700';
    default:
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700';
  }
};

const getLogStatusColor = (status: string) => {
  switch (status) {
    case 'success':
      return 'text-green-600 dark:text-green-400';
    case 'failed':
      return 'text-red-600 dark:text-red-400';
    case 'running':
      return 'text-blue-600 dark:text-blue-400';
    default:
      return 'text-yellow-600 dark:text-yellow-400';
  }
};

export default function DeploymentDetails() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const deploymentId = params.id;
  
  // WebSocket state
  const [liveLogs, setLiveLogs] = useState<DeploymentLog[]>([]);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch deployment details
  const { data: deployment, isLoading: deploymentLoading } = useQuery<Deployment>({
    queryKey: ['/api/deployments', deploymentId],
    enabled: !!deploymentId,
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  // Fetch initial deployment logs (fallback for basic logs)
  const { data: logs, isLoading: logsLoading } = useQuery<DeploymentLog[]>({
    queryKey: ['/api/deployments', deploymentId, 'logs'],
    enabled: !!deploymentId,
    refetchInterval: deployment?.status === 'running' ? 10000 : false, // Slower polling as fallback
  });

  // WebSocket connection for live logs
  useEffect(() => {
    if (!deploymentId || !deployment) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/logs-ws`; // Use specific path to avoid Vite HMR conflicts
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected for deployment:', deploymentId);
        setIsWebSocketConnected(true);
        
        // Subscribe to deployment logs
        ws.send(JSON.stringify({
          type: 'subscribe',
          deploymentId: deploymentId
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'logs' && data.deploymentId === deploymentId) {
            console.log('Received live logs:', data.logs);
            setLiveLogs(data.logs || []);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsWebSocketConnected(false);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsWebSocketConnected(false);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsWebSocketConnected(false);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [deploymentId, deployment]);

  // Combine basic logs with live logs, prioritizing live logs for running deployments
  const displayLogs = deployment?.status === 'running' && liveLogs.length > 0 ? liveLogs : logs;

  if (deploymentLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center space-x-4 mb-8">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <Skeleton className="h-4 flex-1" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-24" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!deployment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-xl">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg ring-4 ring-red-100 dark:ring-red-900/30">
              <XCircle className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-slate-900 dark:text-white">Deployment Not Found</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed max-w-md mx-auto">
              The deployment you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Button 
              onClick={() => setLocation('/deployments')}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Deployments
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Modern Navigation Header */}
      <nav className="backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-50">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent truncate">XYLO-MD</h1>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium hidden sm:block">Deployment Platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/deployments')}
                className="hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                data-testid="button-back-deployments"
              >
                <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Deployments</span>
                <span className="sm:hidden">Back</span>
              </Button>
              {deployment?.workflowUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  data-testid="button-view-workflow"
                  className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                >
                  <a
                    href={deployment.workflowUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center"
                  >
                    <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Workflow</span>
                    <span className="sm:hidden">View</span>
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>
      
      {/* Header Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 dark:from-blue-600/20 dark:via-purple-600/20 dark:to-pink-600/20"></div>
        <div className="relative w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8 lg:py-12">
          <div className="text-center">
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-3 mb-4 sm:mb-6">
              <div className="flex items-center space-x-2 sm:space-x-3">
                {getStatusIcon(deployment.status)}
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight">
                  <span className="bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent break-words">
                    {deployment.branchName || 'Unnamed Deployment'}
                  </span>
                </h1>
              </div>
              <Badge
                variant="outline"
                className={`text-sm sm:text-base lg:text-lg px-3 sm:px-4 py-1 sm:py-2 ${getStatusColor(deployment.status)} flex-shrink-0`}
              >
                {deployment.status}
              </Badge>
            </div>
            <p className="text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-400 max-w-xs sm:max-w-xl lg:max-w-2xl mx-auto leading-relaxed px-2">
              Real-time deployment monitoring with detailed logs and status updates for your XYLO-MD WhatsApp bot.
            </p>
          </div>
        </div>
      </div>
      
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Content - Logs */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6 w-full">
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-xl w-full">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <div className="flex items-center space-x-2">
                    <Terminal className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-sm sm:text-base">Deployment Logs</span>
                    {deployment.status === 'running' && (
                      <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 animate-spin text-blue-500" />
                    )}
                  </div>
                  <div className="flex items-center space-x-2 justify-end sm:justify-start">
                    {deployment.status === 'running' && (
                      <div className="flex items-center space-x-1 text-xs">
                        {isWebSocketConnected ? (
                          <>
                            <Wifi className="w-3 h-3 text-green-500" />
                            <span className="text-green-600">Live</span>
                          </>
                        ) : (
                          <>
                            <WifiOff className="w-3 h-3 text-orange-500" />
                            <span className="text-orange-600">Polling</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {logsLoading ? (
                  <div className="space-y-3 sm:space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-2 sm:space-x-3">
                        <Skeleton className="h-3 w-3 sm:h-4 sm:w-4 rounded-full" />
                        <Skeleton className="h-3 sm:h-4 flex-1" />
                        <Skeleton className="h-3 sm:h-4 w-12 sm:w-16" />
                      </div>
                    ))}
                  </div>
                ) : displayLogs && displayLogs.length > 0 ? (
                  <ScrollArea className="h-64 sm:h-80 lg:h-96">
                    <div className="space-y-3 sm:space-y-4" data-testid="deployment-logs">
                      {displayLogs.map((log, index) => (
                        <div key={log.id} className="flex items-start space-x-2 sm:space-x-3">
                          <div className="flex-shrink-0 mt-0.5 sm:mt-1">
                            {getStatusIcon(log.status)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
                              <p className="text-xs sm:text-sm font-medium capitalize break-words">{log.step}</p>
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                {format(new Date(log.timestamp), 'HH:mm:ss')}
                              </span>
                            </div>
                            <p className={`text-xs sm:text-sm ${getLogStatusColor(log.status)} break-words leading-relaxed`}>
                              {log.message}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-6 sm:py-8">
                    <Terminal className="w-8 h-8 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                    <p className="text-sm sm:text-base text-muted-foreground">No logs available yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Deployment Info */}
          <div className="space-y-4 sm:space-y-6 w-full">
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-xl w-full">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-sm sm:text-base">Deployment Info</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <GitBranch className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium">Branch</p>
                      <p className="text-xs sm:text-sm text-muted-foreground break-words">
                        {deployment.branchName || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <User className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium">GitHub User</p>
                      <p className="text-xs sm:text-sm text-muted-foreground break-words">
                        {deployment.githubUsername}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium">Created</p>
                      <p className="text-xs sm:text-sm text-muted-foreground break-words">
                        {format(new Date(deployment.createdAt), 'PPpp')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Activity className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium">Last Updated</p>
                      <p className="text-xs sm:text-sm text-muted-foreground break-words">
                        {formatDistanceToNow(new Date(deployment.updatedAt))} ago
                      </p>
                    </div>
                  </div>
                </div>

                {deployment.message && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs sm:text-sm font-medium mb-2">Status Message</p>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-line break-words">
                          {deployment.message}
                        </p>
                        
                        {/* Add GitHub workflow enablement button for failed deployments */}
                        {deployment.status === 'failed' && deployment.message.includes('Fork workflows need manual enablement') && (
                          <div className="mt-3 sm:mt-4 space-y-2">
                            <Button
                              asChild
                              className="w-full bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm py-2 sm:py-3"
                              data-testid="button-enable-workflows"
                            >
                              <a
                                href={`https://github.com/${deployment.githubUsername}/${deployment.repositoryName}/actions`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center"
                              >
                                <Github className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                <span className="hidden sm:inline">Enable Workflows on GitHub</span>
                                <span className="sm:hidden">Enable Workflows</span>
                              </a>
                            </Button>
                            <p className="text-xs text-center text-muted-foreground">
                              Click above, then return here and try deploying again
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-xl w-full">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-sm sm:text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-2 sm:space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start text-xs sm:text-sm py-2 sm:py-3"
                  onClick={() => setLocation('/deployments')}
                  data-testid="button-view-all-deployments"
                >
                  <span className="hidden sm:inline">View All Deployments</span>
                  <span className="sm:hidden">All Deployments</span>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-xs sm:text-sm py-2 sm:py-3"
                  onClick={() => setLocation('/')}
                  data-testid="button-new-deployment"
                >
                  <span className="hidden sm:inline">Create New Deployment</span>
                  <span className="sm:hidden">New Deployment</span>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}