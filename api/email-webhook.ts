import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

// Vercel Serverless Functions will automatically inject these from the Vercel Dashboard Environment Variables
const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
    process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only accept POST requests from our Supabase Webhook
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed. Only POST allowed.' });
    }

    // Optional: A secure secret token could be added here to prevent malicious direct API hits
    // const authHeader = req.headers['authorization'];
    // if (authHeader !== `Bearer ${process.env.SUPABASE_WEBHOOK_SECRET}`) return res.status(401).send('Unauthorized');

    try {
        const payload = req.body;

        // Supabase Database Webhooks wrap the inserted row inside payload.record
        const newSubscriber = payload.record || payload; // fallback if hit directly for testing

        if (!newSubscriber || !newSubscriber.email || !newSubscriber.html_payload) {
            return res.status(400).json({ error: 'Invalid Malformed Subscription Payload from Supabase' });
        }

        console.log(`[Serverless-Email-Webhook] Preparing to dispatch branded HTML Newsletter to: ${newSubscriber.email}...`);

        // 1. Send the massive beautifully styled HTML email utilizing the Resend Cloud API
        const data = await resend.emails.send({
            from: 'SentimentAI Weekly Insights <onboarding@resend.dev>', // Keep placeholder for testing locally
            to: [newSubscriber.email],
            subject: `Your Automated AI Market Brief: ${newSubscriber.stock_name} 📈`,
            html: newSubscriber.html_payload
        });

        // 2. Report the delivery success straight back into the Supabase database
        if (newSubscriber.id) {
            await supabase
                .from('newsletter_subscriptions')
                .update({ status: 'delivered' })
                .eq('id', newSubscriber.id);
        }

        console.log(`[Serverless-Email-Webhook] Success! Email delivered securely. Resend ID: ${data.data?.id}`);

        // Shutdown the Serverless Function gracefully
        return res.status(200).json({ success: true, resendConfirm: data });

    } catch (error: any) {
        console.error('[Serverless-Email-Webhook] Fatal Error:', error);
        return res.status(500).json({ error: error.message || 'Internal Serverless Error' });
    }
}
