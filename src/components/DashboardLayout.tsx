import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  School, 
  LogOut, 
  MessageSquare, 
  Users, 
  BarChart3, 
  Send,
  Clock,
  CheckCircle,
  XCircle,
  User
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { authService } from '@/lib/auth';
import MessageComposer from './MessageComposer';
import ParentsManager from './ParentsManager';
import MessageHistory from './MessageHistory';
import DashboardStats from './DashboardStats';
interface DashboardLayoutProps {
  user: any;
  onLogout: () => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      if (sessionToken) {
        await authService.logout(sessionToken);
      }
      localStorage.removeItem('sessionToken');
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out."
      });
      onLogout();
    } catch (err) {
      toast({
        title: "Error",
        description: "An unexpected error occurred during logout",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="bg-white border-b border-border/40 shadow-elegant">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <School className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">SMS Dashboard</h1>
                <p className="text-sm text-muted-foreground">School Communication System</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                <span>{user?.email}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="transition-smooth hover:bg-destructive hover:text-destructive-foreground"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="compose" className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Compose</span>
            </TabsTrigger>
            <TabsTrigger value="parents" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Parents</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center space-x-2">
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Dashboard Overview</h2>
              <p className="text-muted-foreground">Monitor your SMS campaigns and delivery statistics</p>
            </div>
            <DashboardStats />
          </TabsContent>

          <TabsContent value="compose" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Compose Message</h2>
              <p className="text-muted-foreground">Create and send bulk SMS messages to parents</p>
            </div>
            <MessageComposer />
          </TabsContent>

          <TabsContent value="parents" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Parent Directory</h2>
              <p className="text-muted-foreground">Manage parent contacts and filter by class or region</p>
            </div>
            <ParentsManager />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Message History</h2>
              <p className="text-muted-foreground">View sent messages and delivery logs</p>
            </div>
            <MessageHistory />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default DashboardLayout;