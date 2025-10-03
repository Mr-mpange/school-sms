import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Send, Clock, Users, Loader2, RefreshCw, Database } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { extractContactsFromFile, ContactRecord } from '@/utils/phoneNumberExtractor';

const MessageComposer: React.FC = () => {
  const [message, setMessage] = useState('');
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [extractedNumbers, setExtractedNumbers] = useState<string[]>([]);
  const [parsedContacts, setParsedContacts] = useState<ContactRecord[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingPhase, setProcessingPhase] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  // Recipient source and DB filters
  const [recipientSource, setRecipientSource] = useState<'file' | 'database'>('file');
  const [segmentType, setSegmentType] = useState<'all' | 'class' | 'region' | 'class_region' | 'recent'>('all');
  const [dbClass, setDbClass] = useState<string>('');
  const [dbRegion, setDbRegion] = useState<string>('');
  const [recentDays, setRecentDays] = useState<number>(7);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);
  const [messagesList, setMessagesList] = useState<Array<{ id: string; created_at: string; content: string }>>([]);
  const [selectedMessageId, setSelectedMessageId] = useState<string>('');
  const [senderId, setSenderId] = useState<string>('');
  const [hasSmsFunction, setHasSmsFunction] = useState<boolean | null>(null);
  const [testNumber, setTestNumber] = useState<string>('');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [failureStatuses, setFailureStatuses] = useState<string[]>(['failed']);

  const toggleFailureStatus = (status: string) => {
    setFailureStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  // Load distinct classes/regions for filters
  React.useEffect(() => {
    if (recipientSource !== 'database') return;
    const fetchDistinct = async () => {
      try {
        // For demo purposes, using localStorage
        const storedParents = localStorage.getItem('sms_parents');
        if (storedParents) {
          const parents = JSON.parse(storedParents);
          const classes = Array.from(new Set(parents.map((p: any) => p.class_year).filter(Boolean)));
          const regions = Array.from(new Set(parents.map((p: any) => p.region).filter(Boolean)));
          setAvailableClasses(classes);
          setAvailableRegions(regions);
        }
      } catch (e) {
        console.error('Failed to fetch distinct filters', e);
      }
    };
    fetchDistinct();
  }, [recipientSource]);

  // Fetch recent messages for resend picker
  React.useEffect(() => {
    const loadMessages = async () => {
      try {
        // For demo purposes, using localStorage
        const storedMessages = localStorage.getItem('sms_messages');
        if (storedMessages) {
          const messages = JSON.parse(storedMessages);
          setMessagesList(messages.slice(0, 20)); // Limit to 20 most recent
        }
      } catch (err) {
        console.error('Failed to load messages list', err);
      }
    };
    loadMessages();
  }, []);

  // Load default sender ID and check send-sms function availability
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('briq_sender_id') || '';
      if (saved) setSenderId(saved);
    } catch {}
    (async () => {
      try {
        const baseUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
        if (!baseUrl) {
          setHasSmsFunction(false);
          return;
        }
        const resp = await fetch(`${baseUrl}/functions/v1/send-sms`, { method: 'OPTIONS' });
        setHasSmsFunction(resp.ok);
      } catch {
        setHasSmsFunction(false);
      }
    })();
  }, []);

  // Persist sender ID locally
  React.useEffect(() => {
    try {
      if (senderId) localStorage.setItem('briq_sender_id', senderId);
      else localStorage.removeItem('briq_sender_id');
    } catch {}
  }, [senderId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsProcessing(true);
    const ft = selectedFile.type.toLowerCase();
    if (ft === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setProcessingPhase('Extracting text from PDF (if scanned, running OCR on a few pages)...');
    } else if (ft.startsWith('image/') || selectedFile.name.match(/\.(png|jpg|jpeg|bmp|webp|heic|heif)$/i)) {
      setProcessingPhase('Running OCR on image...');
    } else if (ft.includes('word') || selectedFile.name.toLowerCase().endsWith('.docx')) {
      setProcessingPhase('Reading DOCX content...');
    } else if (ft.includes('excel') || selectedFile.name.match(/\.(xls|xlsx)$/i)) {
      setProcessingPhase('Parsing Excel sheets...');
    } else if (ft === 'text/csv' || selectedFile.name.toLowerCase().endsWith('.csv')) {
      setProcessingPhase('Parsing CSV rows...');
    } else if (ft === 'text/plain' || selectedFile.name.toLowerCase().endsWith('.txt')) {
      setProcessingPhase('Parsing text file...');
    } else {
      setProcessingPhase('Processing file...');
    }

    try {
      const contacts: ContactRecord[] = await extractContactsFromFile(selectedFile);
      setParsedContacts(contacts);
      const uniqueNumbers = Array.from(new Set(contacts.map(c => c.phone_number)));
      setExtractedNumbers(uniqueNumbers);

      toast({
        title: 'File Processed',
        description: `Extracted ${uniqueNumbers.length} unique phone numbers from ${selectedFile.name}`,
      });
    } catch (error) {
      console.error('File processing error:', error);
      toast({
        title: 'Processing Failed',
        description: 'Failed to extract phone numbers from the file. Please check the file format.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setProcessingPhase('');
    }
  };

  // Load recipients from DB based on selected filters
  const loadRecipientsFromDB = async () => {
    try {
      setIsProcessing(true);
      setProcessingPhase('Loading recipients from database...');
      let query = supabase.from('parents').select('phone_number, created_at, class_year, region');

      if (segmentType === 'class' && dbClass) {
        query = query.eq('class_year', dbClass);
      } else if (segmentType === 'region' && dbRegion) {
        query = query.eq('region', dbRegion);
      } else if (segmentType === 'class_region') {
        if (dbClass) query = query.eq('class_year', dbClass);
        if (dbRegion) query = query.eq('region', dbRegion);
      } else if (segmentType === 'recent') {
        const since = new Date();
        since.setDate(since.getDate() - (recentDays || 7));
        query = query.gte('created_at', since.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      const numbers = Array.from(new Set((data || []).map(r => r.phone_number).filter(Boolean)));
      setExtractedNumbers(numbers);
      setParsedContacts([]); // Clear file-based preview when using DB

      toast({
        title: 'Recipients Loaded',
        description: `Loaded ${numbers.length} recipients from database`,
      });
    } catch (err) {
      console.error('DB load error:', err);
      toast({ title: 'Load Failed', description: 'Failed to load recipients from DB', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
      setProcessingPhase('');
    }
  };

  // Resend to not-delivered recipients of the last message
  const loadFailedRecipientsForLastMessage = async () => {
    try {
      setIsProcessing(true);
      setProcessingPhase('Loading failed recipients from last message...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: lastMsg, error: lastMsgErr } = await supabase
        .from('messages')
        .select('*')
        .eq('admin_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (lastMsgErr) throw lastMsgErr;
      if (!lastMsg) throw new Error('No previous message found');

      let q = supabase
        .from('sms_logs')
        .select('phone_number,status')
        .eq('message_id', lastMsg.id);
      if (failureStatuses.length > 0) {
        // include only selected failure statuses
        q = q.in('status', failureStatuses as any);
      } else {
        q = q.eq('status', 'failed');
      }
      const { data: logs, error: logsErr } = await q;
      if (logsErr) throw logsErr;

      const numbers = Array.from(new Set((logs || []).map(l => l.phone_number)));
      setExtractedNumbers(numbers);
      setParsedContacts([]);

      toast({ title: 'Failed Recipients Loaded', description: `Loaded ${numbers.length} numbers to resend` });
    } catch (err) {
      console.error('Resend load error:', err);
      toast({ title: 'Load Failed', description: 'Could not load failed recipients to resend', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
      setProcessingPhase('');
    }
  };

  const handleSaveContacts = async () => {
    if (parsedContacts.length === 0) {
      toast({
        title: 'No Contacts',
        description: 'Please upload a file first to extract contacts.',
        variant: 'destructive',
      });
      return;
    }
    try {
      const seen = new Set<string>();
      const parentsData = parsedContacts
        .filter(c => {
          if (seen.has(c.phone_number)) return false;
          seen.add(c.phone_number);
          return true;
        })
        .map(c => ({
          phone_number: c.phone_number,
          name: c.name ?? undefined,
          student_name: c.student_name ?? undefined,
          class_year: c.class_year ?? undefined,
          region: c.region ?? undefined,
        }));

      const { error } = await supabase
        .from('parents')
        .upsert(parentsData, { onConflict: 'phone_number' });

      if (error) throw error;

      toast({
        title: 'Contacts Saved',
        description: `Saved ${parentsData.length} parent records.`,
      });
    } catch (error) {
      console.error('Error saving parents:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save contacts to parents.',
        variant: 'destructive',
      });
    }
  };

  const handleSendMessage = async (isScheduled: boolean = false) => {
    if (!message.trim()) {
      toast({ title: 'Message Required', description: 'Please enter a message to send.', variant: 'destructive' });
      return;
    }
    if (extractedNumbers.length === 0) {
      toast({ title: 'No Recipients', description: 'Please upload a file with phone numbers first.', variant: 'destructive' });
      return;
    }
    if (isScheduled && !scheduledDateTime) {
      toast({ title: 'Schedule Time Required', description: 'Please select a date and time for scheduling.', variant: 'destructive' });
      return;
    }

    setIsSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const uniqueToSend = Array.from(new Set(extractedNumbers));

      const messageData = {
        admin_id: user.id,
        content: message,
        recipient_count: uniqueToSend.length,
        status: isScheduled ? 'scheduled' : 'pending',
        scheduled_at: isScheduled ? new Date(scheduledDateTime).toISOString() : null,
      };

      const { data: messageRecord, error: messageError } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (messageError) throw messageError;

      if (!isScheduled) {
        // Normalize to Briq expected format (e.g., 2557... without leading '+')
        const briqRecipients = uniqueToSend.map(n => n.startsWith('+') ? n.substring(1) : n);
        // Call Edge Function (send-sms) with messageId and phoneNumbers
        const { error } = await supabase.functions.invoke('send-sms', {
          body: {
            messageId: messageRecord.id,
            content: message,
            phoneNumbers: briqRecipients,
            sender_id: senderId || undefined,
          },
        });
        if (error) throw error;
        toast({ title: 'Message Sent', description: `SMS sent to ${uniqueToSend.length} recipients` });
      } else {
        toast({ title: 'Message Scheduled', description: `SMS scheduled for ${new Date(scheduledDateTime).toLocaleString()}` });
      }

      setMessage('');
      setScheduledDateTime('');
      setFile(null);
      setExtractedNumbers([]);
      setSenderId('');
      const input = document.getElementById('file-upload') as HTMLInputElement | null;
      if (input) input.value = '';
    } catch (error) {
      console.error('Send error:', error);
      toast({ title: 'Send Failed', description: 'Failed to send message. Please try again.', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  const characterCount = message.length;
  const smsCount = Math.ceil(characterCount / 160);
  const totalSmsUnits = smsCount * extractedNumbers.length;

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

            {/* Sender ID and Dry Run Estimate */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="sender-id">Sender ID (optional)</Label>
                <Input
                  id="sender-id"
                  placeholder="e.g., SCHOOLNAME"
                  value={senderId}
                  onChange={(e) => setSenderId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Alphanumeric sender IDs may require approval with your SMS provider.</p>
              </div>
              <div className="border rounded-md p-3">
                <p className="text-sm font-medium">Dry Run Estimate</p>
                <div className="text-xs mt-1 text-muted-foreground">
                  <div>Recipients: <strong>{extractedNumbers.length}</strong></div>
                  <div>Message length: <strong>{characterCount}</strong> chars</div>
                  <div>Segments per recipient: <strong>{smsCount}</strong></div>
                  <div>Total SMS units: <strong>{totalSmsUnits}</strong></div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Input
                    placeholder="Enter test phone (e.g., +2557...)"
                    value={testNumber}
                    onChange={(e) => setTestNumber(e.target.value)}
                  />
                  <Button
                    variant="secondary"
                    disabled={isTesting || !testNumber.trim()}
                    onClick={async () => {
                      try {
                        setIsTesting(true);
                        const n = testNumber.trim();
                        const normalized = n.startsWith('+') ? n.substring(1) : n;
                        // Create a temporary message record for logging consistency
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) throw new Error('User not authenticated');
                        const tempMessage = {
                          admin_id: user.id,
                          content: message || 'Test from Edu Flash Notify',
                          recipient_count: 1,
                          status: 'pending' as const,
                          scheduled_at: null as string | null,
                        };
                        const { data: tempMsgRecord, error: tempMsgErr } = await supabase
                          .from('messages')
                          .insert(tempMessage)
                          .select()
                          .single();
                        if (tempMsgErr) throw tempMsgErr;
                        const { error } = await supabase.functions.invoke('send-sms', {
                          body: { messageId: tempMsgRecord.id, content: tempMessage.content, phoneNumbers: [normalized], sender_id: senderId || undefined },
                        });
                        if (error) throw error;
                        toast({ title: 'Test Sent', description: `Sent test SMS to ${n}` });
                      } catch (e) {
                        console.error('Test send failed', e);
                        toast({ title: 'Test Failed', description: 'Could not send test SMS', variant: 'destructive' });
                      } finally {
                        setIsTesting(false);
                      }
                    }}
                  >
                    {isTesting ? 'Sending...' : 'Send Test SMS'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {hasSmsFunction === false && (
              <div className="border border-destructive rounded-md p-3 text-destructive text-sm">
                SMS function is not available. Ensure the <code>send-sms</code> edge function is deployed and reachable.
              </div>
            )}
            <div className="flex items-center gap-3">
              <Label className="w-40">Recipient Source</Label>
              <Select value={recipientSource} onValueChange={(v) => setRecipientSource(v as any)}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="file">Upload File</SelectItem>
                  <SelectItem value="database">From Database</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {recipientSource === 'file' ? (
              <>
                <Label htmlFor="file-upload">Contact List File</Label>
                <div className="flex items-center space-x-4">
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".csv,.xlsx,.xls,.txt,.pdf,.docx,image/*"
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
                  <Button type="button" onClick={handleSaveContacts} disabled={parsedContacts.length === 0 || isProcessing}>
                    Save Contacts to Parents
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Supports CSV, Excel, plain text, images (OCR), and PDF files. For scanned PDFs/images, OCR is used and may take longer.
                </p>
              </>
            ) : (
              <div className="space-y-3 border rounded-md p-3">
                <div className="flex items-center gap-3">
                  <Label className="w-40">Segment</Label>
                  <Select value={segmentType} onValueChange={(v) => setSegmentType(v as any)}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Choose segment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Parents</SelectItem>
                      <SelectItem value="class">By Class</SelectItem>
                      <SelectItem value="region">By Region</SelectItem>
                      <SelectItem value="class_region">By Class + Region</SelectItem>
                      <SelectItem value="recent">Recently Added</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {segmentType === 'class' && (
                  <div className="flex items-center gap-3">
                    <Label className="w-40">Class</Label>
                    <Select value={dbClass} onValueChange={setDbClass}>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableClasses.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {segmentType === 'region' && (
                  <div className="flex items-center gap-3">
                    <Label className="w-40">Region</Label>
                    <Select value={dbRegion} onValueChange={setDbRegion}>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRegions.map(r => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {segmentType === 'recent' && (
                  <div className="flex items-center gap-3">
                    <Label className="w-40">Added in last (days)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={recentDays}
                      onChange={(e) => setRecentDays(parseInt(e.target.value || '7', 10))}
                      className="w-[220px]"
                    />
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Button onClick={loadRecipientsFromDB} disabled={isProcessing}>
                    <Database className="w-4 h-4 mr-2" /> Load Recipients
                  </Button>
                  <Button variant="outline" onClick={loadFailedRecipientsForLastMessage} disabled={isProcessing}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Resend to Not Delivered (Last Message)
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Failure statuses to include</Label>
                  <div className="flex flex-wrap gap-4 text-sm">
                    {['failed', 'undelivered', 'not_sent', 'expired', 'rejected'].map((s) => (
                      <label key={s} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={failureStatuses.includes(s)}
                          onChange={() => toggleFailureStatus(s)}
                        />
                        {s}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">These statuses are used when loading failed recipients to resend.</p>
                </div>

                <div className="flex items-center gap-3">
                  <Label className="w-40">Previous Message</Label>
                  <Select value={selectedMessageId} onValueChange={setSelectedMessageId}>
                    <SelectTrigger className="w-[420px]">
                      <SelectValue placeholder="Select a previous message" />
                    </SelectTrigger>
                    <SelectContent>
                      {messagesList.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          {new Date(m.created_at).toLocaleString()} — {m.content.slice(0, 40)}{m.content.length > 40 ? '…' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="secondary" onClick={() => loadFailedRecipientsForMessage(selectedMessageId)} disabled={isProcessing || !selectedMessageId}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Load Not Delivered (Selected)
                  </Button>
                </div>
              </div>
            )}

            {isProcessing && processingPhase && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center">
                <Loader2 className="w-3 h-3 mr-2 animate-spin" /> {processingPhase}
              </p>
            )}
          </div>

          {extractedNumbers.length > 0 && (
            <Alert>
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

          {parsedContacts.length > 0 && (
            <div className="border rounded-md p-4">
              <p className="text-sm font-medium mb-2">Contacts Preview (first 5)</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="py-1 pr-4">Phone</th>
                      <th className="py-1 pr-4">Parent</th>
                      <th className="py-1 pr-4">Student</th>
                      <th className="py-1 pr-4">Class</th>
                      <th className="py-1 pr-4">Region</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedContacts.slice(0, 5).map((c, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="py-1 pr-4 font-mono">{c.phone_number}</td>
                        <td className="py-1 pr-4">{c.name || <span className="text-muted-foreground">—</span>}</td>
                        <td className="py-1 pr-4">{c.student_name || <span className="text-muted-foreground">—</span>}</td>
                        <td className="py-1 pr-4">{c.class_year || <span className="text-muted-foreground">—</span>}</td>
                        <td className="py-1 pr-4">{c.region || <span className="text-muted-foreground">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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