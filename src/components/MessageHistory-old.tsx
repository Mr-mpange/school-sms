import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Calendar,
  Users,
  TrendingUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  content: string;
  recipient_count: number;
  success_count: number;
  failed_count: number;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
}

interface SmsLog {
  id: string;
  phone_number: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
}

const MessageHistory: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [messageLogs, setMessageLogs] = useState<SmsLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      // For demo purposes, using localStorage to simulate message history
      const storedMessages = localStorage.getItem('sms_messages');
      if (storedMessages) {
        setMessages(JSON.parse(storedMessages));
      } else {
        // Initialize with some demo data
        const demoMessages: Message[] = [
          {
            id: '1',
            content: 'Welcome to the new school year! Classes start next Monday.',
            recipient_count: 150,
            success_count: 145,
            failed_count: 5,
            status: 'completed',
            scheduled_at: null,
            sent_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          },
          {
            id: '2',
            content: 'Reminder: Parent-teacher meetings scheduled for this Friday.',
            recipient_count: 150,
            success_count: 148,
            failed_count: 2,
            status: 'completed',
            scheduled_at: null,
            sent_at: new Date(Date.now() - 86400000).toISOString(),
            created_at: new Date(Date.now() - 86400000).toISOString()
          }
        ];
        setMessages(demoMessages);
        localStorage.setItem('sms_messages', JSON.stringify(demoMessages));
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load message history",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessageLogs = async (messageId: string) => {
    setIsLoadingLogs(true);
    try {
      // For demo purposes, using localStorage to simulate SMS logs
      const storedLogs = localStorage.getItem(`sms_logs_${messageId}`);
      if (storedLogs) {
        setMessageLogs(JSON.parse(storedLogs));
      } else {
        // Initialize with some demo logs for the message
        const demoLogs: SmsLog[] = [
          {
            id: '1',
            phone_number: '+1234567890',
            status: 'delivered',
            error_message: null,
            sent_at: new Date().toISOString(),
            delivered_at: new Date().toISOString()
          },
          {
            id: '2',
            phone_number: '+1987654321',
            status: 'sent',
            error_message: null,
            sent_at: new Date().toISOString(),
            delivered_at: null
          },
          {
            id: '3',
            phone_number: '+1555123456',
            status: 'failed',
            error_message: 'Invalid number format',
            sent_at: new Date().toISOString(),
            delivered_at: null
          }
        ];
        setMessageLogs(demoLogs);
        localStorage.setItem(`sms_logs_${messageId}`, JSON.stringify(demoLogs));
      }
    } catch (error) {
      console.error('Error fetching message logs:', error);
      toast({
        title: "Error",
        description: "Failed to load message delivery logs",
        variant: "destructive"
      });
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const viewMessageDetails = (message: Message) => {
    setSelectedMessage(message);
    fetchMessageLogs(message.id);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-500', text: 'Pending', icon: Clock },
      sending: { color: 'bg-blue-500', text: 'Sending', icon: Clock },
      completed: { color: 'bg-green-500', text: 'Completed', icon: CheckCircle },
      failed: { color: 'bg-red-500', text: 'Failed', icon: XCircle },
      scheduled: { color: 'bg-purple-500', text: 'Scheduled', icon: Calendar },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} text-white hover:${config.color}/80`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  const getDeliveryStatusBadge = (status: string) => {
    const statusConfig = {
      sent: { color: 'bg-blue-500', text: 'Sent', icon: CheckCircle },
      delivered: { color: 'bg-green-500', text: 'Delivered', icon: CheckCircle },
      failed: { color: 'bg-red-500', text: 'Failed', icon: XCircle },
      pending: { color: 'bg-yellow-500', text: 'Pending', icon: Clock },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} text-white hover:${config.color}/80`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading message history...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Message History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5" />
            <span>Message History</span>
            <Badge variant="secondary" className="ml-2">
              {messages.length} messages
            </Badge>
          </CardTitle>
          <CardDescription>
            View all sent messages and their delivery status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Message</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Success Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="text-muted-foreground">
                        <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No messages sent yet</p>
                        <p className="text-sm">Start by composing your first message</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  messages.map((message) => (
                    <TableRow key={message.id} className="hover:bg-muted/50">
                      <TableCell className="max-w-[300px]">
                        <div className="truncate" title={message.content}>
                          {message.content}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Created: {formatDateTime(message.created_at)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span>{message.recipient_count}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span>{message.success_count} sent</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <XCircle className="w-4 h-4 text-red-500" />
                            <span>{message.failed_count} failed</span>
                          </div>
                          {message.recipient_count > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {Math.round((message.success_count / message.recipient_count) * 100)}% success rate
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(message.status)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {message.status === 'scheduled' ? (
                            <div>
                              <p>Scheduled:</p>
                              <p className="text-muted-foreground">
                                {formatDateTime(message.scheduled_at)}
                              </p>
                            </div>
                          ) : (
                            <p>{formatDateTime(message.sent_at)}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewMessageDetails(message)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Message Details Modal/Card */}
      {selectedMessage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="w-5 h-5" />
              <span>Message Details</span>
            </CardTitle>
            <CardDescription>
              Delivery logs for message sent on {formatDateTime(selectedMessage.created_at)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Message Content */}
            <div className="bg-muted/30 rounded-lg p-4">
              <h4 className="font-medium mb-2">Message Content:</h4>
              <p className="text-sm">{selectedMessage.content}</p>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-primary rounded-lg p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Total Recipients</p>
                    <p className="text-xl font-bold">{selectedMessage.recipient_count}</p>
                  </div>
                  <Users className="w-6 h-6 opacity-75" />
                </div>
              </div>
              
              <div className="bg-green-500 rounded-lg p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Successful</p>
                    <p className="text-xl font-bold">{selectedMessage.success_count}</p>
                  </div>
                  <CheckCircle className="w-6 h-6 opacity-75" />
                </div>
              </div>
              
              <div className="bg-red-500 rounded-lg p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Failed</p>
                    <p className="text-xl font-bold">{selectedMessage.failed_count}</p>
                  </div>
                  <XCircle className="w-6 h-6 opacity-75" />
                </div>
              </div>
              
              <div className="bg-blue-500 rounded-lg p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Success Rate</p>
                    <p className="text-xl font-bold">
                      {selectedMessage.recipient_count > 0 
                        ? Math.round((selectedMessage.success_count / selectedMessage.recipient_count) * 100)
                        : 0}%
                    </p>
                  </div>
                  <TrendingUp className="w-6 h-6 opacity-75" />
                </div>
              </div>
            </div>

            {/* Delivery Logs */}
            <div>
              <h4 className="font-medium mb-4">Delivery Logs</h4>
              {isLoadingLogs ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading delivery logs...</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Phone Number</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Sent At</TableHead>
                        <TableHead>Delivered At</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {messageLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4">
                            <p className="text-muted-foreground">No delivery logs available</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        messageLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-mono">
                              {log.phone_number}
                            </TableCell>
                            <TableCell>
                              {getDeliveryStatusBadge(log.status)}
                            </TableCell>
                            <TableCell>
                              {formatDateTime(log.sent_at)}
                            </TableCell>
                            <TableCell>
                              {formatDateTime(log.delivered_at)}
                            </TableCell>
                            <TableCell>
                              {log.error_message ? (
                                <span className="text-red-500 text-sm">
                                  {log.error_message}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setSelectedMessage(null)}
              >
                Close Details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MessageHistory;