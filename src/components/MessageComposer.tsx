import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  Send, 
  Clock, 
  FileText, 
  Users, 
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { extractPhoneNumbersFromFile } from '@/utils/phoneNumberExtractor';

const MessageComposer: React.FC = () => {
  const [message, setMessage] = useState('');
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [extractedNumbers, setExtractedNumbers] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsProcessing(true);

    try {
      const numbers = await extractPhoneNumbersFromFile(selectedFile);
      setExtractedNumbers(numbers);
      
      // Save extracted numbers to parents table
      if (numbers.length > 0) {
        const parentsData = numbers.map(phone => ({
          phone_number: phone,
          name: null,
          student_name: null,
          class_year: null,
          region: null
        }));

        const { error } = await supabase
          .from('parents')
          .upsert(parentsData, { 
            onConflict: 'phone_number',
            ignoreDuplicates: true 
          });

        if (error) {
          console.error('Error saving parents:', error);
        }
      }

      toast({
        title: "File Processed",
        description: `Extracted ${numbers.length} phone numbers from ${selectedFile.name}`,
      });
    } catch (error) {
      console.error('File processing error:', error);
      toast({
        title: "Processing Failed",
        description: "Failed to extract phone numbers from the file. Please check the file format.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendMessage = async (isScheduled: boolean = false) => {
    if (!message.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter a message to send.",
        variant: "destructive"
      });
      return;
    }

    if (extractedNumbers.length === 0) {
      toast({
        title: "No Recipients",
        description: "Please upload a file with phone numbers first.",
        variant: "destructive"
      });
      return;
    }

    if (isScheduled && !scheduledDateTime) {
      toast({
        title: "Schedule Time Required",
        description: "Please select a date and time for scheduling.",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create message record
      const messageData = {
        admin_id: user.id,
        content: message,
        recipient_count: extractedNumbers.length,
        status: isScheduled ? 'scheduled' : 'pending',
        scheduled_at: isScheduled ? new Date(scheduledDateTime).toISOString() : null
      };

      const { data: messageRecord, error: messageError } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (messageError) throw messageError;

      if (!isScheduled) {
        // Send SMS immediately via edge function
        const { data, error } = await supabase.functions.invoke('send-sms', {
          body: {
            messageId: messageRecord.id,
            content: message,
            phoneNumbers: extractedNumbers
          }
        });

        if (error) throw error;

        toast({
          title: "Message Sent",
          description: `SMS sent to ${extractedNumbers.length} recipients`,
        });
      } else {
        toast({
          title: "Message Scheduled",
          description: `SMS scheduled for ${new Date(scheduledDateTime).toLocaleString()}`,
        });
      }

      // Reset form
      setMessage('');
      setScheduledDateTime('');
      setFile(null);
      setExtractedNumbers([]);
      if (document.getElementById('file-upload')) {
        (document.getElementById('file-upload') as HTMLInputElement).value = '';
      }

    } catch (error) {
      console.error('Send error:', error);
      toast({
        title: "Send Failed",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const characterCount = message.length;
  const smsCount = Math.ceil(characterCount / 160);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Send className="w-5 h-5" />
            <span>Compose New Message</span>
          </CardTitle>
          <CardDescription>
            Write your message and upload a contact list to send bulk SMS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Message Input */}
          <div className="space-y-2">
            <Label htmlFor="message">Message Content</Label>
            <Textarea
              id="message"
              placeholder="Enter your message here... (e.g., Reminder: Parent-Teacher meeting tomorrow at 2 PM in the school hall.)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="resize-none transition-smooth focus:shadow-glow"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{characterCount} characters</span>
              <span>{smsCount} SMS {smsCount !== 1 ? 'messages' : 'message'}</span>
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file-upload">Contact List File</Label>
            <div className="flex items-center space-x-4">
              <Input
                id="file-upload"
                type="file"
                accept=".csv,.xlsx,.xls,.doc,.docx,.txt"
                onChange={handleFileUpload}
                className="flex-1"
              />
              <Button variant="outline" disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Supports CSV, Excel, Word, and text files. Phone numbers will be extracted automatically.
            </p>
          </div>

          {/* Extracted Numbers Display */}
          {extractedNumbers.length > 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>
                    <strong>{extractedNumbers.length}</strong> phone numbers extracted and ready to send
                  </span>
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div className="mt-2 text-xs">
                  Preview: {extractedNumbers.slice(0, 3).join(', ')}
                  {extractedNumbers.length > 3 && ` and ${extractedNumbers.length - 3} more...`}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Schedule Option */}
          <div className="space-y-2">
            <Label htmlFor="schedule-datetime">Schedule for Later (Optional)</Label>
            <Input
              id="schedule-datetime"
              type="datetime-local"
              value={scheduledDateTime}
              onChange={(e) => setScheduledDateTime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <Button
              onClick={() => handleSendMessage(false)}
              disabled={isSending || !message.trim() || extractedNumbers.length === 0}
              className="flex-1"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Now
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => handleSendMessage(true)}
              disabled={isSending || !message.trim() || extractedNumbers.length === 0 || !scheduledDateTime}
            >
              <Clock className="w-4 h-4 mr-2" />
              Schedule
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MessageComposer;