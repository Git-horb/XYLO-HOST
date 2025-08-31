import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ExternalLink, Clock, CheckCircle, XCircle, Play, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Deployment } from '@shared/schema';

interface DeploymentsResponse {
  deployments: Deployment[];
}

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

export default function Deployments() {
  const [, setLocation] = useLocation();

  // Fetch deployments
  const { data: deployments, isLoading } = useQuery<Deployment[]>({
    queryKey: ['/api/deployments'],
    refetchInterval: 5000, // Refetch every 5 seconds for live updates
  });

  if (isLoading) {
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
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
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
                onClick={() => setLocation('/')}
                className="p-2"
                data-testid="button-back-home"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Deployment History</h1>
                <p className="text-sm text-muted-foreground">
                  Manage and monitor your XYLO-MD deployments
                </p>
              </div>
            </div>
            <Button
              onClick={() => setLocation('/')}
              data-testid="button-new-deployment"
            >
              <Play className="w-4 h-4 mr-2" />
              New Deployment
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {!deployments || deployments.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Play className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No deployments yet</h3>
              <p className="text-muted-foreground mb-6">
                Start your first deployment to see it appear here.
              </p>
              <Button onClick={() => setLocation('/')}>
                Create First Deployment
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {deployments.map((deployment) => (
              <Card key={deployment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        {getStatusIcon(deployment.status)}
                        <h3 className="font-semibold text-lg truncate">
                          {deployment.branchName || 'Unnamed Deployment'}
                        </h3>
                        <Badge
                          variant="outline"
                          className={getStatusColor(deployment.status)}
                        >
                          {deployment.status}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>
                          <span className="font-medium">Repository:</span> {deployment.repositoryName}
                        </p>
                        <p>
                          <span className="font-medium">Created:</span>{' '}
                          {formatDistanceToNow(new Date(deployment.createdAt))} ago
                        </p>
                        {deployment.message && (
                          <p>
                            <span className="font-medium">Status:</span> {deployment.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {deployment.workflowUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          data-testid={`button-workflow-${deployment.id}`}
                        >
                          <a
                            href={deployment.workflowUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Workflow
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setLocation(`/deployments/${deployment.id}`)}
                        data-testid={`button-details-${deployment.id}`}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}