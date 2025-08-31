import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ExternalLink, Clock, CheckCircle, XCircle, Play, RefreshCw, Zap, BarChart3 } from 'lucide-react';
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
      return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700';
    case 'failed':
      return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700';
    case 'running':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700';
    default:
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700';
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/')}
                className="hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                data-testid="button-back-home"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Home
              </Button>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Header Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 dark:from-blue-600/20 dark:via-purple-600/20 dark:to-pink-600/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border border-blue-200/50 dark:border-blue-700/50 rounded-full px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 mb-6">
              <BarChart3 className="w-4 h-4" />
              <span>Deployment Dashboard</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
              <span className="bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent">
                Deployment History
              </span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Monitor and manage your XYLO-MD WhatsApp bot deployments with real-time status updates and detailed logs.
            </p>
          </div>
          <div className="flex justify-center">
            <Button
              onClick={() => setLocation('/')}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              data-testid="button-new-deployment"
            >
              <Play className="w-5 h-5 mr-2" />
              Create New Deployment
            </Button>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!deployments || deployments.length === 0 ? (
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-xl">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg ring-4 ring-blue-100 dark:ring-blue-900/30">
                <Play className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-slate-900 dark:text-white">No deployments yet</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed max-w-md mx-auto">
                Start your first deployment to see it appear here. Deploy your WhatsApp bot with just a few clicks.
              </p>
              <Button 
                onClick={() => setLocation('/')} 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Play className="w-5 h-5 mr-2" />
                Create First Deployment
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {deployments.map((deployment) => (
              <Card key={deployment.id} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-200">
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