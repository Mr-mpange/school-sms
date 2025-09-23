import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  MessageSquare, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Stats {
  totalMessages: number;
  totalParents: number;
  successRate: number;
  scheduledMessages: number;
  totalSent: number;
  totalFailed: number;
}

const DashboardStats: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
    totalMessages: 0,
    totalParents: 0,
    successRate: 0,
    scheduledMessages: 0,
    totalSent: 0,
    totalFailed: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Get total messages
      const { count: totalMessages } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true });

      // Get total parents
      const { count: totalParents } = await supabase
        .from('parents')
        .select('*', { count: 'exact', head: true });

      // Get scheduled messages
      const { count: scheduledMessages } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'scheduled');

      // Get message statistics
      const { data: messageStats } = await supabase
        .from('messages')
        .select('success_count, failed_count, status');

      let totalSent = 0;
      let totalFailed = 0;

      if (messageStats) {
        messageStats.forEach(msg => {
          totalSent += msg.success_count || 0;
          totalFailed += msg.failed_count || 0;
        });
      }

      const successRate = totalSent + totalFailed > 0 
        ? Math.round((totalSent / (totalSent + totalFailed)) * 100) 
        : 0;

      setStats({
        totalMessages: totalMessages || 0,
        totalParents: totalParents || 0,
        successRate,
        scheduledMessages: scheduledMessages || 0,
        totalSent,
        totalFailed
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    description, 
    icon: Icon, 
    trend 
  }: { 
    title: string; 
    value: string | number; 
    description: string; 
    icon: any; 
    trend?: string;
  }) => (
    <Card className="transition-smooth hover:shadow-glow hover:scale-[1.02]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
        {trend && (
          <div className="flex items-center mt-2 text-xs text-primary">
            <TrendingUp className="w-3 h-3 mr-1" />
            {trend}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-muted rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <StatCard
        title="Total Messages"
        value={stats.totalMessages}
        description="Messages sent this month"
        icon={MessageSquare}
        trend="+12% from last month"
      />
      
      <StatCard
        title="Parent Contacts"
        value={stats.totalParents}
        description="Registered parent contacts"
        icon={Users}
        trend="+8% from last month"
      />
      
      <StatCard
        title="Success Rate"
        value={`${stats.successRate}%`}
        description="SMS delivery success rate"
        icon={CheckCircle}
        trend="+2% from last month"
      />
      
      <StatCard
        title="Messages Sent"
        value={stats.totalSent}
        description="Successfully delivered SMS"
        icon={CheckCircle}
      />
      
      <StatCard
        title="Failed Deliveries"
        value={stats.totalFailed}
        description="Failed SMS deliveries"
        icon={XCircle}
      />
      
      <StatCard
        title="Scheduled"
        value={stats.scheduledMessages}
        description="Messages scheduled for later"
        icon={Clock}
      />
    </div>
  );
};

export default DashboardStats;