import type { StockData, NewsItem } from './api';

export const generateNewsletterHTML = (
    email: string,
    stockData: StockData,
    newsData: NewsItem[],
    aiVerdict: string,
    verdictClass: string
): string => {
    // Generate trending news rows
    const newsRows = newsData.slice(0, 3).map(news => `
        <tr>
            <td style="padding-bottom: 20px;">
                <a href="${news.url}" style="text-decoration: none; color: #1e293b; font-weight: 600; font-size: 16px; line-height: 1.4; display: block; margin-bottom: 6px;">
                    ${news.title}
                </a>
                <span style="display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; 
                    background-color: ${news.category === 'Positive' ? '#dcfce7' : news.category === 'Negative' ? '#fee2e2' : '#f1f5f9'};
                    color: ${news.category === 'Positive' ? '#16a34a' : news.category === 'Negative' ? '#dc2626' : '#64748b'};">
                    ${news.category}
                </span>
            </td>
        </tr>
    `).join('');

    // Determine brand colors based on the verdict
    const isBullish = verdictClass === 'verdict-bullish';
    const isBearish = verdictClass === 'verdict-bearish';

    let accentColor = '#6366f1'; // Primary brand indigo
    if (isBullish) accentColor = '#16a34a';
    if (isBearish) accentColor = '#dc2626';

    const formatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: stockData.currency || 'INR',
    });

    const isPositiveChange = stockData.change >= 0;
    const changeColor = isPositiveChange ? '#16a34a' : '#dc2626';
    const changeSymbol = isPositiveChange ? '+' : '';

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SentimentAI Newsletter: ${stockData.name}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #eff6ff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #eff6ff; padding: 40px 0;">
            <tr>
                <td align="center">
                    <!-- Main Container -->
                    <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); margin: 0 auto; min-width: 320px; max-width: 600px;">
                        
                        <!-- Header / Logo -->
                        <tr>
                            <td align="center" style="padding: 40px 40px 20px 40px; border-bottom: 2px solid #f1f5f9;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td align="left" width="50%" style="font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">
                                            <span style="color: ${accentColor};">Sentiment</span>AI
                                        </td>
                                        <td align="right" width="50%" style="font-size: 14px; color: #64748b; font-weight: 500;">
                                            Weekly Insights
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Hero Section -->
                        <tr>
                            <td style="padding: 40px;">
                                <h1 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 800; color: #0f172a; line-height: 1.2;">
                                    ${stockData.name} Monthly Newsletter
                                </h1>
                                <p style="margin: 0 0 24px 0; font-size: 16px; color: #475569; line-height: 1.6;">
                                    Hi there,<br><br>
                                    Here is your personalized, AI-driven market intelligence brief regarding <strong>${stockData.name}</strong>, direct from the SentimentAI analysis engine. 
                                    Our models have processed the latest price action, localized momentum, and global sentiment to bring you this exclusive insight.
                                </p>
                                
                                <!-- Verdict Card -->
                                <div style="background-color: ${isBullish ? '#f0fdf4' : isBearish ? '#fef2f2' : '#f8fafc'}; border: 1px solid ${isBullish ? '#bbf7d0' : isBearish ? '#fecaca' : '#e2e8f0'}; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 32px;">
                                    <p style="margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 700;">AI Engine Verdict</p>
                                    <h2 style="margin: 0 0 8px 0; font-size: 36px; font-weight: 900; color: ${accentColor}; letter-spacing: 2px;">
                                        ${aiVerdict}
                                    </h2>
                                    <p style="margin: 0; font-size: 18px; color: #0f172a; font-weight: 600;">
                                        ${formatter.format(stockData.price)} <span style="color: ${changeColor}; font-size: 16px;">(${changeSymbol}${stockData.changePercent.toFixed(2)}%)</span>
                                    </p>
                                </div>

                                <!-- Call to Action -->
                                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 40px;">
                                    <tr>
                                        <td align="center">
                                            <a href="https://localhost:5173" style="display: inline-block; background-color: ${accentColor}; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 6px; text-align: center;">
                                                View Live Dashboard
                                            </a>
                                        </td>
                                    </tr>
                                </table>

                                <!-- Divider -->
                                <hr style="border: 0; border-top: 2px solid #f1f5f9; margin: 0 0 32px 0;">

                                <!-- Trending News Section -->
                                <h3 style="margin: 0 0 24px 0; font-size: 20px; font-weight: 700; color: #0f172a;">Top Market Catalysts</h3>
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    ${newsRows || `<tr><td style="color: #64748b; font-size: 15px;">No critical breaking news impacting this asset currently. Consolidating purely on technicals.</td></tr>`}
                                </table>

                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f8fafc; padding: 32px 40px; border-top: 1px solid #e2e8f0;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td style="padding-bottom: 16px;">
                                            <!-- Upcoming Events Mockup from Screenshot -->
                                            <h4 style="margin: 0 0 16px 0; font-size: 16px; color: #c4a77d; font-weight: 700;">Upcoming Events</h4>
                                            
                                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border-radius: 6px; padding: 16px; border: 1px solid #e2e8f0;">
                                                <tr>
                                                    <td width="33%" align="center" style="border-right: 1px solid #e2e8f0;">
                                                        <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">Q3 EARNINGS</div>
                                                        <div style="font-size: 14px; color: #0f172a; font-weight: 600;">OCT 24</div>
                                                    </td>
                                                    <td width="33%" align="center" style="border-right: 1px solid #e2e8f0;">
                                                        <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">CPI DATA</div>
                                                        <div style="font-size: 14px; color: #0f172a; font-weight: 600;">NOV 10</div>
                                                    </td>
                                                    <td width="33%" align="center">
                                                        <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">FOMC RATE</div>
                                                        <div style="font-size: 14px; color: #0f172a; font-weight: 600;">DEC 13</div>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="center" style="font-size: 12px; color: #94a3b8; line-height: 1.6; padding-top: 16px;">
                                            This email was sent to <strong>${email}</strong>.<br>
                                            You received this email because you are subscribed to SentimentAI Weekly Insights.<br><br>
                                            <a href="#" style="color: #64748b; text-decoration: underline;">Update Preferences</a> | 
                                            <a href="#" style="color: #64748b; text-decoration: underline;">Unsubscribe</a><br><br>
                                            © ${new Date().getFullYear()} SentimentAI. All rights reserved.<br>
                                            123 AI Boulevard, Tech Park, India
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                    </table>
                    <!-- End Main Container -->
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
};
