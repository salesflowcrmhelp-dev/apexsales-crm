export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { toEmail, recipientName, role, initialPin, username, inviterName } = req.body || {};

  if (!toEmail || !toEmail.trim()) {
    return res.status(400).json({ success: false, message: 'Recipient email is required' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return res.status(503).json({ success: false, message: 'Email service unconfigured. RESEND_API_KEY environment variable is required.' });
  }
  const roleTitle = role === 'admin' ? 'Super Admin' : role === 'manager' ? 'Sales Manager' : 'Sales Representative';
  const loginUrl = 'https://apexsales-crm.vercel.app/';

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 24px 10px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
        
        <!-- BRAND HEADER -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #2563eb 100%); padding: 36px 28px; text-align: center; color: #ffffff;">
          <div style="display: inline-block; padding: 6px 14px; background: rgba(255, 255, 255, 0.15); border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px; backdrop-filter: blur(4px);">
            ✨ Official Team Invitation
          </div>
          <h1 style="margin: 0; font-size: 26px; font-weight: 850; letter-spacing: -0.5px; color: #ffffff;">
            ApexSales CRM
          </h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #cbd5e1; font-weight: 500;">
            High-Performance Revenue & Sales Pipeline Workspace
          </p>
        </div>

        <!-- CONTENT BODY -->
        <div style="padding: 32px 28px; color: #334155; line-height: 1.6;">
          <h2 style="font-size: 20px; color: #0f172a; margin: 0 0 12px 0; font-weight: 750;">
            Welcome to the Team, ${recipientName || 'Team Member'}! 👋
          </h2>
          <p style="font-size: 14px; color: #475569; margin: 0 0 20px 0;">
            <strong>${inviterName || 'Harsh Goyal (Admin)'}</strong> has set up your official account on <strong>ApexSales CRM</strong> as <strong>${roleTitle}</strong>.
          </p>

          <!-- CREDENTIALS BOX -->
          <div style="background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%); border: 2px solid #cbd5e1; border-radius: 12px; padding: 22px; margin: 24px 0;">
            <div style="font-size: 11px; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 14px;">
              🔐 YOUR LOGIN CREDENTIALS
            </div>
            
            <div style="margin-bottom: 12px;">
              <span style="display: block; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Authorized Login Email:</span>
              <span style="display: block; font-size: 15px; font-weight: 750; color: #0f172a; word-break: break-all; margin-top: 2px;">
                ${toEmail}
              </span>
            </div>

            ${username ? `
            <div style="margin-bottom: 12px;">
              <span style="display: block; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Username:</span>
              <span style="display: block; font-size: 14px; font-weight: 750; color: #0f172a; margin-top: 2px;">
                ${username}
              </span>
            </div>` : ''}

            <div style="margin-bottom: 6px;">
              <span style="display: block; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Your Login Password / PIN:</span>
              <div style="display: inline-block; background-color: #ffffff; border: 1.5px solid #93c5fd; border-radius: 8px; padding: 6px 16px; margin-top: 4px;">
                <span style="font-size: 22px; font-weight: 900; color: #2563eb; letter-spacing: 4px; font-family: monospace;">
                  ${initialPin}
                </span>
              </div>
            </div>
          </div>

          <!-- PRIMARY CTA BUTTON -->
          <div style="text-align: center; margin: 28px 0 20px 0;">
            <a href="${loginUrl}" target="_blank" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 34px; border-radius: 10px; font-weight: 750; font-size: 14.5px; display: inline-block; box-shadow: 0 4px 16px rgba(37, 99, 235, 0.35);">
              🚀 Log In to Your CRM Workspace &rarr;
            </a>
          </div>

          <p style="font-size: 12px; color: #64748b; text-align: center; margin: 0 0 24px 0;">
            Click above to open the CRM and sign in with your credentials.
          </p>

          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 12px 16px; font-size: 12px; color: #1e40af; line-height: 1.5;">
            🔒 <strong>Security Note:</strong> Keep your PIN safe. Only this registered email (${toEmail}) and password can access your assigned pipeline.
          </div>
        </div>

        <!-- FOOTER -->
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 24px; text-align: center; font-size: 11.5px; color: #64748b;">
          <strong>ApexSales CRM</strong> • Cloud Revenue & Pipeline Management<br/>
          This is an automated system email sent to ${toEmail}.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'ApexSales CRM <welcome@salesflowhub.cloud>',
        to: [toEmail.trim()],
        subject: `🎉 Welcome to ApexSales CRM - Your Account & Login Password`,
        html: emailHtml
      })
    });

    const data = await resendRes.json();

    if (resendRes.ok) {
      console.log(`✉️ Resend email successfully delivered to ${toEmail}: ${data.id}`);
      return res.status(200).json({ success: true, messageId: data.id, provider: 'resend' });
    } else {
      console.error('⚠️ Resend error response:', data);
      return res.status(resendRes.status || 500).json({ success: false, message: data.message || 'Resend API error' });
    }
  } catch (err) {
    console.error('⚠️ Resend fetch failed:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
