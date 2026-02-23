import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import * as dotenv from 'dotenv';

// Load variables specifically from .env.local
dotenv.config({ path: '.env.local' });

// 1. Initialize our secure backend connections
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const resendApiKey = process.env.RESEND_API_KEY;

if (!supabaseUrl || !supabaseKey || !resendApiKey) {
    console.error("❌ Missing required .env.local variables! Please ensure VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and RESEND_API_KEY are set.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const resend = new Resend(resendApiKey);

console.log("🚀 SentimentAI Email Dispatch Service Started!");
console.log("📡 Listening to Supabase 'newsletter_subscriptions' table for new subscribers...");

// 2. Set up a secure realtime listener! 
// Whenever the React app inserts a new row, this backend script instantly catches it.
supabase
    .channel('custom-all-channel')
    .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'newsletter_subscriptions' },
        async (payload) => {
            const newSubscriber = payload.new;
            console.log(`\n🔔 New Subscription Detected! Preparing to send Insight Brief to: ${newSubscriber.email}...`);

            try {
                // 3. Fire the beautifully formatted HTML payload out via Resend
                const data = await resend.emails.send({
                    from: 'SentimentAI Alerts <onboarding@resend.dev>', // Resend testing domain
                    to: [newSubscriber.email],
                    subject: `Your Automated AI Market Brief: ${newSubscriber.stock_name} 📈`,
                    html: newSubscriber.html_payload
                });

                console.log(`✅ Success! Email delivered to ${newSubscriber.email}. Resend ID: ${data.data?.id}`);

                // 4. Update the Supabase row to mark it as Delivered
                await supabase
                    .from('newsletter_subscriptions')
                    .update({ status: 'delivered' })
                    .eq('id', newSubscriber.id);

            } catch (error) {
                console.error(`❌ Failed to send email to ${newSubscriber.email}:`, error);
            }
        }
    )
    .subscribe();

// Keep the Node process alive
process.stdin.resume();
