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
  Github
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
      return 'bg-green-100 text-green-800 border-green-200';
    case 'failed':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'running':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  }
};

const getLogStatusColor = (status: string) => {
  switch (status) {
    case 'success':
      return 'text-green-600';
    case 'failed':
      return 'text-red-600';
    case 'running':
      return 'text-blue-600';
    default:
      return 'text-yellow-600';
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
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 py-8">
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="p-12 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Deployment Not Found</h3>
            <p className="text-muted-foreground mb-6">
              The deployment you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Button onClick={() => setLocation('/deployments')}>
              Back to Deployments
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/deployments')}
                className="p-2"
                data-testid="button-back-deployments"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <div className="flex items-center space-x-3 mb-1">
                  {getStatusIcon(deployment.status)}
                  <h1 className="text-2xl font-bold">
                    {deployment.branchName || 'Unnamed Deployment'}
                  </h1>
                  <Badge
                    variant="outline"
                    className={getStatusColor(deployment.status)}
                  >
                    {deployment.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Deployment details and live logs
                </p>
              </div>
            </div>
            
            {deployment.workflowUrl && (
              <Button
                variant="outline"
                asChild
                data-testid="button-view-workflow"
              >
                <a
                  href={deployment.workflowUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Workflow
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content - Logs */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Terminal className="w-5 h-5" />
                    <span>Deployment Logs</span>
                    {deployment.status === 'running' && (
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
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
              <CardContent>
                {logsLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-3">
                        <Skeleton className="h-4 w-4 rounded-full" />
                        <Skeleton className="h-4 flex-1" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))}
                  </div>
                ) : displayLogs && displayLogs.length > 0 ? (
                  <ScrollArea className="h-96">
                    <div className="space-y-4" data-testid="deployment-logs">
                      {displayLogs.map((log, index) => (
                        <div key={log.id} className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            {getStatusIcon(log.status)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium capitalize">{log.step}</p>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(log.timestamp), 'HH:mm:ss')}
                              </span>
                            </div>
                            <p className={`text-sm ${getLogStatusColor(log.status)}`}>
                              {log.message}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8">
                    <Terminal className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No logs available yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Deployment Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Deployment Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <GitBranch className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Branch</p>
                      <p className="text-sm text-muted-foreground">
                        {deployment.branchName || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">GitHub User</p>
                      <p className="text-sm text-muted-foreground">
                        {deployment.githubUsername}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Created</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(deployment.createdAt), 'PPpp')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Last Updated</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(deployment.updatedAt))} ago
                      </p>
                    </div>
                  </div>
                </div>

                {deployment.message && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-2">Status Message</p>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                          {deployment.message}
                        </p>
                        
                        {/* Add GitHub workflow enablement button for failed deployments */}
                        {deployment.status === 'failed' && deployment.message.includes('Fork workflows need manual enablement') && (
                          <div className="mt-4 space-y-2">
                            <Button
                              asChild
                              className="w-full bg-green-600 hover:bg-green-700 text-white"
                              data-testid="button-enable-workflows"
                            >
                              <a
                                href={`https://github.com/${deployment.githubUsername}/${deployment.repositoryName}/actions`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center"
                              >
                                <Github className="w-4 h-4 mr-2" />
                                Enable Workflows on GitHub
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
                )
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setLocation('/deployments')}
                  data-testid="button-view-all-deployments"
                >
                  View All Deployments
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setLocation('/')}
                  data-testid="button-new-deployment"
                >
                  Create New Deployment
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}