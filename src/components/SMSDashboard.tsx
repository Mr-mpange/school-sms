import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/enhanced-button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, Send, MessageSquare, Users, CheckCircle, XCircle } from "lucide-react";
import { extractPhoneNumbersFromFile } from "@/utils/phoneNumberExtractor";

interface Message {
  id: string;
  content: string;
  sentAt: Date;
  totalNumbers: number;
  successCount: number;
  failureCount: number;
  status: 'sending' | 'completed' | 'failed';
}

const SMSDashboard = () => {
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [extractedNumbers, setExtractedNumbers] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sentMessages, setSentMessages] = useState<Message[]>([]);
  const { toast } = useToast();


  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    const supportedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!supportedTypes.includes(selectedFile.type)) {
      toast({
        title: "Unsupported File Type",
        description: "Please upload CSV, Excel, Word, or text files only.",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);

    try {
      const numbers = await extractPhoneNumbersFromFile(selectedFile);
      setExtractedNumbers(numbers);
      
      toast({
        title: "File Processed Successfully",
        description: `Extracted ${numbers.length} phone numbers`,
      });
    } catch (error) {
      toast({
        title: "Processing Error",
        description: "Failed to extract phone numbers from file",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const sendBulkSMS = async () => {
    if (!message.trim() || extractedNumbers.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please enter a message and upload a file with phone numbers",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    // Simulate SMS sending (in real app, this would call Supabase Edge Function)
    const newMessage: Message = {
      id: Date.now().toString(),
      content: message,
      sentAt: new Date(),
      totalNumbers: extractedNumbers.length,
      successCount: 0,
      failureCount: 0,
      status: 'sending'
    };
    
    setSentMessages(prev => [newMessage, ...prev]);
    
    // Simulate progressive sending
    setTimeout(() => {
      const successRate = 0.85; // 85% success rate simulation
      const successCount = Math.floor(extractedNumbers.length * successRate);
      const failureCount = extractedNumbers.length - successCount;
      
      setSentMessages(prev => prev.map(msg => 
        msg.id === newMessage.id 
          ? { ...msg, successCount, failureCount, status: 'completed' as const }
          : msg
      ));
      
      toast({
        title: "SMS Campaign Completed",
        description: `Sent to ${successCount}/${extractedNumbers.length} recipients`,
      });
      
      // Reset form
      setMessage("");
      setFile(null);
      setExtractedNumbers([]);
    }, 3000);
    
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            School SMS Manager
          </h1>
          <p className="text-muted-foreground text-lg">
            Send bulk SMS messages to parents efficiently and securely
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sentMessages.length}</div>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recipients Reached</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sentMessages.reduce((acc, msg) => acc + msg.successCount, 0)}
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {sentMessages.length > 0 
                  ? Math.round((sentMessages.reduce((acc, msg) => acc + msg.successCount, 0) / 
                      sentMessages.reduce((acc, msg) => acc + msg.totalNumbers, 0)) * 100)
                  : 0}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Message Composition */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Compose Message
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="message">Message Content</Label>
              <Textarea
                id="message"
                placeholder="Enter your message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[120px]"
              />
              <p className="text-sm text-muted-foreground">
                {160 - message.length} characters remaining
              </p>
            </div>

            <div className="space-y-4">
              <Label htmlFor="file">Upload Parent Contact List</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Upload CSV, Excel, or Word document
                  </p>
                  <p className="text-xs text-muted-foreground">
                    The system will automatically extract phone numbers
                  </p>
                  <Input
                    id="file"
                    type="file"
                    accept=".csv,.xlsx,.xls,.doc,.docx,.txt"
                    onChange={handleFileUpload}
                    className="max-w-xs mx-auto"
                  />
                </div>
              </div>
              
              {file && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">{file.name}</span>
                  {extractedNumbers.length > 0 && (
                    <Badge variant="secondary">
                      {extractedNumbers.length} numbers found
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <Button
              onClick={sendBulkSMS}
              disabled={isProcessing || !message.trim() || extractedNumbers.length === 0}
              variant="gradient"
              size="lg"
              className="w-full"
            >
              {isProcessing ? "Processing..." : `Send to ${extractedNumbers.length} Recipients`}
            </Button>
          </CardContent>
        </Card>

        {/* Message History */}
        {sentMessages.length > 0 && (
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Message History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sentMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <p className="font-medium truncate max-w-md">
                        {msg.content}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {msg.sentAt.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-success">
                          <CheckCircle className="h-4 w-4" />
                          <span className="font-medium">{msg.successCount}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Delivered</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-destructive">
                          <XCircle className="h-4 w-4" />
                          <span className="font-medium">{msg.failureCount}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Failed</p>
                      </div>
                      <Badge variant={msg.status === 'completed' ? 'default' : 'secondary'}>
                        {msg.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SMSDashboard;