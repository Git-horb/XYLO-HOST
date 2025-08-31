import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, Zap } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

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

      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-xl w-full max-w-md">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg ring-4 ring-red-100 dark:ring-red-900/30">
              <AlertCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-3 text-slate-900 dark:text-white">404 - Page Not Found</h1>
            <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
              The page you're looking for doesn't exist. It might have been moved or deleted.
            </p>
            <Button 
              onClick={() => setLocation('/')}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              data-testid="button-go-home"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Go Back Home
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
