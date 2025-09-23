import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SMSRequest {
  messageId: string;
  content: string;
  phoneNumbers: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messageId, content, phoneNumbers }: SMSRequest = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Processing SMS request for message ${messageId} to ${phoneNumbers.length} recipients`);

    // Get parent records for the phone numbers
    const { data: parents, error: parentsError } = await supabase
      .from('parents')
      .select('id, phone_number')
      .in('phone_number', phoneNumbers);

    if (parentsError) {
      console.error('Error fetching parents:', parentsError);
      throw parentsError;
    }

    // Create a map of phone numbers to parent IDs
    const phoneToParentId = new Map();
    parents?.forEach(parent => {
      phoneToParentId.set(parent.phone_number, parent.id);
    });

    let successCount = 0;
    let failedCount = 0;
    const logs = [];

    // Process each phone number
    for (const phoneNumber of phoneNumbers) {
      try {
        // Simulate SMS sending with Africa's Talking or similar service
        // In a real implementation, you would integrate with an actual SMS gateway
        
        // Simulate a 95% success rate
        const isSuccess = Math.random() > 0.05;
        
        const log = {
          message_id: messageId,
          parent_id: phoneToParentId.get(phoneNumber),
          phone_number: phoneNumber,
          status: isSuccess ? 'sent' : 'failed',
          gateway_response: isSuccess 
            ? { message_id: `sms_${Date.now()}_${Math.random()}`, status: 'sent' }
            : { error: 'Network timeout', code: 'TIMEOUT' },
          error_message: isSuccess ? null : 'Network timeout - please retry',
          sent_at: isSuccess ? new Date().toISOString() : null,
        };

        logs.push(log);

        if (isSuccess) {
          successCount++;
        } else {
          failedCount++;
        }

        console.log(`SMS to ${phoneNumber}: ${isSuccess ? 'SUCCESS' : 'FAILED'}`);
        
        // Add small delay to simulate real SMS sending
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Error sending SMS to ${phoneNumber}:`, error);
        failedCount++;
        
        logs.push({
          message_id: messageId,
          parent_id: phoneToParentId.get(phoneNumber),
          phone_number: phoneNumber,
          status: 'failed',
          gateway_response: { error: error.message },
          error_message: error.message,
          sent_at: null,
        });
      }
    }

    // Insert SMS logs
    const { error: logsError } = await supabase
      .from('sms_logs')
      .insert(logs);

    if (logsError) {
      console.error('Error inserting SMS logs:', logsError);
    }

    // Update message record with results
    const { error: updateError } = await supabase
      .from('messages')
      .update({
        success_count: successCount,
        failed_count: failedCount,
        status: 'completed',
        sent_at: new Date().toISOString()
      })
      .eq('id', messageId);

    if (updateError) {
      console.error('Error updating message:', updateError);
      throw updateError;
    }

    console.log(`SMS batch completed: ${successCount} sent, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        messageId,
        successCount,
        failedCount,
        totalSent: phoneNumbers.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('SMS function error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});