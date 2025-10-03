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
import { useToast } from '@/hooks/use-toast';
import apiService from '@/lib/api';

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
  const { toast } = useToast();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getStats();

      if (response.success) {
        setStats(response.stats);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch dashboard statistics",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch dashboard statistics",
        variant: "destructive",
      });

      // For demo purposes, set some sample data if API fails
      setStats({
        totalMessages: 1250,
        totalParents: 340,
        successRate: 94,
        scheduledMessages: 12,
        totalSent: 1180,
        totalFailed: 70
      });
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