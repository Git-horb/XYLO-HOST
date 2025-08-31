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
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8">
          <div className="flex items-center space-x-3 sm:space-x-4 mb-6 sm:mb-8">
            <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg" />
            <div className="space-y-1 sm:space-y-2">
              <Skeleton className="h-5 sm:h-6 w-24 sm:w-32" />
              <Skeleton className="h-3 sm:h-4 w-32 sm:w-48" />
            </div>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="w-full">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                    <div className="space-y-1 sm:space-y-2 min-w-0">
                      <Skeleton className="h-4 sm:h-5 w-24 sm:w-32" />
                      <Skeleton className="h-3 sm:h-4 w-32 sm:w-48" />
                    </div>
                    <Skeleton className="h-5 sm:h-6 w-12 sm:w-16 flex-shrink-0" />
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
                onClick={() => setLocation('/')}
                className="hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                data-testid="button-back-home"
              >
                <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Home
              </Button>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Header Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 dark:from-blue-600/20 dark:via-purple-600/20 dark:to-pink-600/20"></div>
        <div className="relative w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8 lg:py-12">
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border border-blue-200/50 dark:border-blue-700/50 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300 mb-4 sm:mb-6">
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Deployment Dashboard</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-3 sm:mb-4">
              <span className="bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent">
                Deployment History
              </span>
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-400 max-w-xs sm:max-w-xl lg:max-w-2xl mx-auto leading-relaxed px-2">
              Monitor and manage your XYLO-MD WhatsApp bot deployments with real-time status updates and detailed logs.
            </p>
          </div>
          <div className="flex justify-center">
            <Button
              onClick={() => setLocation('/')}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 text-sm sm:text-base py-2 sm:py-3 px-4 sm:px-6"
              data-testid="button-new-deployment"
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Create New Deployment</span>
              <span className="sm:hidden">New Deployment</span>
            </Button>
          </div>
        </div>
      </div>
      
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8 lg:py-12">
        {!deployments || deployments.length === 0 ? (
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-xl w-full">
            <CardContent className="p-6 sm:p-8 lg:p-12 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg ring-4 ring-blue-100 dark:ring-blue-900/30">
                <Play className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-3 text-slate-900 dark:text-white">No deployments yet</h3>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mb-6 sm:mb-8 leading-relaxed max-w-xs sm:max-w-md mx-auto">
                Start your first deployment to see it appear here. Deploy your WhatsApp bot with just a few clicks.
              </p>
              <Button 
                onClick={() => setLocation('/')} 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 text-sm sm:text-base py-2 sm:py-3 px-4 sm:px-6"
              >
                <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Create First Deployment</span>
                <span className="sm:hidden">First Deployment</span>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 sm:space-y-4 w-full">
            {deployments.map((deployment) => (
              <Card key={deployment.id} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-200 w-full">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col space-y-3 sm:space-y-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          {getStatusIcon(deployment.status)}
                          <h3 className="font-semibold text-base sm:text-lg truncate">
                            {deployment.branchName || 'Unnamed Deployment'}
                          </h3>
                        </div>
                        <Badge
                          variant="outline"
                          className={`${getStatusColor(deployment.status)} text-xs sm:text-sm px-2 py-1 flex-shrink-0`}
                        >
                          {deployment.status}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-xs sm:text-sm text-muted-foreground">
                        <p className="break-words">
                          <span className="font-medium">Repository:</span> {deployment.repositoryName}
                        </p>
                        <p>
                          <span className="font-medium">Created:</span>{' '}
                          {formatDistanceToNow(new Date(deployment.createdAt))} ago
                        </p>
                        {deployment.message && (
                          <p className="break-words">
                            <span className="font-medium">Status:</span> {deployment.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                      {deployment.workflowUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          data-testid={`button-workflow-${deployment.id}`}
                          className="text-xs sm:text-sm py-2 sm:py-3"
                        >
                          <a
                            href={deployment.workflowUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center"
                          >
                            <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Workflow</span>
                            <span className="sm:hidden">View Workflow</span>
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setLocation(`/deployments/${deployment.id}`)}
                        data-testid={`button-details-${deployment.id}`}
                        className="text-xs sm:text-sm py-2 sm:py-3"
                      >
                        <span className="hidden sm:inline">View Details</span>
                        <span className="sm:hidden">Details</span>
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