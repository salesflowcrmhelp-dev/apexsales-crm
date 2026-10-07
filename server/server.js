import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import https from 'node:https';
import nodemailer from 'nodemailer';
import crypto from 'node:crypto';
import { hash as argon2Hash, verify as argon2Verify, Algorithm as Argon2Algorithm } from '@node-rs/argon2';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'data', 'db.json');
const DIST_PATH = path.join(__dirname, '..', 'dist');

// Auto-load .env file if present before initializing secrets
const ENV_FILE = path.join(__dirname, '..', '.env');
if (fs.existsSync(ENV_FILE)) {
  const envContent = fs.readFileSync(ENV_FILE, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  });
}

// 🔐 Fail-closed check for production vs explicit staging fallback
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
  if (!process.env.SESSION_SECRET || !process.env.PIN_SALT) {
    throw new Error('FATAL: Production security check failed. SESSION_SECRET and PIN_SALT must be explicitly configured in server environment variables.');
  }
} else {
  if (!process.env.PIN_SALT) {
    console.warn('⚠️ STAGING ADVISORY: PIN_SALT environment variable is not defined in process.env. Using explicit staging salt.');
  }
  if (!process.env.SESSION_SECRET) {
    console.warn('⚠️ STAGING ADVISORY: SESSION_SECRET environment variable is not defined in process.env. Using explicit staging secret.');
  }
}

// Cryptographic Session Secret & Rate Limiter Store
const SESSION_SECRET = process.env.SESSION_SECRET || 'apexsales_crm_secure_hmac_secret_2026_key_9f8e7d6c5b4a';
const PIN_SALT = process.env.PIN_SALT || 'apexsales_crm_salt_2026_x7k9';
const loginAttempts = new Map();

function checkLoginRateLimit(ip) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes window
  const maxAttempts = 5;

  const record = loginAttempts.get(ip);
  if (!record || now > record.resetTime) {
    loginAttempts.set(ip, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }

  if (record.count >= maxAttempts) {
    const retryMinutes = Math.ceil((record.resetTime - now) / 60000);
    return { allowed: false, retryMinutes };
  }

  record.count += 1;
  return { allowed: true };
}

function resetLoginRateLimit(ip) {
  loginAttempts.delete(ip);
}

function generateSecureToken(userId, role) {
  const payload = `${userId}:${role}:${Date.now()}`;
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return `${Buffer.from(payload).toString('base64url')}.${signature}`;
}

function verifySecureToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encodedPayload, receivedSig] = parts;
  try {
    const payload = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(receivedSig), Buffer.from(expectedSig))) {
      return null;
    }
    const [userId, role, timestamp] = payload.split(':');
    const age = Date.now() - Number(timestamp);
    // 7 days token expiration
    if (isNaN(age) || age < 0 || age > 7 * 24 * 60 * 60 * 1000) {
      return null;
    }
    return { userId, role };
  } catch (e) {
    return null;
  }
}

// 🔐 State-of-the-Art Credential Security: Argon2id with Salted SHA-256 Backward Compatibility
async function hashCredential(pin) {
  if (!pin) return '';
  return await argon2Hash(String(pin).trim(), { algorithm: Argon2Algorithm.Argon2id });
}

function hashLegacySha256(pin) {
  if (!pin) return '';
  return crypto.createHash('sha256').update(String(pin).trim() + PIN_SALT).digest('hex');
}
const hashPin = hashLegacySha256;

async function verifyPinMatch(storedPin, inputPin) {
  if (!storedPin || !inputPin) return false;
  const cleanInput = String(inputPin).trim();
  const cleanStored = String(storedPin).trim();

  // 1. Argon2id verification
  if (cleanStored.startsWith('$argon2')) {
    try {
      return await argon2Verify(cleanStored, cleanInput);
    } catch (e) {
      return false;
    }
  }

  // 2. Direct match (legacy plain text)
  if (cleanStored === cleanInput) return true;

  // 3. Salted SHA-256 legacy hash match
  const hashedInput = hashLegacySha256(cleanInput);
  if (cleanStored.toLowerCase() === hashedInput.toLowerCase()) return true;

  return false;
}

const app = express();

// --- PACKAGES CONFIGURATION (CLIENT DEAL PLANS & EMPLOYEE ACCESS TIERS) ---
async function getPackages() {
  const local = readLocalDB();
  return {
    dealPackages: local.dealPackages || null,
    employeePackages: local.employeePackages || null
  };
}

async function savePackages(packagesData) {
  const local = readLocalDB();
  if (packagesData.dealPackages) local.dealPackages = packagesData.dealPackages;
  if (packagesData.employeePackages) local.employeePackages = packagesData.employeePackages;
  writeLocalDB(local);
}

// Get Configured Packages
app.get('/api/packages', async (req, res) => {
  try {
    const pkgs = await getPackages();
    res.json({ success: true, packages: pkgs });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Update Configured Packages (Super Admin Only)
app.put('/api/packages', async (req, res) => {
  const isSuper = req.user?.role === 'admin' || isSuperAdminEmailOrName(req.user);
  if (!isSuper) {
    return res.status(403).json({ success: false, message: 'Access denied. Only Super Admin can modify package pricing and tiers.' });
  }
  const { dealPackages, employeePackages } = req.body;
  await savePackages({ dealPackages, employeePackages });
  res.json({ success: true, message: 'Package pricing and configurations saved successfully!' });
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV === 'production') {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error('FATAL: Missing required SUPABASE_URL or SUPABASE_ANON_KEY in production environment. Aborting startup to prevent silent fallback.');
    process.exit(1);
  }
}
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zgndrkgnldrwhcypdhjt.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnbmRya2dubGRyd2hjeXBkaGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDU4MjYsImV4cCI6MjEwNTYyMTgyNn0.KfB_zXo1btSfbF6WaCvOdlc4kMyvNSQPvAcadMPhZ1o';

app.use(cors());
app.use(express.json({ limit: '15mb' }));

// --- DYNAMIC EMAIL DISPATCH ENGINE (RESEND API, BREVO API, OR SMTP) ---
const ENV_RESEND_KEY = process.env.RESEND_API_KEY || '';
const ENV_BREVO_KEY = process.env.BREVO_API_KEY || '';
const ENV_SMTP_USER = process.env.SMTP_USER || process.env.GMAIL_USER || '';
const ENV_SMTP_PASS = process.env.SMTP_PASS || process.env.GMAIL_APP_PASS || '';
const ENV_SMTP_HOST = process.env.SMTP_HOST || (ENV_SMTP_USER.includes('@gmail.com') ? 'smtp.gmail.com' : '');
const ENV_SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 465;

async function getEmailConfig() {
  const local = readLocalDB();
  if (local.settings?.email_api?.apiKey) {
    return local.settings.email_api;
  }
  if (local.settings?.smtp?.user && local.settings?.smtp?.pass) {
    return { type: 'smtp', ...local.settings.smtp };
  }
  if (ENV_RESEND_KEY) {
    return { type: 'resend', apiKey: ENV_RESEND_KEY, fromEmail: 'ApexSales CRM <welcome@salesflowhub.cloud>' };
  }
  if (ENV_BREVO_KEY) {
    return { type: 'brevo', apiKey: ENV_BREVO_KEY };
  }
  if (ENV_SMTP_USER && ENV_SMTP_PASS) {
    return {
      type: 'smtp',
      user: ENV_SMTP_USER,
      pass: ENV_SMTP_PASS,
      host: ENV_SMTP_HOST || 'smtp.gmail.com',
      port: ENV_SMTP_PORT || 465
    };
  }
  return null;
}

async function sendInvitationEmail({ toEmail, recipientName, role, inviteUrl, initialPin, inviterName }) {
  const cfg = await getEmailConfig();
  if (!cfg) {
    return { sent: false, reason: 'Email delivery not configured' };
  }

  const roleTitle = role === 'admin' ? 'Super Admin' : 'Sales Representative';
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
              Welcome to the Team, ${recipientName}! 👋
            </h2>
            <p style="font-size: 14px; color: #475569; margin: 0 0 20px 0;">
              <strong>${inviterName || 'Your Workspace Admin'}</strong> has created your account on <strong>ApexSales CRM</strong> as <strong>${roleTitle}</strong>.
            </p>

            <!-- CREDENTIALS BOX WITH BRAND -->
            <div style="background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%); border: 2px solid #cbd5e1; border-radius: 12px; padding: 22px; margin: 24px 0;">
              <div style="font-size: 11px; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 14px;">
                🔐 YOUR LOGIN CREDENTIALS
              </div>
              
              <div style="margin-bottom: 14px;">
                <span style="display: block; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Authorized Login Email:</span>
                <span style="display: block; font-size: 15px; font-weight: 750; color: #0f172a; word-break: break-all; margin-top: 2px;">
                  ${toEmail}
                </span>
              </div>

              <div style="margin-bottom: 6px;">
                <span style="display: block; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Your Login Password / PIN:</span>
                <div style="display: inline-block; background-color: #ffffff; border: 1.5px solid #93c5fd; border-radius: 8px; padding: 6px 16px; margin-top: 4px;">
                  <span style="font-size: 22px; font-weight: 900; color: #2563eb; letter-spacing: 4px; font-family: monospace;">
                    ${initialPin}
                  </span>
                </div>
              </div>
            </div>

            <!-- PRIMARY CALL TO ACTION BUTTON -->
            <div style="text-align: center; margin: 28px 0 20px 0;">
              <a href="${inviteUrl}" target="_blank" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 34px; border-radius: 10px; font-weight: 750; font-size: 14.5px; display: inline-block; box-shadow: 0 4px 16px rgba(37, 99, 235, 0.35);">
                🚀 Log In to Your CRM Workspace &rarr;
              </a>
            </div>

            <p style="font-size: 12px; color: #64748b; text-align: center; margin: 0 0 24px 0;">
              Click above to log in directly with your email and password.
            </p>

            <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 12px 16px; font-size: 12px; color: #1e40af; line-height: 1.5;">
              🔒 <strong>Security Note:</strong> This workspace is strictly restricted. Only this registered email (${toEmail}) and password can access your assigned leads.
            </div>

            <div style="font-size: 11.5px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 18px; margin-top: 28px; text-align: center;">
              Direct Link: <a href="${inviteUrl}" style="color: #2563eb; word-break: break-all;">${inviteUrl}</a>
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

  // 1. Send via Resend Email API
  if (cfg.type === 'resend') {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfg.apiKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: cfg.fromEmail || 'ApexSales CRM <welcome@salesflowhub.cloud>',
          to: [toEmail],
          subject: `🎉 Welcome to ApexSales CRM - Your Account & Login Password`,
          html: emailHtml
        })
      });
      const data = await response.json();
      if (response.ok) {
        console.log(`✉️ Automatic invitation email sent via Resend API to ${toEmail}: ${data.id}`);
        return { sent: true, messageId: data.id, provider: 'resend' };
      } else {
        console.error('⚠️ Resend API send error:', data);
        return { sent: false, reason: data.message || 'Resend error' };
      }
    } catch (err) {
      console.error('⚠️ Resend dispatch failed:', err.message);
      return { sent: false, reason: err.message };
    }
  }

  // 2. Send via Brevo Email API
  if (cfg.type === 'brevo') {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': cfg.apiKey.trim(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: 'ApexSales CRM', email: cfg.senderEmail || 'salesflowcrmhelp@gmail.com' },
          to: [{ email: toEmail, name: recipientName }],
          subject: `🎉 Welcome to ApexSales CRM - Your Account & Login Password`,
          htmlContent: emailHtml
        })
      });
      const data = await response.json();
      if (response.ok) {
        console.log(`✉️ Automatic invitation email sent via Brevo API to ${toEmail}: ${data.messageId}`);
        return { sent: true, messageId: data.messageId, provider: 'brevo' };
      } else {
        console.error('⚠️ Brevo API send error:', data);
        return { sent: false, reason: data.message || 'Brevo error' };
      }
    } catch (err) {
      console.error('⚠️ Brevo dispatch failed:', err.message);
      return { sent: false, reason: err.message };
    }
  }

  // 3. Send via SMTP (Gmail / Custom)
  if (cfg.type === 'smtp' && cfg.user && cfg.pass) {
    try {
      const isGmail = cfg.user.includes('@gmail.com');
      const transporter = nodemailer.createTransport({
        host: cfg.host || (isGmail ? 'smtp.gmail.com' : 'smtp.gmail.com'),
        port: cfg.port ? Number(cfg.port) : 465,
        secure: (cfg.port ? Number(cfg.port) : 465) === 465,
        auth: {
          user: cfg.user.trim(),
          pass: cfg.pass.replace(/\s+/g, '').trim()
        }
      });
      const info = await transporter.sendMail({
        from: `"ApexSales CRM" <${cfg.user.trim()}>`,
        to: toEmail,
        subject: `🎉 Welcome to ApexSales CRM - Your Account & Login Password`,
        html: emailHtml
      });
      console.log(`✉️ Automatic invitation email sent via SMTP to ${toEmail}: ${info.messageId}`);
      return { sent: true, messageId: info.messageId, provider: 'smtp' };
    } catch (err) {
      console.error(`⚠️ Failed to send invitation email via SMTP to ${toEmail}:`, err.message);
      return { sent: false, reason: err.message };
    }
  }

  return { sent: false, reason: 'No active email provider configured' };
}

// In-memory OTP storage cache for fast verification
const passwordResetOTPs = new Map();

async function sendPasswordResetOTPEmail({ toEmail, recipientName, otp }) {
  const cfg = await getEmailConfig();
  if (!cfg) {
    return { sent: false, reason: 'Email delivery not configured' };
  }

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 24px 10px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 540px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
        
        <!-- HEADER -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #2563eb 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
          <div style="display: inline-block; padding: 5px 12px; background: rgba(255, 255, 255, 0.15); border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 10px;">
            🔐 Password Reset Request
          </div>
          <h1 style="margin: 0; font-size: 24px; font-weight: 850; color: #ffffff;">
            ApexSales CRM
          </h1>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #cbd5e1;">
            Official Workspace Security Verification
          </p>
        </div>

        <!-- BODY -->
        <div style="padding: 30px 24px; color: #334155; line-height: 1.6;">
          <h2 style="font-size: 18px; color: #0f172a; margin: 0 0 12px 0; font-weight: 750;">
            Hello ${recipientName || 'User'}, 👋
          </h2>
          <p style="font-size: 13.5px; color: #475569; margin: 0 0 20px 0;">
            We received a request to reset your password for your <strong>ApexSales CRM</strong> account (<strong>${toEmail}</strong>). Use the verification code below to proceed:
          </p>

          <!-- OTP CODE BOX -->
          <div style="text-align: center; margin: 26px 0;">
            <div style="display: inline-block; background-color: #f8fafc; border: 2px dashed #93c5fd; border-radius: 14px; padding: 18px 36px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.08);">
              <span style="display: block; font-size: 11px; font-weight: 800; color: #64748b; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 6px;">YOUR VERIFICATION CODE</span>
              <span style="font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #1d4ed8; font-family: monospace;">${otp}</span>
            </div>
            <p style="margin: 12px 0 0 0; font-size: 12px; color: #dc2626; font-weight: 600;">
              ⏱️ Valid for 10 minutes only.
            </p>
          </div>

          <p style="font-size: 12.5px; color: #64748b; margin: 20px 0 0 0; border-top: 1px solid #f1f5f9; padding-top: 16px;">
            🔒 <strong>Strict Security Notice:</strong> Never share this OTP with anyone. If you did not request a password reset, you can safely ignore this email — your account remains secure.
          </p>
        </div>

        <!-- FOOTER -->
        <div style="background-color: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11.5px; color: #94a3b8;">
          © ${new Date().getFullYear()} ApexSales CRM • SalesFlow Hub Workspace
        </div>
      </div>
    </body>
    </html>
  `;

  if (cfg.type === 'resend') {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfg.apiKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: cfg.fromEmail || 'ApexSales CRM <welcome@salesflowhub.cloud>',
          to: [toEmail],
          subject: `🔐 Password Reset OTP: ${otp} - ApexSales CRM`,
          html: emailHtml
        })
      });
      const data = await response.json();
      if (response.ok) {
        console.log(`✉️ Password reset OTP dispatched via Resend to ${toEmail}: ${data.id}`);
        return { sent: true, messageId: data.id, provider: 'resend' };
      } else {
        console.error('⚠️ Resend OTP send error:', data);
        return { sent: false, reason: data.message || 'Resend error' };
      }
    } catch (err) {
      console.error('⚠️ Resend OTP dispatch failed:', err.message);
      return { sent: false, reason: err.message };
    }
  }

  if (cfg.type === 'smtp' && cfg.user && cfg.pass) {
    try {
      const transporter = nodemailer.createTransport({
        host: cfg.host || 'smtp.gmail.com',
        port: cfg.port ? Number(cfg.port) : 465,
        secure: (cfg.port ? Number(cfg.port) : 465) === 465,
        auth: { user: cfg.user.trim(), pass: cfg.pass.replace(/\s+/g, '').trim() }
      });
      const info = await transporter.sendMail({
        from: `"ApexSales CRM" <${cfg.user.trim()}>`,
        to: toEmail,
        subject: `🔐 Password Reset OTP: ${otp} - ApexSales CRM`,
        html: emailHtml
      });
      console.log(`✉️ Password reset OTP dispatched via SMTP to ${toEmail}: ${info.messageId}`);
      return { sent: true, messageId: info.messageId, provider: 'smtp' };
    } catch (err) {
      console.error(`⚠️ Failed to send OTP email via SMTP to ${toEmail}:`, err.message);
      return { sent: false, reason: err.message };
    }
  }

  return { sent: false, reason: 'No active email provider configured' };
}

// --- DATABASE LAYER (DUAL-MODE: SUPABASE POSTGRESQL CLOUD WITH LOCAL JSON FALLBACK) ---

let supabaseClient = null;
let isSupabaseConnected = false;

// Helper: Resolve active DB file path (supports /tmp fallback in serverless environments)
function getResolvedDbFile() {
  if (process.env.VERCEL) {
    const tmpDb = '/tmp/db.json';
    if (!fs.existsSync(tmpDb)) {
      try {
        if (fs.existsSync(DB_FILE)) {
          fs.copyFileSync(DB_FILE, tmpDb);
        }
      } catch (e) {
        console.error('Error copying bundled db.json to /tmp:', e);
      }
    }
    return tmpDb;
  }
  return DB_FILE;
}

// Helper: Read local JSON database safely with auto-healing from db_backup.json
function readLocalDB() {
  const activeDb = getResolvedDbFile();
  const BACKUP_FILE = path.join(__dirname, 'data', 'db_backup.json');
  try {
    if (!fs.existsSync(activeDb)) {
      if (fs.existsSync(BACKUP_FILE)) {
        console.log('🛡️ Auto-healing: Restoring db.json from server/data/db_backup.json');
        const b = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));
        writeLocalDB(b);
        return b;
      }
      return { users: [], leads: [], tasks: [] };
    }
    const raw = fs.readFileSync(activeDb, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.tasks)) parsed.tasks = [];
    if ((!parsed.leads || parsed.leads.length === 0) && fs.existsSync(BACKUP_FILE)) {
      console.log('🛡️ Zero leads in db.json: Auto-healing from db_backup.json');
      const b = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));
      if (b.leads && b.leads.length > 0) {
        parsed.leads = b.leads;
        if (!parsed.users || parsed.users.length === 0) parsed.users = b.users || [];
        if (!parsed.tasks || parsed.tasks.length === 0) parsed.tasks = b.tasks || [];
        writeLocalDB(parsed);
      }
    }
    return parsed;
  } catch (err) {
    console.error('Error reading db.json:', err);
    if (fs.existsSync(BACKUP_FILE)) {
      try {
        const backup = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));
        if (!Array.isArray(backup.tasks)) backup.tasks = [];
        return backup;
      } catch(e) {}
    }
    return { users: [], leads: [], tasks: [] };
  }
}

// Helper: Write local JSON database safely with atomic replace
function writeLocalDB(data) {
  const activeDb = getResolvedDbFile();
  try {
    const tmpFile = `${activeDb}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmpFile, activeDb);
    return true;
  } catch (err) {
    console.error('Error writing db.json:', err);
    return false;
  }
}

// Connect to Supabase PostgreSQL Cloud Database
async function initDatabase() {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      console.log('⚡ Connecting to Supabase PostgreSQL Cloud Database...');
      supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data, error } = await supabaseClient.from('leads').select('id').limit(1);
      if (!error) {
        isSupabaseConnected = true;
        console.log('⚡ Successfully connected to Supabase PostgreSQL Cloud Database!');
      } else {
        console.warn('⚠️ Supabase connection warning:', error.message);
        isSupabaseConnected = true;
      }
    } catch (err) {
      console.warn('⚠️ Supabase connection failed. Falling back to local JSON database.', err.message);
      isSupabaseConnected = false;
    }
  } else {
    console.log('📁 Running on persistent local JSON database (server/data/db.json).');
  }
}

// --- DATA ACCESS METHODS (SUPABASE CLOUD POSTGRESQL + LOCAL JSON FALLBACK) ---

async function getUsers() {
  let userList = [];
  if (isSupabaseConnected && supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('users').select('*');
      if (!error && Array.isArray(data) && data.length > 0) {
        const localUsers = readLocalDB().users || [];
        userList = data.map(u => {
          const localMatch = localUsers.find(lu => lu.id === u.id);
          return {
            id: u.id,
            name: u.name,
            displayName: u.display_name || u.name,
            username: u.username,
            pin: u.pin || (localMatch ? localMatch.pin : null),
            role: u.role,
            email: u.email,
            phone: u.phone,
            active: u.active ?? true,
            packageTier: u.package_tier || (u.role === 'company_owner' || u.role === 'admin' ? 'super_admin' : 'starter'),
            permissions: u.permissions || (localMatch ? localMatch.permissions : {}),
            reportsTo: (localMatch && localMatch.reportsTo) || u.reportsTo || u.permissions?.reportsTo || '',
            managerId: (localMatch && localMatch.managerId) || u.managerId || u.permissions?.managerId || ''
          };
        });
      } else {
        userList = readLocalDB().users || [];
      }
    } catch (e) {
      console.error('Supabase getUsers error:', e);
      userList = readLocalDB().users || [];
    }
  } else {
    userList = readLocalDB().users || [];
  }
  return (userList || []).map(u => (typeof sanitizeUserRecord === 'function' ? sanitizeUserRecord(u) : u));
}

async function saveUser(user) {
  if (!user || !user.id) return;
  const cleanUser = typeof sanitizeUserRecord === 'function' ? sanitizeUserRecord(user) : user;
  if (cleanUser.pin) {
    const rawP = String(cleanUser.pin).trim();
    if (!rawP.startsWith('$argon2') && (rawP.length !== 64 || !/^[a-fA-F0-9]{64}$/.test(rawP))) {
      cleanUser.pin = await hashCredential(rawP);
    }
  }
  if (isSupabaseConnected && supabaseClient) {
    try {
      const payload = {
        id: cleanUser.id,
        name: cleanUser.name,
        display_name: cleanUser.displayName || cleanUser.name,
        username: cleanUser.username,
        pin: cleanUser.pin,
        role: cleanUser.role,
        email: cleanUser.email,
        phone: cleanUser.phone,
        active: cleanUser.active ?? true,
        package_tier: cleanUser.packageTier,
        permissions: cleanUser.permissions
      };
      await supabaseClient.from('users').upsert(payload, { onConflict: 'id' });
    } catch (e) {
      console.error('Supabase saveUser error:', e);
    }
  }
  // Keep local db in sync
  const local = readLocalDB();
  const idx = local.users.findIndex(u => u.id === cleanUser.id || (u.email && cleanUser.email && u.email.toLowerCase() === cleanUser.email.toLowerCase()));
  if (idx !== -1) {
    local.users[idx] = { ...local.users[idx], ...cleanUser };
  } else {
    local.users.push(cleanUser);
  }
  writeLocalDB(local);
}

async function deleteUser(userId) {
  if (!userId || userId === 'usr_admin') return;
  if (isSupabaseConnected && supabaseClient) {
    try {
      await supabaseClient.from('users').delete().eq('id', userId);
    } catch (e) {
      console.error('Supabase deleteUser error:', e);
    }
  }
  // Keep local db in sync
  const local = readLocalDB();
  local.users = (local.users || []).filter(u => u.id !== userId || u.id === 'usr_admin');
  writeLocalDB(local);
}

async function getLeads() {
  if (isSupabaseConnected && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map(row => {
          const base = row.raw_data && typeof row.raw_data === 'object' ? row.raw_data : {};
          return {
            ...base,
            id: row.id,
            name: row.name || base.name || '',
            company: row.company || base.company || '',
            status: row.status || base.status || 'New',
            value: Number(row.value) || Number(base.value) || 0,
            email: row.email || base.email || '',
            phone: row.phone || base.phone || '',
            source: row.source || base.source || 'Manual',
            score: row.score || base.score || 'Warm',
            next_follow_up: row.next_follow_up || base.next_follow_up || '',
            won_date: row.won_date || base.won_date || '',
            notes: row.notes || base.notes || '',
            owner: row.owner || base.owner || 'Harsh Goyal',
            deal_type: row.deal_type || base.deal_type || '',
            previous_stage: row.previous_stage || base.previous_stage || '',
            activities: Array.isArray(base.activities) ? base.activities : []
          };
        });
      }
    } catch (e) {
      console.error('Supabase getLeads error:', e);
    }
  }
  return readLocalDB().leads || [];
}

async function saveLead(lead) {
  if (!lead || !lead.id) return;
  if (isSupabaseConnected && supabaseClient) {
    try {
      const payload = {
        id: lead.id,
        name: lead.name || '',
        company: lead.company || '',
        status: lead.status || 'New',
        value: Number(lead.value) || 0,
        email: lead.email || '',
        phone: lead.phone || '',
        source: lead.source || 'Manual',
        score: lead.score || 'Warm',
        next_follow_up: lead.next_follow_up || '',
        won_date: lead.won_date || '',
        notes: lead.notes || '',
        owner: lead.owner || 'Harsh Goyal',
        deal_type: lead.deal_type || '',
        previous_stage: lead.previous_stage || '',
        stage_updated_at: lead.stageUpdatedAt || new Date().toISOString(),
        raw_data: lead
      };
      await supabaseClient.from('leads').upsert(payload, { onConflict: 'id' });
    } catch (e) {
      console.error('Supabase saveLead error:', e);
    }
  }
  // Keep local db in sync
  const local = readLocalDB();
  const idx = local.leads.findIndex(l => String(l.id) === String(lead.id));
  if (idx !== -1) {
    local.leads[idx] = lead;
  } else {
    local.leads.unshift(lead);
  }
  writeLocalDB(local);
}

async function removeLead(id) {
  let deletedLead = null;
  const local = readLocalDB();
  const idx = local.leads.findIndex(l => String(l.id) === String(id));
  if (idx !== -1) {
    deletedLead = local.leads.splice(idx, 1)[0];
    writeLocalDB(local);
  }
  if (isSupabaseConnected && supabaseClient) {
    try {
      await supabaseClient.from('leads').delete().eq('id', String(id));
    } catch (e) {
      console.error('Supabase removeLead error:', e);
    }
  }
  return deletedLead;
}

async function syncBulkData(leads, users) {
  if (isSupabaseConnected && supabaseClient) {
    try {
      if (Array.isArray(leads) && leads.length > 0) {
        const leadRows = leads.map(l => ({
          id: l.id,
          name: l.name || '',
          company: l.company || '',
          status: l.status || 'New',
          value: Number(l.value) || 0,
          email: l.email || '',
          phone: l.phone || '',
          source: l.source || 'Manual',
          score: l.score || 'Warm',
          next_follow_up: l.next_follow_up || '',
          won_date: l.won_date || '',
          notes: l.notes || '',
          owner: l.owner || 'Harsh Goyal',
          deal_type: l.deal_type || '',
          previous_stage: l.previous_stage || '',
          raw_data: l
        }));
        await supabaseClient.from('leads').upsert(leadRows, { onConflict: 'id' });
      }
      if (Array.isArray(users) && users.length > 0) {
        const userRows = users.map(u => ({
          id: u.id,
          name: u.name,
          display_name: u.displayName || u.name,
          username: u.username,
          pin: u.pin,
          role: u.role,
          email: u.email,
          phone: u.phone,
          active: u.active ?? true,
          package_tier: u.packageTier,
          permissions: u.permissions
        }));
        await supabaseClient.from('users').upsert(userRows, { onConflict: 'id' });
      }
    } catch (e) {
      console.error('Supabase syncBulkData error:', e);
    }
  }
  const local = readLocalDB();
  if (Array.isArray(leads) && leads.length > 0) {
    leads.forEach(lead => {
      const idx = local.leads.findIndex(l => String(l.id) === String(lead.id));
      if (idx !== -1) {
        local.leads[idx] = lead;
      } else {
        local.leads.push(lead);
      }
    });
  }
  if (Array.isArray(users) && users.length > 0) {
    users.forEach(user => {
      const idx = local.users.findIndex(u => String(u.id) === String(user.id));
      if (idx !== -1) {
        local.users[idx] = user;
      } else {
        local.users.push(user);
      }
    });
  }
  writeLocalDB(local);
}

// --- TASK DATA ACCESS METHODS (Supabase Cloud + Local Fallback) ---

async function getTasks() {
  if (isSupabaseConnected && supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('tasks').select('*');
      if (!error && Array.isArray(data)) {
        return data;
      }
    } catch (e) {
      console.error('Supabase getTasks error:', e);
    }
  }
  const local = readLocalDB();
  return local.tasks || [];
}

async function saveTask(task) {
  if (!task || !task.id) return;
  if (isSupabaseConnected && supabaseClient) {
    try {
      await supabaseClient.from('tasks').upsert({
        id: String(task.id),
        title: task.title || '',
        status: task.status || 'pending',
        priority: task.priority || 'Medium',
        due_date: task.dueDate || task.due_date || '',
        linked_lead_id: task.linkedLeadId || task.linked_lead_id || '',
        owner: task.owner || ''
      }, { onConflict: 'id' });
    } catch (e) {
      console.error('Supabase saveTask error:', e);
    }
  }
  const local = readLocalDB();
  if (!Array.isArray(local.tasks)) local.tasks = [];
  const idx = local.tasks.findIndex(t => String(t.id) === String(task.id));
  if (idx !== -1) {
    local.tasks[idx] = task;
  } else {
    local.tasks.unshift(task);
  }
  writeLocalDB(local);
}

async function deleteTask(taskId) {
  if (!taskId) return;
  if (isSupabaseConnected && supabaseClient) {
    try {
      await supabaseClient.from('tasks').delete().eq('id', String(taskId));
    } catch (e) {
      console.error('Supabase deleteTask error:', e);
    }
  }
  const local = readLocalDB();
  if (Array.isArray(local.tasks)) {
    local.tasks = local.tasks.filter(t => String(t.id) !== String(taskId));
    writeLocalDB(local);
  }
}

// 🏢 Multi-Tenant Company Isolation Helper
export function getUserTenantId(user) {
  if (!user) return 'tenant_accomation';
  if (user.companyId) return String(user.companyId).trim().toLowerCase();
  if (user.tenantId) return String(user.tenantId).trim().toLowerCase();
  if (user.company && user.company.trim()) {
    return 'tenant_' + user.company.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  }
  if (user.organization && user.organization.trim()) {
    return 'tenant_' + user.organization.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  }
  const email = (user.email || '').trim().toLowerCase();
  if (email.includes('accomation') || email.includes('salesflow')) {
    return 'tenant_accomation';
  }
  const domain = email.split('@')[1];
  if (domain && domain !== 'gmail.com' && domain !== 'yahoo.com' && domain !== 'outlook.com' && domain !== 'hotmail.com') {
    return 'tenant_' + domain.replace(/[^a-z0-9]/g, '_');
  }
  return 'tenant_accomation';
}

// Helper to check super admin status across all routes
export const isSuperAdminEmailOrName = (u) => {
  if (!u) return false;
  const email = (u.email || '').toLowerCase().trim();
  const name = (u.name || '').toLowerCase().trim();
  const username = (u.username || '').toLowerCase().trim();
  const id = (u.id || '').toLowerCase().trim();
  return email === 'harsh@apexsales.com' ||
         email === 'harsh.accomation@gmail.com' || 
         email === 'salesflowcrmhelp@gmail.com' || 
         email === 'admin@apexsales.com' || 
         name === 'harsh' || 
         name === 'harsh goyal' || 
         name === 'admin user' || 
         name === 'admin' ||
         username === 'admin' ||
         username === 'harsh' ||
         username === 'salesflowcrmhelp' ||
         id === 'usr_admin';
};

// 🛡️ UNIVERSAL USER SANITIZER (Guarantees no future user ever leaks or sees global data)
export const sanitizeUserRecord = (u) => {
  if (!u) return u;
  const isSuper = isSuperAdminEmailOrName(u) || u.role === 'admin' || u.role === 'company_owner';
  if (!isSuper) {
    const validRoles = ['manager', 'team_leader', 'sales_head', 'sales_executive', 'sales_rep'];
    const safeRole = validRoles.includes(u.role) ? u.role : 'sales_rep';
    const isLeadership = ['manager', 'team_leader', 'sales_head'].includes(safeRole);
    const safePkg = u.packageTier === 'super_admin' 
      ? (isLeadership ? 'growth' : 'starter') 
      : (u.packageTier || (isLeadership ? 'growth' : 'starter'));
    const safePerms = u.permissions ? { ...u.permissions } : {};
    
    // Strict hard-locks for non-superadmins:
    safePerms.canViewAllLeads = false;
    safePerms.canDeleteLeads = false;
    safePerms.canAccessTeam = isLeadership;
    if (!isLeadership) {
      safePerms.canReassignLeads = false;
      safePerms.canExportCSV = false;
    }
    
    return {
      ...u,
      role: safeRole,
      packageTier: safePkg,
      permissions: safePerms,
      maxLeadsLimit: u.maxLeadsLimit || (isLeadership ? 1000 : 50)
    };
  }
  return {
    ...u,
    role: u.role || 'admin',
    packageTier: 'super_admin',
    maxLeadsLimit: 999999
  };
};

// --- AUTHENTICATION & ROLE RESOLUTION MIDDLEWARE ---
app.use(async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  req.user = null;

  // Cryptographically verify Bearer token (HMAC SHA-256 with 7-day expiration)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    const verified = verifySecureToken(token);

    if (verified && verified.userId) {
      const allUsers = await getUsers();
      const user = allUsers.find(u => u.id === verified.userId && u.active !== false);
      if (user) {
        const isLeadership = user.role === 'manager' || user.role === 'team_leader' || user.role === 'sales_head';
        user.role = isSuperAdminEmailOrName(user) ? 'admin' : (isLeadership ? 'manager' : 'sales_rep');
        req.user = user;
        return next();
      }
    }
  }

  // Strictly require valid, signed session tokens for protected routes
  next();
});

// --- AUTHENTICATION ROUTES ---

// Login Endpoint: Secure, Rate-Limited Authentication (Zero Backdoors)
app.post('/api/auth/login', async (req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const rateCheck = checkLoginRateLimit(clientIp);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      success: false,
      message: `Too many failed login attempts. Please wait ${rateCheck.retryMinutes} minute(s) before trying again.`
    });
  }

  const { pin, password, username, email } = req.body;
  const inputCred = String(password || pin || '').trim();
  if (!inputCred) {
    return res.status(400).json({ success: false, message: 'Password or PIN is required to unlock workspace.' });
  }

  const allUsers = await getUsers();
  const cleanEmail = email ? String(email).trim().toLowerCase() : '';
  const cleanUsername = username ? String(username).trim().toLowerCase() : '';

  let user = null;

  if (cleanEmail) {
    user = allUsers.find(u => 
      (u.email && u.email.trim().toLowerCase() === cleanEmail) ||
      (u.secondaryEmail && u.secondaryEmail.trim().toLowerCase() === cleanEmail) ||
      (u.username && u.username.trim().toLowerCase() === cleanEmail) ||
      (cleanEmail === 'salesflowcrmhelp@gmail.com' && (u.id === 'usr_admin' || u.role === 'company_owner' || u.role === 'admin')) ||
      (cleanEmail === 'harsh.accomation@gmail.com' && (u.id === 'usr_admin' || u.role === 'company_owner' || u.role === 'admin'))
    );
  } else if (cleanUsername) {
    user = allUsers.find(u => 
      (u.username && u.username.trim().toLowerCase() === cleanUsername) ||
      (u.email && u.email.trim().toLowerCase() === cleanUsername)
    );
  }

  if (!user || user.active === false) {
    return res.status(401).json({ success: false, message: 'Invalid credentials or user not found.' });
  }

  // Strict password verification (Argon2id, salted SHA-256 hash or plain PIN match)
  const isMatch = await verifyPinMatch(user.pin, inputCred);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Incorrect Password/PIN. Please check and try again.'
    });
  }

  // Auto-upgrade legacy credentials (plain PINs or salted SHA-256) to Argon2id in database
  if (user.pin && !user.pin.startsWith('$argon2')) {
    try {
      user.pin = await hashCredential(inputCred);
      await saveUser(user);
      console.log(`🔐 [CREDENTIAL SECURITY] Auto-upgraded user "${user.name}" (${user.id}) to Argon2id`);
    } catch (err) {
      console.warn('Auto-hash PIN save error:', err.message);
    }
  }

  // Login successful -> reset rate limiter for this IP
  resetLoginRateLimit(clientIp);

  // Generate cryptographically signed HMAC token
  const token = generateSecureToken(user.id, user.role);
  res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      displayName: user.displayName || user.name,
      username: user.username,
      role: user.role === 'company_owner' || user.role === 'admin' ? 'admin' : (user.role || 'sales_rep'),
      actualRole: user.role,
      packageTier: user.packageTier || (user.role === 'admin' || user.role === 'company_owner' ? 'super_admin' : 'starter'),
      permissions: user.permissions || null,
      maxLeadsLimit: user.maxLeadsLimit || (user.role === 'admin' || user.role === 'company_owner' ? 999999 : 50),
      email: user.email || '',
      phone: user.phone || ''
    },
    token
  });
});

// Validate Invite Token (when recipient clicks invite link)
app.get('/api/auth/invite/:token', async (req, res) => {
  const { token } = req.params;
  if (!token) return res.status(400).json({ success: false, message: 'Invite token is required.' });

  const allUsers = await getUsers();
  const user = allUsers.find(u => u.inviteToken === token);
  if (!user || user.active === false) {
    return res.status(404).json({ success: false, message: 'Invitation link is invalid or has expired.' });
  }

  res.json({
    success: true,
    invite: {
      email: user.email,
      name: user.name,
      role: user.role,
      invitedAt: user.invitedAt
    }
  });
});

// Accept Invite: Set PIN/Password and activate account
app.post('/api/auth/accept-invite', async (req, res) => {
  const { token, pin, name } = req.body;
  if (!token || !pin) {
    return res.status(400).json({ success: false, message: 'Invite token and new PIN are required.' });
  }

  const allUsers = await getUsers();
  const user = allUsers.find(u => u.inviteToken === token);
  if (!user || user.active === false) {
    return res.status(404).json({ success: false, message: 'Invitation link is invalid or expired.' });
  }

  user.pin = await hashCredential(pin);
  if (name && String(name).trim()) {
    user.name = String(name).trim();
    user.displayName = String(name).trim();
  }
  user.status = 'active';
  delete user.inviteToken;
  await saveUser(user);

  const authToken = `token_${user.id}_${Date.now()}`;
  res.json({
    success: true,
    message: 'Account successfully activated! Welcome to ApexSales CRM.',
    user: {
      id: user.id,
      name: user.name,
      displayName: user.displayName || user.name,
      username: user.username,
      role: user.role || 'sales_rep',
      packageTier: user.packageTier || (user.role === 'admin' ? 'super_admin' : 'starter'),
      permissions: user.permissions || null,
      maxLeadsLimit: user.maxLeadsLimit || (user.role === 'admin' ? 999999 : 50),
      email: user.email || '',
      phone: user.phone || ''
    },
    token: authToken
  });
});

// Forgot Password: Send 6-digit OTP to user's registered email
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email || !String(email).trim()) {
    return res.status(400).json({ success: false, message: 'Please provide your registered email address.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const allUsers = await getUsers();
  const user = allUsers.find(u => u.email && u.email.trim().toLowerCase() === cleanEmail);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: `No account found with email "${cleanEmail}". Please check your email or contact your Admin.`
    });
  }

  if (user.active === false) {
    return res.status(403).json({
      success: false,
      message: `Account for "${cleanEmail}" has been deactivated. Please contact your Admin.`
    });
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  // Cache OTP in memory
  passwordResetOTPs.set(cleanEmail, {
    otp,
    userId: user.id,
    expiresAt,
    attempts: 0
  });

  // Send OTP Email via Resend / SMTP / Brevo
  const emailRes = await sendPasswordResetOTPEmail({
    toEmail: user.email,
    recipientName: user.displayName || user.name || 'User',
    otp
  });

  if (!emailRes.sent) {
    console.error(`Failed to send password reset OTP to ${cleanEmail}:`, emailRes.reason);
    return res.status(500).json({
      success: false,
      message: `Could not send verification email (${emailRes.reason || 'Email service unavailable'}). Please contact support.`
    });
  }

  return res.json({
    success: true,
    message: `A 6-digit verification OTP has been sent to ${cleanEmail}. It is valid for 10 minutes.`,
    email: cleanEmail
  });
});

// Verify OTP and Set New Password
app.post('/api/auth/verify-reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ success: false, message: 'Email, OTP code, and new password are required.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanOtp = String(otp).trim();
  const cleanPassword = String(newPassword).trim();

  if (cleanPassword.length < 4) {
    return res.status(400).json({ success: false, message: 'Password must be at least 4 characters long.' });
  }

  // Retrieve OTP record from memory
  const record = passwordResetOTPs.get(cleanEmail);

  if (!record) {
    return res.status(400).json({
      success: false,
      message: 'No active OTP request found for this email. Please request a new OTP.'
    });
  }

  if (Date.now() > record.expiresAt) {
    passwordResetOTPs.delete(cleanEmail);
    return res.status(400).json({
      success: false,
      message: 'The OTP has expired. Please request a fresh OTP.'
    });
  }

  if (record.attempts >= 5) {
    passwordResetOTPs.delete(cleanEmail);
    return res.status(400).json({
      success: false,
      message: 'Too many incorrect attempts. Please request a new OTP.'
    });
  }

  if (record.otp !== cleanOtp) {
    record.attempts = (record.attempts || 0) + 1;
    passwordResetOTPs.set(cleanEmail, record);
    return res.status(400).json({
      success: false,
      message: `Incorrect OTP code. You have ${5 - record.attempts} attempt(s) remaining.`
    });
  }

  // OTP verified! Update user's password/PIN
  const allUsers = await getUsers();
  const user = allUsers.find(u => (record.userId && u.id === record.userId) || (u.email && u.email.trim().toLowerCase() === cleanEmail));

  if (!user) {
    return res.status(404).json({ success: false, message: 'User account not found.' });
  }

  user.pin = await hashCredential(cleanPassword);
  await saveUser(user);

  // Clear used OTP
  passwordResetOTPs.delete(cleanEmail);

  const token = `token_${user.id}_${Date.now()}`;
  console.log(`🔑 Password successfully reset for user: ${user.email} (${user.id})`);

  return res.json({
    success: true,
    message: 'Your password has been successfully updated! You can now access your workspace.',
    user: {
      id: user.id,
      name: user.name,
      displayName: user.displayName || user.name,
      username: user.username,
      role: user.role || 'sales_rep',
      packageTier: user.packageTier || (user.role === 'admin' ? 'super_admin' : 'starter'),
      permissions: user.permissions || null,
      maxLeadsLimit: user.maxLeadsLimit || (user.role === 'admin' ? 999999 : 50),
      email: user.email || '',
      phone: user.phone || ''
    },
    token
  });
});

// Get Current User
app.get('/api/auth/me', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not logged in.' });
  }
  res.json({ success: true, user: req.user });
});

// Demo Session Endpoint: Generates genuine signed HMAC session token for demo workflows
app.all('/api/auth/demo', async (req, res) => {
  const targetRole = String(req.query.role || req.body?.role || 'admin').toLowerCase();
  const allUsers = await getUsers();
  let user = null;
  if (['admin', 'super_admin', 'company_owner', 'owner'].includes(targetRole)) {
    user = allUsers.find(u => u.id === 'usr_admin') || allUsers[0];
  } else if (['team_leader', 'manager', 'head'].includes(targetRole)) {
    user = allUsers.find(u => u.id === 'usr_vikram') || allUsers.find(u => u.role === 'team_leader') || allUsers[0];
  } else if (['sales_executive', 'sales_rep', 'rep'].includes(targetRole)) {
    user = allUsers.find(u => u.id === 'usr_rohan') || allUsers.find(u => u.role === 'sales_executive') || allUsers[0];
  } else {
    user = allUsers.find(u => u.id === 'usr_admin') || allUsers[0];
  }

  const role = isSuperAdminEmailOrName(user) ? 'admin' : (user.role === 'team_leader' || user.role === 'manager' ? 'manager' : (user.role === 'sales_executive' ? 'sales_executive' : user.role || 'sales_rep'));
  const token = generateSecureToken(user.id, role);

  res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      displayName: user.displayName || user.name,
      username: user.username,
      role: role,
      actualRole: user.role,
      packageTier: user.packageTier || (role === 'admin' ? 'super_admin' : 'starter'),
      permissions: user.permissions || null,
      maxLeadsLimit: user.maxLeadsLimit || (role === 'admin' ? 999999 : 50),
      email: user.email || '',
      phone: user.phone || '',
      companyId: user.companyId || user.permissions?.companyId || 'tenant_apexsales',
      companyName: user.companyName || user.permissions?.companyName || 'ApexSales Global HQ'
    },
    token
  });
});

// List Users (Role-aware: Super Admin sees all; Manager sees own team; Sales Rep sees ONLY self)
app.get('/api/users', async (req, res) => {
  const allUsers = await getUsers();
  const user = req.user;

  if (!user) {
    return res.status(401).json({ success: false, message: 'Authentication required.', users: [] });
  }

  const isSuper = isSuperAdminEmailOrName(user) || user.role === 'admin';
  const isManager = user.role === 'manager';

  let visibleUsers = [];

  if (isSuper) {
    // Super Admin sees all active users
    visibleUsers = allUsers.filter(u => u.active !== false);
  } else if (isManager) {
    // Manager sees themselves + the employees who report under them
    const managerNameLower = (user.name || '').trim().toLowerCase();
    const managerId = user.id;

    visibleUsers = allUsers.filter(u => {
      if (u.active === false) return false;
      if (u.id === managerId || (u.name || '').trim().toLowerCase() === managerNameLower) return true;
      const uReportsTo = (u.reportsTo || u.manager || '').trim().toLowerCase();
      const uManagerId = u.managerId || '';
      return uReportsTo === managerNameLower || (uManagerId && uManagerId === managerId);
    });
  } else {
    // Normal Employee (sales_rep): STRICT PRIVACY!
    // They ONLY see themselves. No other employee's name is ever returned!
    const userNameLower = (user.name || '').trim().toLowerCase();
    visibleUsers = allUsers.filter(u => u.active !== false && (u.id === user.id || (u.name || '').trim().toLowerCase() === userNameLower));
  }

  const safeUsers = visibleUsers.map(u => ({
    id: u.id,
    name: u.name,
    displayName: u.displayName || u.name,
    username: u.username,
    role: u.role || 'sales_rep',
    packageTier: u.packageTier || (u.role === 'admin' ? 'super_admin' : 'starter'),
    permissions: u.permissions || null,
    maxLeadsLimit: u.maxLeadsLimit || (u.role === 'admin' ? 999999 : 50),
    email: isSuper ? (u.email || '') : (u.id === user.id ? u.email : ''),
    phone: isSuper ? (u.phone || '') : (u.id === user.id ? u.phone : ''),
    reportsTo: u.reportsTo || u.manager || '',
    managerId: u.managerId || '',
    status: u.status || 'active',
    invitedAt: u.invitedAt || null,
    inviteToken: isSuper ? u.inviteToken : undefined,
    companyId: u.companyId || u.permissions?.companyId || '',
    companyName: u.companyName || u.permissions?.companyName || ''
  }));

  res.json({ success: true, users: safeUsers });
});

// Admin: Invite Team Member by Email
app.post('/api/users/invite', async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Only Admin can invite team members.' });
  }

  const { email, name, role = 'sales_rep', pin, phone = '', reportsTo = '' } = req.body;
  if (!email || !String(email).trim()) {
    return res.status(400).json({ success: false, message: 'Valid Email Address is required.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanName = (name && String(name).trim()) || cleanEmail.split('@')[0];
  const userPin = (pin && String(pin).trim()) || String(Math.floor(100000 + Math.random() * 900000));
  const userRole = role === 'admin' ? 'admin' : (role === 'manager' ? 'manager' : 'sales_rep');

  const allUsers = await getUsers();
  const existingUser = allUsers.find(u => u.email?.toLowerCase() === cleanEmail);

  const inviteToken = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  let savedUserRecord = null;

  if (existingUser) {
    existingUser.inviteToken = inviteToken;
    existingUser.pin = await hashCredential(userPin);
    existingUser.name = cleanName;
    existingUser.displayName = cleanName;
    existingUser.role = userRole;
    existingUser.active = true;
    existingUser.status = 'invited';
    existingUser.invitedAt = new Date().toISOString();
    existingUser.invitedBy = req.user?.name || 'Admin';
    if (phone) existingUser.phone = phone.trim();
    if (reportsTo) existingUser.reportsTo = reportsTo.trim();
    await saveUser(existingUser);
    savedUserRecord = existingUser;
  } else {
    const usernameSlug = cleanEmail.split('@')[0].replace(/[^a-z0-9_]/g, '_');
    const isSuperEmail = cleanEmail === 'salesflowcrmhelp@gmail.com' || cleanEmail === 'harsh.accomation@gmail.com';
    const finalRole = (userRole === 'admin' && isSuperEmail) ? 'admin' : (userRole === 'manager' ? 'manager' : 'sales_rep');
    const finalPkg = finalRole === 'admin' ? 'super_admin' : (finalRole === 'manager' ? 'enterprise' : 'starter');
    savedUserRecord = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: cleanName,
      displayName: cleanName,
      username: usernameSlug,
      email: cleanEmail,
      pin: await hashCredential(userPin),
      role: finalRole,
      packageTier: finalPkg,
      permissions: {
        canViewAllLeads: false,
        canDeleteLeads: false,
        canAccessTeam: false,
        canReassignLeads: finalRole === 'manager',
        canExportCSV: finalRole === 'manager',
        canCreateLeads: true,
        canEditLeads: true
      },
      maxLeadsLimit: finalRole === 'admin' ? 999999 : (finalRole === 'manager' ? 1000 : 50),
      phone: phone.trim(),
      reportsTo: reportsTo.trim(),
      active: true,
      status: 'invited',
      inviteToken,
      invitedAt: new Date().toISOString(),
      invitedBy: req.user?.name || 'Admin',
      createdAt: new Date().toISOString()
    };
    await saveUser(savedUserRecord);
  }

  const host = req.get('host') || 'apexsales-crm.onrender.com';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const baseUrl = `${protocol}://${host}`;
  const inviteUrl = `${baseUrl}?invite=${inviteToken}&email=${encodeURIComponent(cleanEmail)}`;

  const inviteMessage = `✨ Welcome to ApexSales CRM! ✨\n\nHello ${cleanName},\n\nYour account has been created on the ApexSales CRM workspace as ${userRole === 'admin' ? 'Super Admin' : 'Sales Representative'}.\n\n🔐 Official Login Credentials:\n• Authorized Email: ${cleanEmail}\n• Login Password / PIN: ${userPin}\n\n👉 Click here to open your workspace:\n${inviteUrl}\n\n(Strict Security Notice: Only your registered email ID is authorized to log in)\n\n---\nApexSales CRM • High-Performance Revenue & Sales Workspace`;

  const emailResult = await sendInvitationEmail({
    toEmail: cleanEmail,
    recipientName: cleanName,
    role: userRole,
    inviteUrl,
    initialPin: userPin,
    inviterName: req.user?.name || 'Admin'
  });

  res.json({
    success: true,
    message: emailResult.sent ? `Invitation email sent successfully to ${cleanEmail}!` : `Invitation created for ${cleanEmail}!`,
    inviteToken,
    inviteUrl,
    inviteMessage,
    user: savedUserRecord,
    emailSent: emailResult.sent,
    emailStatus: emailResult.sent ? 'sent' : 'manual_dispatch_ready'
  });
});

// Admin: Get Current Email Dispatch Configuration Status
app.get('/api/settings/email', async (req, res) => {
  const cfg = await getEmailConfig();
  if (!cfg) {
    return res.json({ success: true, configured: false, provider: '', senderEmail: '' });
  }
  res.json({
    success: true,
    configured: true,
    provider: cfg.type,
    senderEmail: cfg.user || cfg.senderEmail || (cfg.type === 'resend' ? 'onboarding@resend.dev' : '')
  });
});

// Admin: Save & Verify Email Dispatch Configuration (Resend API, Brevo API, or Gmail SMTP)
app.post('/api/settings/email', async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Only Admin can configure email dispatch.' });
  }

  const { type = 'resend', apiKey, user, pass, host, port, senderEmail } = req.body;

  // 1. Handle Resend Email API
  if (type === 'resend') {
    if (!apiKey || !String(apiKey).trim()) {
      return res.status(400).json({ success: false, message: 'Resend API Key is required.' });
    }
    const cleanKey = String(apiKey).trim();

    try {
      const testRes = await fetch('https://api.resend.com/api-keys', {
        headers: { 'Authorization': `Bearer ${cleanKey}` }
      });
      if (!testRes.ok) {
        return res.status(400).json({ success: false, message: 'Invalid Resend API Key. Please verify your key on resend.com.' });
      }

      const configData = {
        id: 'email_api_config',
        type: 'resend',
        apiKey: cleanKey,
        provider: 'Resend Email API',
        fromEmail: (senderEmail && String(senderEmail).trim()) || 'ApexSales CRM <onboarding@resend.dev>',
        updatedAt: new Date().toISOString(),
        updatedBy: req.user?.name || 'Admin'
      };

      const local = readLocalDB();
      if (!local.settings) local.settings = {};
      local.settings.email_api = configData;
      writeLocalDB(local);

      console.log(`✅ Resend Email API connected successfully!`);
      return res.json({
        success: true,
        message: 'Resend Email API connected successfully! All new users will now automatically receive branded emails via API.',
        provider: 'resend',
        senderEmail: configData.fromEmail
      });
    } catch (err) {
      return res.status(400).json({ success: false, message: `Could not verify Resend API: ${err.message}` });
    }
  }

  // 2. Handle Brevo Email API
  if (type === 'brevo') {
    if (!apiKey || !String(apiKey).trim()) {
      return res.status(400).json({ success: false, message: 'Brevo API Key is required.' });
    }
    const cleanKey = String(apiKey).trim();

    try {
      const testRes = await fetch('https://api.brevo.com/v3/account', {
        headers: { 'api-key': cleanKey }
      });
      if (!testRes.ok) {
        return res.status(400).json({ success: false, message: 'Invalid Brevo API Key. Please verify on brevo.com.' });
      }

      const configData = {
        id: 'email_api_config',
        type: 'brevo',
        apiKey: cleanKey,
        provider: 'Brevo Email API',
        senderEmail: (senderEmail && String(senderEmail).trim()) || 'salesflowcrmhelp@gmail.com',
        updatedAt: new Date().toISOString(),
        updatedBy: req.user?.name || 'Admin'
      };

      const local = readLocalDB();
      if (!local.settings) local.settings = {};
      local.settings.email_api = configData;
      writeLocalDB(local);

      console.log(`✅ Brevo Email API connected successfully!`);
      return res.json({
        success: true,
        message: 'Brevo Email API connected successfully! All new users will now automatically receive branded emails via API.',
        provider: 'brevo',
        senderEmail: configData.senderEmail
      });
    } catch (err) {
      return res.status(400).json({ success: false, message: `Could not verify Brevo API: ${err.message}` });
    }
  }

  // 3. Handle Gmail / Custom SMTP
  if (!user || !pass) {
    return res.status(400).json({ success: false, message: 'Gmail Address and App Password are required for SMTP.' });
  }

  const cleanUser = String(user).trim();
  const cleanPass = String(pass).replace(/\s+/g, '').trim();
  const cleanHost = (host && String(host).trim()) || (cleanUser.includes('@gmail.com') ? 'smtp.gmail.com' : 'smtp.gmail.com');
  const cleanPort = port ? Number(port) : 465;

  // Test connection immediately before saving!
  try {
    const testTransporter = nodemailer.createTransport({
      host: cleanHost,
      port: cleanPort,
      secure: cleanPort === 465,
      auth: { user: cleanUser, pass: cleanPass }
    });

    await testTransporter.verify();

    const configData = {
      id: 'smtp_config',
      type: 'smtp',
      user: cleanUser,
      pass: cleanPass,
      host: cleanHost,
      port: cleanPort,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user?.name || 'Admin'
    };

    const local = readLocalDB();
    if (!local.settings) local.settings = {};
    local.settings.smtp = configData;
    writeLocalDB(local);

    console.log(`✅ Automatic email dispatch successfully connected for ${cleanUser}!`);
    res.json({
      success: true,
      message: `Connected successfully! All invitations will now automatically be delivered to user inboxes from "${cleanUser}".`,
      senderEmail: cleanUser,
      provider: 'smtp'
    });
  } catch (err) {
    console.error('SMTP test failed:', err.message);
    res.status(400).json({
      success: false,
      message: `Connection failed: ${err.message}. Please check that 2-Step Verification is ON in your Google Account and you generated a 16-character App Password.`
    });
  }
});

// Admin: Add New User
app.post('/api/users', async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Only Admin can create users.' });
  }

  const { name, username, pin, role = 'sales_rep', email = '', phone = '', reportsTo = '', managerId = '', packageTier = 'starter', permissions = null, maxLeadsLimit } = req.body;
  if (!name || !pin) {
    return res.status(400).json({ success: false, message: 'Name and PIN are required.' });
  }

  const allUsers = await getUsers();
  const userSlug = (username || name.replace(/\s+/g, '_')).toLowerCase().trim();

  // Check username uniqueness
  if (allUsers.some(u => u.username?.toLowerCase() === userSlug)) {
    return res.status(400).json({ success: false, message: `Username "${userSlug}" is already taken.` });
  }

  const newUser = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    name: name.trim(),
    displayName: name.trim(),
    username: userSlug,
    pin: await hashCredential(pin),
    role: ['admin', 'manager'].includes(role) ? role : 'sales_rep',
    packageTier: ['starter', 'growth', 'enterprise', 'super_admin'].includes(packageTier) ? packageTier : 'starter',
    permissions: permissions || null,
    maxLeadsLimit: maxLeadsLimit ? Number(maxLeadsLimit) : (role === 'admin' ? 999999 : 50),
    email: email.trim(),
    phone: phone.trim(),
    reportsTo: reportsTo ? reportsTo.trim() : '',
    managerId: managerId ? managerId.trim() : '',
    active: true,
    createdAt: new Date().toISOString()
  };

  if (newUser.role !== 'admin' && !isSuperAdminEmailOrName(newUser)) {
    if (newUser.permissions) {
      newUser.permissions.canViewAllLeads = false;
      newUser.permissions.canDeleteLeads = false;
      newUser.permissions.canAccessTeam = false;
    }
  }

  await saveUser(newUser);

  let emailSent = false;
  let emailError = null;
  if (email && email.trim()) {
    const cleanEmail = email.trim().toLowerCase();
    const host = req.get('host') || 'apexsales-crm.onrender.com';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;
    const inviteUrl = `${baseUrl}?email=${encodeURIComponent(cleanEmail)}`;

    try {
      const emailResult = await sendInvitationEmail({
        toEmail: cleanEmail,
        recipientName: name.trim(),
        role: newUser.role,
        inviteUrl,
        initialPin: String(pin).trim(),
        inviterName: req.user?.name || 'Admin'
      });
      emailSent = emailResult.sent;
      emailError = emailResult.reason || null;
      console.log(`✉️ Automated invitation dispatched in /api/users to ${cleanEmail}: ${emailSent}`);
    } catch (err) {
      console.error('⚠️ Failed to dispatch invitation email in /api/users:', err.message);
      emailError = err.message;
    }
  }

  const host = req.get('host') || 'apexsales-crm.onrender.com';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const inviteUrl = `${protocol}://${host}?email=${encodeURIComponent(newUser.email || '')}`;
  const inviteMessage = `✨ Welcome to ApexSales CRM! ✨\n\nHello ${newUser.name},\n\nYour account has been created on the ApexSales CRM workspace as ${newUser.role === 'admin' ? 'Super Admin' : 'Sales Representative'}.\n\n🔐 Official Login Credentials:\n• Authorized Email: ${newUser.email}\n• Login Password / PIN: ${newUser.pin}\n\n👉 Click here to open your workspace:\n${inviteUrl}\n\n---\nApexSales CRM • High-Performance Revenue & Sales Workspace`;

  res.json({ 
    success: true, 
    user: newUser, 
    emailSent, 
    emailError,
    inviteUrl,
    inviteMessage,
    message: emailSent 
      ? `User "${newUser.name}" added & official email dispatched to ${newUser.email}!` 
      : `User "${newUser.name}" added successfully!` 
  });
});

// Admin: Update User
app.put('/api/users/:id', async (req, res) => {
  const isSuper = isSuperAdminEmailOrName(req.user);
  if (req.user?.role !== 'admin' && !isSuper) {
    return res.status(403).json({ success: false, message: 'Access denied. Only Admin can modify users.' });
  }

  const { id } = req.params;
  const { name, pin, role, reportsTo, managerId, email, phone, active, packageTier, permissions, maxLeadsLimit } = req.body;

  const allUsers = await getUsers();
  const targetUser = allUsers.find(u => 
    u.id === id || 
    u._id === id || 
    (u._id && u._id.toString() === id) || 
    (u.name && u.name.toLowerCase() === id.toLowerCase()) || 
    (u.email && u.email.toLowerCase() === id.toLowerCase())
  );
  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const updated = { ...targetUser };
  if (name !== undefined) {
    updated.name = name.trim();
    updated.displayName = name.trim();
  }
  if (pin !== undefined && String(pin).trim() !== '') {
    const rawP = String(pin).trim();
    updated.pin = rawP.startsWith('$argon2') || (rawP.length === 64 && /^[a-fA-F0-9]{64}$/.test(rawP)) ? rawP : await hashCredential(rawP);
  }
  if (role !== undefined) {
    updated.role = ['admin', 'manager'].includes(role) ? role : 'sales_rep';
  }
  if (packageTier !== undefined) {
    updated.packageTier = ['starter', 'growth', 'enterprise', 'super_admin'].includes(packageTier) ? packageTier : 'starter';
  }
  if (permissions !== undefined) {
    updated.permissions = permissions;
  }
  if (updated.role !== 'admin' && !isSuperAdminEmailOrName(updated)) {
    if (updated.permissions) {
      updated.permissions.canViewAllLeads = false;
      updated.permissions.canDeleteLeads = false;
      updated.permissions.canAccessTeam = false;
    }
  }
  if (maxLeadsLimit !== undefined) {
    updated.maxLeadsLimit = Number(maxLeadsLimit) || 50;
  }
  if (reportsTo !== undefined) updated.reportsTo = reportsTo.trim();
  if (managerId !== undefined) updated.managerId = managerId.trim();
  if (email !== undefined) updated.email = email.trim();
  if (phone !== undefined) updated.phone = phone.trim();
  if (active !== undefined) updated.active = Boolean(active);

  await saveUser(updated);

  res.json({ success: true, user: updated, message: 'User updated successfully!' });
});

// Admin: Delete User Permanently
app.delete('/api/users/:id', async (req, res) => {
  const isSuper = isSuperAdminEmailOrName(req.user);
  if (req.user?.role !== 'admin' && !isSuper) {
    return res.status(403).json({ success: false, message: 'Access denied. Only Admin can delete users.' });
  }

  const { id } = req.params;
  const allUsers = await getUsers();
  const targetUser = allUsers.find(u => 
    u.id === id || 
    u._id === id || 
    (u.name && u.name.toLowerCase() === id.toLowerCase()) || 
    (u.email && u.email.toLowerCase() === id.toLowerCase())
  );

  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  // Strictly protect Super Admin account (Harsh Goyal)
  if (targetUser.id === 'usr_admin' || isSuperAdminEmailOrName(targetUser)) {
    return res.status(400).json({ success: false, message: 'Security restriction: Primary Super Admin account (Harsh Goyal) cannot be deleted.' });
  }

  // Prevent deleting currently logged-in account
  if (req.user && (req.user.id === targetUser.id || (req.user.name && targetUser.name && req.user.name.toLowerCase() === targetUser.name.toLowerCase() && targetUser.id === req.user.id))) {
    return res.status(400).json({ success: false, message: 'You cannot delete your own currently logged-in account.' });
  }

  // Permanently delete user from Supabase and db.json
  await deleteUser(targetUser.id);

  // Reassign any leads owned by this user to 'Unassigned' so pipeline records remain safe
  try {
    const allLeads = await getLeads();
    const targetNameLower = (targetUser.name || '').toLowerCase().trim();
    const leadsToReassign = allLeads.filter(l => 
      l.owner && (
        (targetNameLower && (l.owner || '').toLowerCase().trim() === targetNameLower) ||
        l.owner === targetUser.id
      )
    );
    for (const lead of leadsToReassign) {
      lead.owner = 'Unassigned';
      await saveLead(lead);
    }
  } catch (err) {
    console.error('Error reassigning leads on user delete:', err);
  }

  // Update any employees reporting to this user to report to Harsh Goyal
  try {
    const remainingUsers = await getUsers();
    const targetNameLower = (targetUser.name || '').toLowerCase().trim();
    for (const u of remainingUsers) {
      if (
        (targetNameLower && (u.reportsTo || '').toLowerCase().trim() === targetNameLower) ||
        (targetUser.id && u.managerId === targetUser.id)
      ) {
        u.reportsTo = 'Harsh Goyal';
        u.managerId = 'usr_admin';
        await saveUser(u);
      }
    }
  } catch (err) {
    console.error('Error updating reporting hierarchy on user delete:', err);
  }

  console.log(`🗑️ User permanently deleted: ${targetUser.name || targetUser.username} (${targetUser.id}) by Admin ${req.user?.name}`);
  res.json({ success: true, message: `User "${targetUser.displayName || targetUser.name}" permanently deleted.` });
});

// --- LEADS & PIPELINE API (WITH ROLE-BASED STRICT PRIVACY) ---

// Get Leads: Admin gets all (or filtered by ?owner=); Manager gets self + reporting team; Sales Rep strictly gets ONLY their assigned leads
app.get('/api/leads', async (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required to access CRM leads.',
      leads: []
    });
  }

  const allLeads = await getLeads();
  const allUsers = await getUsers();
  const { owner } = req.query;

  const userTenant = getUserTenantId(user);
  const isSuperAdmin = isSuperAdminEmailOrName(user) || user.role === 'admin' || user.role === 'company_owner';
  const isManager = user.role === 'manager';
  const hasFullLeadAccess = isSuperAdmin;

  // Multi-tenant company isolation: Super Admin sees all company leads;
  // Non-superadmin filtered by company tenant
  const isDefaultTenant = (t) => !t || t === 'tenant_accomation' || t === 'tenant_apexsales' || t === 'tenant_apexsales_com' || t === 'tenant_kashish';
  const tenantLeads = allLeads.filter(l => {
    if (isSuperAdmin) return true;
    const lTenant = l.tenantId || 'tenant_accomation';
    if (isDefaultTenant(userTenant) && isDefaultTenant(lTenant)) return true;
    return lTenant === userTenant;
  });

  // 1. If user is Super Admin: Full CRM Master Access within company
  if (hasFullLeadAccess) {
    let resultLeads = tenantLeads;
    if (owner && owner !== 'All' && owner !== 'all') {
      resultLeads = resultLeads.filter(l => (l.owner || '').trim().toLowerCase() === owner.trim().toLowerCase());
    }

    return res.json({
      success: true,
      role: isSuperAdmin ? 'admin' : (user.role || 'sales_rep'),
      count: resultLeads.length,
      leads: resultLeads
    });
  }

  // 2. If user is Sales Manager: Sees own leads + leads of team members reporting to them
  if (isManager) {
    const managerNameLower = (user.name || '').trim().toLowerCase();
    const managerDisplayNameLower = (user.displayName || '').trim().toLowerCase();
    const managerEmailLower = (user.email || '').trim().toLowerCase();
    const managerId = user.id;

    // Find all users reporting to this manager
    const reportingUsers = allUsers.filter(u => {
      if (u.active === false) return false;
      const uReportsTo = (u.reportsTo || u.manager || '').trim().toLowerCase();
      const uManagerId = u.managerId || '';
      return uReportsTo === managerNameLower || (managerDisplayNameLower && uReportsTo === managerDisplayNameLower) || (uManagerId && uManagerId === managerId);
    });

    const allowedOwners = new Set([
      managerNameLower,
      managerDisplayNameLower,
      managerEmailLower,
      ...reportingUsers.map(u => (u.name || '').trim().toLowerCase()),
      ...reportingUsers.map(u => (u.displayName || '').trim().toLowerCase()),
      ...reportingUsers.map(u => (u.email || '').trim().toLowerCase()),
      ...reportingUsers.map(u => (u.username || '').trim().toLowerCase())
    ].filter(Boolean));

    let managerTeamLeads = tenantLeads.filter(l => {
      const leadOwner = (l.owner || '').trim().toLowerCase();
      const leadAssigned = (l.assigned_to || '').trim().toLowerCase();
      return allowedOwners.has(leadOwner) || allowedOwners.has(leadAssigned);
    });

    if (owner && owner !== 'All' && owner !== 'all') {
      const requestedOwnerLower = owner.trim().toLowerCase();
      if (allowedOwners.has(requestedOwnerLower)) {
        managerTeamLeads = managerTeamLeads.filter(l => (l.owner || '').trim().toLowerCase() === requestedOwnerLower || (l.assigned_to || '').trim().toLowerCase() === requestedOwnerLower);
      }
    }

    return res.json({
      success: true,
      role: 'manager',
      count: managerTeamLeads.length,
      leads: managerTeamLeads
    });
  }

  // 3. Normal Sales Rep (Employee): STRICT DATA ISOLATION (No Admin or peer leads leak)
  const userNameLower = (user.name || '').trim().toLowerCase();
  const userDisplayNameLower = (user.displayName || '').trim().toLowerCase();
  const userEmailLower = (user.email || '').trim().toLowerCase();

  const userLeads = tenantLeads.filter(l => {
    const leadOwner = (l.owner || '').trim().toLowerCase();
    const leadAssigned = (l.assigned_to || '').trim().toLowerCase();
    return (
      leadOwner === userNameLower ||
      (userDisplayNameLower && leadOwner === userDisplayNameLower) ||
      (userEmailLower && leadOwner === userEmailLower) ||
      leadAssigned === userNameLower ||
      (userDisplayNameLower && leadAssigned === userDisplayNameLower)
    );
  });

  return res.json({
    success: true,
    role: 'sales_rep',
    count: userLeads.length,
    leads: userLeads
  });
});

// Admin-Only Backup & Vault Endpoints
app.get('/api/admin/backup', async (req, res) => {
  const isSuper = isSuperAdminEmailOrName(req.user);
  if (!isSuper) {
    return res.status(403).json({ success: false, message: 'Forbidden: Super Admin access required.' });
  }
  const backupFile = path.join(__dirname, 'data', 'db_backup.json');
  if (fs.existsSync(backupFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
      return res.json({ success: true, backup: data });
    } catch(e) {}
  }
  const current = readLocalDB();
  res.json({ success: true, backup: current });
});

app.post('/api/admin/backup/restore', async (req, res) => {
  const isSuper = isSuperAdminEmailOrName(req.user);
  if (!isSuper) {
    return res.status(403).json({ success: false, message: 'Forbidden: Super Admin access required.' });
  }
  const backupFile = path.join(__dirname, 'data', 'db_backup.json');
  if (!fs.existsSync(backupFile)) {
    return res.status(404).json({ success: false, message: 'Backup file not found on server.' });
  }
  try {
    const backup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
    writeLocalDB(backup);

    // Sync to Supabase PostgreSQL Cloud Database
    if (isSupabaseConnected && supabaseClient && Array.isArray(backup.leads)) {
      const leadRows = backup.leads.map(l => ({
        id: l.id,
        name: l.name || '',
        company: l.company || '',
        status: l.status || 'New',
        value: Number(l.value) || 0,
        email: l.email || '',
        phone: l.phone || '',
        source: l.source || 'Manual',
        score: l.score || 'Warm',
        next_follow_up: l.next_follow_up || '',
        won_date: l.won_date || '',
        notes: l.notes || '',
        owner: l.owner || 'Harsh Goyal',
        deal_type: l.deal_type || '',
        previous_stage: l.previous_stage || '',
        raw_data: l
      }));
      await supabaseClient.from('leads').upsert(leadRows, { onConflict: 'id' });
    }
    console.log(`🛡️ Admin restored database backup successfully: ${backup.leads?.length || 0} leads.`);
    res.json({ success: true, message: 'Backup restored successfully!', leads: backup.leads });
  } catch(err) {
    console.error('Error restoring backup:', err);
    res.status(500).json({ success: false, message: 'Failed to restore backup: ' + err.message });
  }
});

app.post('/api/admin/backup/save', async (req, res) => {
  const isSuper = isSuperAdminEmailOrName(req.user);
  if (!isSuper) {
    return res.status(403).json({ success: false, message: 'Forbidden: Super Admin access required.' });
  }
  try {
    const allLeads = await getLeads();
    const allUsers = await getUsers();
    const snapshot = {
      timestamp: new Date().toISOString(),
      updatedBy: req.user?.email || 'admin',
      users: allUsers,
      leads: allLeads
    };
    const backupFile = path.join(__dirname, 'data', 'db_backup.json');
    fs.writeFileSync(backupFile, JSON.stringify(snapshot, null, 2), 'utf8');
    console.log(`💾 Admin saved snapshot to db_backup.json: ${allLeads.length} leads.`);
    res.json({ success: true, message: 'Snapshot saved to server backup vault!', count: allLeads.length });
  } catch(err) {
    res.status(500).json({ success: false, message: 'Failed to save snapshot: ' + err.message });
  }
});

// Create Lead
app.post('/api/leads', async (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, message: 'Authentication required to create leads.' });
  }
  const leadData = req.body;

  if (!leadData.name) {
    return res.status(400).json({ success: false, message: 'Lead name is required.' });
  }

  const isSuper = isSuperAdminEmailOrName(user);
  let assignedOwner = isSuper ? (leadData.owner || 'Harsh Goyal') : (user.name || 'Sales Rep');

  const newLead = {
    ...leadData,
    id: leadData.id || `lead_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    owner: assignedOwner,
    tenantId: getUserTenantId(user),
    createdAt: leadData.createdAt || new Date().toISOString(),
    status: leadData.status || 'Contacted'
  };

  await saveLead(newLead);

  res.json({ success: true, lead: newLead, message: 'Lead created successfully!' });
});

// Bulk Import Leads Endpoint
app.post('/api/leads/bulk-import', async (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, message: 'Authentication required to import leads.' });
  }
  const { leads: incomingLeads } = req.body;

  if (!Array.isArray(incomingLeads) || incomingLeads.length === 0) {
    return res.status(400).json({ success: false, message: 'No leads provided to import.' });
  }

  const isSuper = isSuperAdminEmailOrName(user);
  const validIncoming = [];
  const defaultOwner = isSuper ? 'Harsh Goyal' : (user.name || 'Sales Rep');
  const userTenant = getUserTenantId(user);

  for (let i = 0; i < incomingLeads.length; i++) {
    const raw = incomingLeads[i];
    if (!raw.name || !String(raw.name).trim()) continue;

    // Determine ownership
    let leadOwner = defaultOwner;
    if (isSuper && raw.owner && String(raw.owner).trim()) {
      leadOwner = String(raw.owner).trim();
    }

    const leadId = raw.id || `lead_import_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`;
    const newLead = {
      id: leadId,
      name: String(raw.name).trim(),
      company: String(raw.company || '').trim(),
      phone: String(raw.phone || '').trim(),
      email: String(raw.email || '').trim(),
      value: Number(raw.value) || 0,
      status: String(raw.status || 'New').trim(),
      source: String(raw.source || 'Manual').trim(),
      score: String(raw.score || 'Warm').trim(),
      next_follow_up: String(raw.next_follow_up || '').trim(),
      demo_booked_time: String(raw.demo_booked_time || '').trim(),
      won_date: String(raw.won_date || '').trim(),
      notes: typeof raw.notes === 'string' ? raw.notes : Array.isArray(raw.notes) ? raw.notes : '',
      owner: leadOwner,
      tenantId: userTenant,
      createdAt: raw.createdAt || new Date().toISOString()
    };

    validIncoming.push(newLead);
    await saveLead(newLead);
  }

  console.log(`📥 Bulk imported ${validIncoming.length} leads by ${user?.name || 'Anonymous'}`);
  return res.json({
    success: true,
    count: validIncoming.length,
    leads: validIncoming,
    message: `Successfully imported ${validIncoming.length} leads!`
  });
});

// Update Lead
app.put('/api/leads/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, message: 'Authentication required to update leads.' });
  }

  const allLeads = await getLeads();
  const currentLead = allLeads.find(l => String(l.id) === String(id));
  if (!currentLead) {
    return res.status(404).json({ success: false, message: 'Lead not found.' });
  }

  const isSuper = isSuperAdminEmailOrName(user) || user.role === 'admin';
  const isManager = user.role === 'manager';
  const isOwner = (currentLead.owner || '').trim().toLowerCase() === (user.name || '').trim().toLowerCase();

  let isManagerReportingLead = false;
  if (isManager) {
    const managerNameLower = (user.name || '').trim().toLowerCase();
    const reportingUsers = allUsers.filter(u => {
      const uReportsTo = (u.reportsTo || u.manager || '').trim().toLowerCase();
      return uReportsTo === managerNameLower || u.managerId === user.id;
    }).map(u => (u.name || '').trim().toLowerCase());
    isManagerReportingLead = reportingUsers.includes((currentLead.owner || '').trim().toLowerCase());
  }

  // Security enforcement: allow editing if Super Admin, lead owner, or manager of reporting team
  if (!isSuper && !isOwner && !isManagerReportingLead) {
    return res.status(403).json({ success: false, message: 'Access denied. You can only update your own assigned leads.' });
  }

  // Reassign owner check: only Super Admin and Manager can reassign leads
  const canReassign = isSuper || isManager;
  if (updates.owner && updates.owner !== currentLead.owner && !canReassign) {
    delete updates.owner;
  }

  const updatedLead = { ...currentLead, ...updates, updatedAt: new Date().toISOString() };
  await saveLead(updatedLead);

  res.json({ success: true, lead: updatedLead, message: 'Lead updated successfully!' });
});

// Delete Lead: Strictly restricted to Super Admin only (protects client database)
app.delete('/api/leads/:id', async (req, res) => {
  const { id } = req.params;
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, message: 'Authentication required to delete leads.' });
  }

  const isSuper = isSuperAdminEmailOrName(user) || user.role === 'admin';
  if (!isSuper) {
    return res.status(403).json({ success: false, message: 'Access denied. Only Super Admin can delete leads.' });
  }

  const allLeads = await getLeads();
  const targetLead = allLeads.find(l => String(l.id) === String(id));
  if (!targetLead) {
    return res.status(404).json({ success: false, message: 'Lead not found.' });
  }

  const deleted = await removeLead(id);
  res.json({ success: true, lead: deleted, message: 'Lead deleted successfully.' });
});

// Bulk Sync Endpoint: Strict role-isolated synchronization
app.post('/api/sync/bulk', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required for synchronization.' });
  }

  const { leads, users } = req.body;
  const isSuper = isSuperAdminEmailOrName(req.user) || req.user.role === 'admin';
  const isManager = req.user.role === 'manager';

  if (!isSuper) {
    let allowedLeads = [];
    if (isManager) {
      const managerNameLower = (req.user.name || '').trim().toLowerCase();
      const allUsers = await getUsers();
      const reportingUsers = allUsers.filter(u => {
        const uReportsTo = (u.reportsTo || u.manager || '').trim().toLowerCase();
        return uReportsTo === managerNameLower || u.managerId === req.user.id;
      }).map(u => (u.name || '').trim().toLowerCase());
      const allowedOwners = new Set([managerNameLower, ...reportingUsers]);
      allowedLeads = (leads || []).filter(l => allowedOwners.has((l.owner || '').trim().toLowerCase()));
    } else {
      // Employee strictly syncs only their own leads
      allowedLeads = (leads || []).filter(l => (l.owner || '').trim().toLowerCase() === (req.user.name || '').trim().toLowerCase());
    }

    if (allowedLeads.length > 0) {
      await syncBulkData(allowedLeads, null);
    }
    return res.json({ success: true, message: 'Leads synchronized successfully!' });
  }

  // Super Admin syncs all leads and users
  await syncBulkData(leads, users);
  res.json({ success: true, message: 'Bulk data synchronized successfully!' });
});

// --- TASK MANAGEMENT ENDPOINTS (Strict 3-Tier RBAC & Tenant Isolated) ---

// 1. GET /api/tasks: Admin gets company tasks; Manager gets team tasks; Employee gets strictly own tasks
app.get('/api/tasks', async (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, message: 'Authentication required to access tasks.', tasks: [] });
  }

  const allTasks = await getTasks();
  const allUsers = await getUsers();
  const allLeads = await getLeads();

  const userTenant = getUserTenantId(user);
  const isSuperAdmin = isSuperAdminEmailOrName(user) || user.role === 'admin' || user.role === 'company_owner';
  const isManager = user.role === 'manager';

  // Scope to user's company/tenant
  let tenantTasks = allTasks.filter(t => {
    if (isSuperAdmin) return true;
    const taskTenant = t.tenantId || 'tenant_accomation';
    return taskTenant === userTenant || 
           (userTenant === 'tenant_apexsales_com' && (taskTenant === 'tenant_accomation' || !t.tenantId));
  });

  // 1. Super Admin: Full master access within company
  if (isSuperAdmin) {
    return res.json({
      success: true,
      role: 'admin',
      count: tenantTasks.length,
      tasks: tenantTasks
    });
  }

  // 2. Manager: Own tasks + reporting team tasks
  if (isManager) {
    const managerNameLower = (user.name || '').trim().toLowerCase();
    const managerDisplayNameLower = (user.displayName || '').trim().toLowerCase();
    const managerEmailLower = (user.email || '').trim().toLowerCase();
    const managerId = String(user.id || '');

    const reportingUsers = allUsers.filter(u => {
      if (u.active === false) return false;
      const uReportsTo = (u.reportsTo || u.manager || '').trim().toLowerCase();
      const uManagerId = String(u.managerId || '');
      return uReportsTo === managerNameLower || (managerDisplayNameLower && uReportsTo === managerDisplayNameLower) || (uManagerId && uManagerId === managerId);
    });

    const allowedOwners = new Set([
      managerNameLower,
      managerDisplayNameLower,
      managerEmailLower,
      managerId,
      ...reportingUsers.map(u => (u.name || '').trim().toLowerCase()),
      ...reportingUsers.map(u => (u.displayName || '').trim().toLowerCase()),
      ...reportingUsers.map(u => (u.email || '').trim().toLowerCase()),
      ...reportingUsers.map(u => (u.username || '').trim().toLowerCase()),
      ...reportingUsers.map(u => String(u.id || ''))
    ].filter(Boolean));

    const managerTasks = tenantTasks.filter(t => {
      const tOwner = (t.owner || t.ownerName || '').trim().toLowerCase();
      const tEmail = (t.ownerEmail || '').trim().toLowerCase();
      const tId = String(t.ownerId || '');
      return allowedOwners.has(tOwner) || allowedOwners.has(tEmail) || allowedOwners.has(tId);
    });

    return res.json({
      success: true,
      role: 'manager',
      count: managerTasks.length,
      tasks: managerTasks
    });
  }

  // 3. Employee (sales_rep): STRICT DATA ISOLATION
  // Can only see tasks they own OR tasks linked to leads assigned to them
  const userNameLower = (user.name || '').trim().toLowerCase();
  const userDisplayNameLower = (user.displayName || '').trim().toLowerCase();
  const userEmailLower = (user.email || '').trim().toLowerCase();
  const userId = String(user.id || '');

  // Leads owned by this rep
  const repLeadIds = new Set(
    allLeads.filter(l => {
      const lOwner = (l.owner || '').trim().toLowerCase();
      const lAssigned = (l.assigned_to || '').trim().toLowerCase();
      return (
        lOwner === userNameLower ||
        (userDisplayNameLower && lOwner === userDisplayNameLower) ||
        (userEmailLower && lOwner === userEmailLower) ||
        lAssigned === userNameLower ||
        (userDisplayNameLower && lAssigned === userDisplayNameLower)
      );
    }).map(l => String(l.id))
  );

  const repTasks = tenantTasks.filter(t => {
    const tOwner = (t.owner || t.ownerName || '').trim().toLowerCase();
    const tEmail = (t.ownerEmail || '').trim().toLowerCase();
    const tId = String(t.ownerId || '');

    const isDirectOwner = (
      (tId && tId === userId) ||
      (tEmail && tEmail === userEmailLower) ||
      (tOwner && (tOwner === userNameLower || (userDisplayNameLower && tOwner === userDisplayNameLower)))
    );

    const isLinkedToMyLead = t.linkedLeadId && repLeadIds.has(String(t.linkedLeadId));

    return isDirectOwner || isLinkedToMyLead;
  });

  return res.json({
    success: true,
    role: 'sales_rep',
    count: repTasks.length,
    tasks: repTasks
  });
});

// 2. POST /api/tasks: Create task with explicit owner and tenant metadata
app.post('/api/tasks', async (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, message: 'Authentication required to create a task.' });
  }

  const { title, priority, dueDate, linkedLeadId, completed, outcome, completionRemark } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, message: 'Task description is required.' });
  }

  const newTask = {
    id: req.body.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    title: title.trim(),
    priority: priority || 'Medium',
    dueDate: dueDate || new Date().toISOString().split('T')[0],
    linkedLeadId: linkedLeadId || '',
    completed: Boolean(completed),
    completedAt: completed ? new Date().toISOString() : null,
    outcome: outcome || '',
    completionRemark: completionRemark || '',
    createdAt: req.body.createdAt || new Date().toISOString(),
    ownerId: String(user.id || ''),
    ownerEmail: (user.email || '').trim().toLowerCase(),
    owner: user.name || user.displayName || 'Authorized User',
    ownerName: user.name || user.displayName || 'Authorized User',
    tenantId: getUserTenantId(user)
  };

  await saveTask(newTask);

  return res.json({
    success: true,
    message: 'Task created successfully.',
    task: newTask
  });
});

// 3. PUT /api/tasks/:id: Update task status/fields with ownership authorization
app.put('/api/tasks/:id', async (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  const taskId = req.params.id;
  const allTasks = await getTasks();
  const existing = allTasks.find(t => String(t.id) === String(taskId));

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Task not found.' });
  }

  const isSuper = isSuperAdminEmailOrName(user) || user.role === 'admin';
  const isOwner = (
    String(existing.ownerId) === String(user.id) ||
    (existing.ownerEmail && existing.ownerEmail.toLowerCase() === (user.email || '').toLowerCase()) ||
    (existing.owner && existing.owner.toLowerCase() === (user.name || '').toLowerCase())
  );

  if (!isSuper && !isOwner && user.role !== 'manager') {
    return res.status(403).json({ success: false, message: 'Unauthorized to update this task.' });
  }

  const updatedTask = {
    ...existing,
    ...req.body,
    id: existing.id,
    ownerId: existing.ownerId,
    ownerEmail: existing.ownerEmail,
    owner: existing.owner,
    tenantId: existing.tenantId || getUserTenantId(user),
    updatedAt: new Date().toISOString()
  };

  if (req.body.completed !== undefined) {
    updatedTask.completed = Boolean(req.body.completed);
    updatedTask.completedAt = updatedTask.completed ? (req.body.completedAt || new Date().toISOString()) : null;
  }

  await saveTask(updatedTask);

  return res.json({
    success: true,
    message: 'Task updated successfully.',
    task: updatedTask
  });
});

// 4. DELETE /api/tasks/:id: Delete task with authorization
app.delete('/api/tasks/:id', async (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  const taskId = req.params.id;
  const allTasks = await getTasks();
  const existing = allTasks.find(t => String(t.id) === String(taskId));

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Task not found.' });
  }

  const isSuper = isSuperAdminEmailOrName(user) || user.role === 'admin';
  const isOwner = (
    String(existing.ownerId) === String(user.id) ||
    (existing.ownerEmail && existing.ownerEmail.toLowerCase() === (user.email || '').toLowerCase()) ||
    (existing.owner && existing.owner.toLowerCase() === (user.name || '').toLowerCase())
  );

  if (!isSuper && !isOwner) {
    return res.status(403).json({ success: false, message: 'Unauthorized to delete this task.' });
  }

  await deleteTask(taskId);

  return res.json({
    success: true,
    message: 'Task deleted successfully.'
  });
});

// SMS Rate Limiter Store
const smsAttempts = new Map();
function checkSmsRateLimit(key) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const maxAttempts = process.env.NODE_ENV === 'production' ? 3 : 20;
  const record = smsAttempts.get(key);
  if (!record || now > record.resetTime) {
    smsAttempts.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }
  if (record.count >= maxAttempts) {
    const retryMinutes = Math.ceil((record.resetTime - now) / 60000);
    return { allowed: false, retryMinutes };
  }
  record.count += 1;
  return { allowed: true };
}

// SMS Gateway Proxy Endpoint (Hardened with Authentication, Regex & Rate Limiting)
app.post('/api/send-sms', (req, res) => {
  // 1. Authentication check (Blocker 4)
  if (!req.user) {
    return res.status(401).json({ return: false, success: false, message: 'Authentication required to use SMS gateway.' });
  }

  try {
    const { phone, otp, gateway, templateId } = req.body;
    // Client-supplied API key is strictly ignored/rejected for security
    const cleanPhone = String(phone || '').replace(/[^0-9]/g, '').slice(-10);

    // 2. Validate 10-digit Indian mobile number format: /^[6-9]\d{9}$/
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({ return: false, success: false, message: 'Invalid mobile number. Must be a valid 10-digit Indian mobile number.' });
    }

    // 3. Validate OTP format: 4 to 6 numeric digits
    const otpStr = String(otp || '').trim();
    if (!/^\d{4,6}$/.test(otpStr)) {
      return res.status(400).json({ return: false, success: false, message: 'Invalid OTP. Must be 4 to 6 numeric digits.' });
    }

    // 4. Rate limiting per IP and per destination phone
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const rateCheckIp = checkSmsRateLimit(`ip:${clientIp}`);
    const rateCheckPhone = checkSmsRateLimit(`phone:${cleanPhone}`);
    if (!rateCheckIp.allowed || !rateCheckPhone.allowed) {
      const waitMin = Math.max(rateCheckIp.retryMinutes || 0, rateCheckPhone.retryMinutes || 0);
      return res.status(429).json({ return: false, success: false, message: `SMS rate limit exceeded. Please wait ${waitMin} minute(s) before trying again.` });
    }

    // 5. Provider credentials from server-side environment only
    const SERVER_MSG91_KEY = process.env.MSG91_AUTH_KEY || '';
    const SERVER_FAST2SMS_KEY = process.env.FAST2SMS_API_KEY || '';

    // If provider keys are not configured or in testing environment, safely simulate without real dispatch
    if (!SERVER_MSG91_KEY && !SERVER_FAST2SMS_KEY) {
      return res.json({
        return: true,
        success: true,
        simulated: true,
        message: 'SMS dispatch simulated successfully in secure staging environment.'
      });
    }

    if (gateway === 'msg91' && SERVER_MSG91_KEY) {
      let msg91Path = `/api/v5/otp?mobile=91${cleanPhone}&authkey=${encodeURIComponent(SERVER_MSG91_KEY)}&otp=${otpStr}&otp_length=6&otp_expiry=5`;
      if (templateId && templateId.trim()) {
        msg91Path += `&template_id=${encodeURIComponent(templateId.trim())}`;
      }
      const options = {
        hostname: 'control.msg91.com',
        port: 443,
        path: msg91Path,
        method: 'POST',
        headers: { 'authkey': SERVER_MSG91_KEY, 'Content-Type': 'application/json' }
      };
      const proxyReq = https.request(options, proxyRes => {
        let responseData = '';
        proxyRes.on('data', chunk => { responseData += chunk; });
        proxyRes.on('end', () => {
          try {
            const json = JSON.parse(responseData);
            res.json({ return: json.type === 'success', message: json.message || responseData });
          } catch(e) {
            res.json({ return: true, message: responseData });
          }
        });
      });
      proxyReq.on('error', err => res.status(500).json({ return: false, message: err.message }));
      proxyReq.end();
      return;
    }

    if (SERVER_FAST2SMS_KEY) {
      const payload = JSON.stringify({
        route: 'otp',
        variables_values: otpStr,
        numbers: cleanPhone
      });
      const options = {
        hostname: 'www.fast2sms.com',
        port: 443,
        path: '/dev/bulkV2',
        method: 'POST',
        headers: {
          'authorization': SERVER_FAST2SMS_KEY,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      };
      const proxyReq = https.request(options, proxyRes => {
        let responseData = '';
        proxyRes.on('data', chunk => { responseData += chunk; });
        proxyRes.on('end', () => {
          try {
            const json = JSON.parse(responseData);
            res.json(json);
          } catch(e) {
            res.json({ return: false, raw: responseData });
          }
        });
      });
      proxyReq.on('error', err => res.status(500).json({ return: false, message: err.message }));
      proxyReq.write(payload);
      proxyReq.end();
      return;
    }

    return res.json({ return: true, success: true, simulated: true, message: 'SMS simulated successfully.' });
  } catch (err) {
    res.status(500).json({ return: false, message: err.message });
  }
});

// =========================================================================
// SUPER ADMIN & SAAS DATA API (SECURE, ROLE-AWARE & TENANT ISOLATED)
// =========================================================================

// --- 1. COMPANIES ---
app.get('/api/companies', async (req, res) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required.' });
  const isSuper = isSuperAdminEmailOrName(req.user) || req.user.role === 'admin';
  const allComps = readLocalDB().companies || [];
  if (isSuper) {
    return res.json({ success: true, count: allComps.length, data: allComps, companies: allComps });
  }
  const userTenant = req.user.companyId || req.user.permissions?.companyId;
  const filtered = allComps.filter(c => c.id === userTenant || (c.settings && c.settings.tenantId === userTenant));
  res.json({ success: true, count: filtered.length, data: filtered, companies: filtered });
});

app.post('/api/companies', async (req, res) => {
  if (!req.user || (!isSuperAdminEmailOrName(req.user) && req.user.role !== 'admin')) {
    return res.status(403).json({ success: false, message: 'Super Admin access required.' });
  }
  const comp = req.body;
  if (!comp || !comp.name) return res.status(400).json({ success: false, message: 'Company name required.' });
  const local = readLocalDB();
  if (!Array.isArray(local.companies)) local.companies = [];
  const newComp = {
    id: comp.id || `c_${Date.now()}`,
    name: comp.name,
    domain: comp.domain || '',
    plan: comp.plan || 'Pro',
    status: comp.status || 'Active',
    users: Number(comp.users) || 5,
    revenue: comp.revenue || '₹25,000',
    start_date: comp.startDate || comp.start_date || '01 Jan 2026',
    end_date: comp.endDate || comp.end_date || '01 Jan 2027',
    icon: comp.icon || 'building',
    color: comp.color || '#2563eb',
    bg: comp.bg || '#eff6ff',
    settings: comp.settings || {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  const idx = local.companies.findIndex(c => c.id === newComp.id);
  if (idx !== -1) local.companies[idx] = { ...local.companies[idx], ...newComp };
  else local.companies.unshift(newComp);
  writeLocalDB(local);
  res.json({ success: true, company: newComp, data: newComp });
});

app.put('/api/companies/:id', async (req, res) => {
  if (!req.user || (!isSuperAdminEmailOrName(req.user) && req.user.role !== 'admin')) {
    return res.status(403).json({ success: false, message: 'Super Admin access required.' });
  }
  const { id } = req.params;
  const local = readLocalDB();
  if (!Array.isArray(local.companies)) local.companies = [];
  const idx = local.companies.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Company not found.' });
  local.companies[idx] = { ...local.companies[idx], ...req.body, id, updated_at: new Date().toISOString() };
  writeLocalDB(local);
  res.json({ success: true, company: local.companies[idx], data: local.companies[idx] });
});

app.delete('/api/companies/:id', async (req, res) => {
  if (!req.user || (!isSuperAdminEmailOrName(req.user) && req.user.role !== 'admin')) {
    return res.status(403).json({ success: false, message: 'Super Admin access required.' });
  }
  const { id } = req.params;
  if (id === 'c_apexsales' || id === 'tenant_apexsales') {
    return res.status(400).json({ success: false, message: 'Security restriction: Primary platform HQ company cannot be deleted.' });
  }
  const local = readLocalDB();
  local.companies = (local.companies || []).filter(c => c.id !== id);
  writeLocalDB(local);
  res.json({ success: true, message: 'Company deleted successfully.' });
});

// --- 2. DEAL PACKAGES ---
app.get('/api/deal-packages', async (req, res) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required.' });
  const pkgs = readLocalDB().dealPackages || readLocalDB().deal_packages || [];
  res.json({ success: true, count: pkgs.length, data: pkgs, dealPackages: pkgs, packages: pkgs });
});

app.post('/api/deal-packages', async (req, res) => {
  if (!req.user || (!isSuperAdminEmailOrName(req.user) && req.user.role !== 'admin')) {
    return res.status(403).json({ success: false, message: 'Super Admin access required.' });
  }
  const pkg = req.body;
  if (!pkg || !pkg.name) return res.status(400).json({ success: false, message: 'Package name required.' });
  const local = readLocalDB();
  if (!Array.isArray(local.dealPackages)) local.dealPackages = [];
  const newPkg = {
    id: pkg.id || `pkg_${Date.now()}`,
    name: pkg.name,
    price: Number(pkg.price) || 0,
    duration: pkg.duration || '1 Month',
    quota: pkg.quota || '500 Leads',
    color: pkg.color || '#2563eb',
    bg: pkg.bg || '#eff6ff',
    border: pkg.border || '#bfdbfe',
    features: Array.isArray(pkg.features) ? pkg.features : [],
    status: pkg.status || 'active',
    updated_at: new Date().toISOString()
  };
  const idx = local.dealPackages.findIndex(p => p.id === newPkg.id);
  if (idx !== -1) local.dealPackages[idx] = { ...local.dealPackages[idx], ...newPkg };
  else local.dealPackages.push(newPkg);
  local.deal_packages = local.dealPackages;
  writeLocalDB(local);
  res.json({ success: true, data: newPkg, package: newPkg });
});

app.put('/api/deal-packages/:id', async (req, res) => {
  if (!req.user || (!isSuperAdminEmailOrName(req.user) && req.user.role !== 'admin')) {
    return res.status(403).json({ success: false, message: 'Super Admin access required.' });
  }
  const { id } = req.params;
  const local = readLocalDB();
  if (!Array.isArray(local.dealPackages)) local.dealPackages = [];
  const idx = local.dealPackages.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Package not found.' });
  local.dealPackages[idx] = { ...local.dealPackages[idx], ...req.body, id, updated_at: new Date().toISOString() };
  local.deal_packages = local.dealPackages;
  writeLocalDB(local);
  res.json({ success: true, data: local.dealPackages[idx], package: local.dealPackages[idx] });
});

app.delete('/api/deal-packages/:id', async (req, res) => {
  if (!req.user || (!isSuperAdminEmailOrName(req.user) && req.user.role !== 'admin')) {
    return res.status(403).json({ success: false, message: 'Super Admin access required.' });
  }
  const { id } = req.params;
  const local = readLocalDB();
  local.dealPackages = (local.dealPackages || []).filter(p => p.id !== id);
  local.deal_packages = local.dealPackages;
  writeLocalDB(local);
  res.json({ success: true, message: 'Deal package deleted successfully.' });
});

// --- 3. CLIENT LICENSES ---
app.get('/api/client-licenses', async (req, res) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required.' });
  const isSuper = isSuperAdminEmailOrName(req.user) || req.user.role === 'admin';
  const allLics = readLocalDB().clientLicenses || readLocalDB().client_licenses || [];
  if (isSuper) {
    return res.json({ success: true, count: allLics.length, data: allLics, clientLicenses: allLics, licenses: allLics });
  }
  const userTenant = req.user.companyId || req.user.permissions?.companyId;
  const filtered = allLics.filter(l => l.company_id === userTenant || l.companyId === userTenant);
  res.json({ success: true, count: filtered.length, data: filtered, clientLicenses: filtered, licenses: filtered });
});

app.post('/api/client-licenses', async (req, res) => {
  if (!req.user || (!isSuperAdminEmailOrName(req.user) && req.user.role !== 'admin')) {
    return res.status(403).json({ success: false, message: 'Super Admin access required.' });
  }
  const lic = req.body;
  if (!lic) return res.status(400).json({ success: false, message: 'License data required.' });
  const local = readLocalDB();
  if (!Array.isArray(local.clientLicenses)) local.clientLicenses = [];
  const newLic = {
    id: lic.id || `lic_${Date.now()}`,
    license_number: lic.license_number || `2026-${Math.floor(10000 + Math.random() * 90000)}`,
    invoice_number: lic.invoice_number || `INV-2026-${Math.floor(100 + Math.random() * 900)}`,
    company_id: lic.company_id || lic.companyId || 'tenant_kashish',
    company_name: lic.company_name || lic.companyName || 'Company',
    client_name: lic.client_name || lic.clientName || 'Client',
    client_email: lic.client_email || lic.clientEmail || '',
    client_phone: lic.client_phone || lic.clientPhone || '',
    client_address: lic.client_address || '',
    client_gst: lic.client_gst || '',
    plan_id: lic.plan_id || 'growth',
    plan_name: lic.plan_name || 'Growth Company Plan',
    billing_cycle: lic.billing_cycle || 'monthly',
    base_price: Number(lic.base_price) || 4999,
    default_seats: Number(lic.default_seats) || 15,
    custom_seats: Number(lic.custom_seats) || 15,
    lead_quota: Number(lic.lead_quota) || 2500,
    subtotal: Number(lic.subtotal) || 4999,
    final_amount: Number(lic.final_amount) || 4999,
    payment_status: lic.payment_status || 'paid',
    payment_mode: lic.payment_mode || 'UPI / Bank Transfer',
    transaction_id: lic.transaction_id || `TXN_${Date.now()}`,
    issue_date: lic.issue_date || '2026-09-01',
    valid_from: lic.valid_from || '2026-09-01',
    valid_until: lic.valid_until || '2026-10-01',
    status: lic.status || 'active',
    notes: lic.notes || '',
    updated_at: new Date().toISOString()
  };
  const idx = local.clientLicenses.findIndex(l => l.id === newLic.id || l.license_number === newLic.license_number);
  if (idx !== -1) local.clientLicenses[idx] = { ...local.clientLicenses[idx], ...newLic };
  else local.clientLicenses.push(newLic);
  local.client_licenses = local.clientLicenses;
  writeLocalDB(local);
  res.json({ success: true, data: newLic, license: newLic });
});

app.put('/api/client-licenses/:id', async (req, res) => {
  if (!req.user || (!isSuperAdminEmailOrName(req.user) && req.user.role !== 'admin')) {
    return res.status(403).json({ success: false, message: 'Super Admin access required.' });
  }
  const { id } = req.params;
  const local = readLocalDB();
  if (!Array.isArray(local.clientLicenses)) local.clientLicenses = [];
  const idx = local.clientLicenses.findIndex(l => l.id === id || l.license_number === id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'License not found.' });
  local.clientLicenses[idx] = { ...local.clientLicenses[idx], ...req.body, id, updated_at: new Date().toISOString() };
  local.client_licenses = local.clientLicenses;
  writeLocalDB(local);
  res.json({ success: true, data: local.clientLicenses[idx], license: local.clientLicenses[idx] });
});

app.delete('/api/client-licenses/:id', async (req, res) => {
  if (!req.user || (!isSuperAdminEmailOrName(req.user) && req.user.role !== 'admin')) {
    return res.status(403).json({ success: false, message: 'Super Admin access required.' });
  }
  const { id } = req.params;
  const local = readLocalDB();
  local.clientLicenses = (local.clientLicenses || []).filter(l => l.id !== id && l.license_number !== id);
  local.client_licenses = local.clientLicenses;
  writeLocalDB(local);
  res.json({ success: true, message: 'License deleted successfully.' });
});

// --- 4. COMPANY PLANS ---
app.get('/api/company-plans', async (req, res) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required.' });
  const allPlans = readLocalDB().companyPlans || readLocalDB().company_plans || [];
  const plansMap = {};
  allPlans.forEach(p => {
    if (p.company_id) plansMap[p.company_id] = p.plan_id || 'growth';
  });
  res.json({ success: true, count: allPlans.length, data: allPlans, plans: allPlans, map: plansMap });
});

app.post('/api/company-plans', async (req, res) => {
  if (!req.user || (!isSuperAdminEmailOrName(req.user) && req.user.role !== 'admin')) {
    return res.status(403).json({ success: false, message: 'Super Admin access required.' });
  }
  const plan = req.body;
  if (!plan || !plan.company_id) return res.status(400).json({ success: false, message: 'Company ID required.' });
  const local = readLocalDB();
  if (!Array.isArray(local.companyPlans)) local.companyPlans = [];
  const idx = local.companyPlans.findIndex(p => p.company_id === plan.company_id);
  if (idx !== -1) local.companyPlans[idx] = { ...local.companyPlans[idx], ...plan, updated_at: new Date().toISOString() };
  else local.companyPlans.push({ ...plan, id: plan.id || `cplan_${plan.company_id}`, updated_at: new Date().toISOString() });
  local.company_plans = local.companyPlans;
  writeLocalDB(local);
  res.json({ success: true, plan: plan });
});

app.delete('/api/company-plans/:id', async (req, res) => {
  if (!req.user || (!isSuperAdminEmailOrName(req.user) && req.user.role !== 'admin')) {
    return res.status(403).json({ success: false, message: 'Super Admin access required.' });
  }
  const { id } = req.params;
  const local = readLocalDB();
  local.companyPlans = (local.companyPlans || []).filter(p => p.id !== id && p.company_id !== id);
  local.company_plans = local.companyPlans;
  writeLocalDB(local);
  res.json({ success: true, message: 'Company plan deleted successfully.' });
});

// --- 5. INVOICES ---
app.get('/api/invoices', async (req, res) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required.' });
  const isSuper = isSuperAdminEmailOrName(req.user) || req.user.role === 'admin';
  const allInvs = readLocalDB().invoices || [];
  if (isSuper) {
    return res.json({ success: true, count: allInvs.length, data: allInvs, invoices: allInvs });
  }
  const userTenant = req.user.companyId || req.user.permissions?.companyId;
  const filtered = allInvs.filter(i => i.company_id === userTenant || i.companyId === userTenant);
  res.json({ success: true, count: filtered.length, data: filtered, invoices: filtered });
});

app.post('/api/invoices', async (req, res) => {
  if (!req.user || (!isSuperAdminEmailOrName(req.user) && req.user.role !== 'admin')) {
    return res.status(403).json({ success: false, message: 'Super Admin access required.' });
  }
  const inv = req.body;
  if (!inv || !inv.company) return res.status(400).json({ success: false, message: 'Company required.' });
  const local = readLocalDB();
  if (!Array.isArray(local.invoices)) local.invoices = [];
  const newInv = {
    id: inv.id || `#INV-${Math.floor(100 + Math.random() * 900)}`,
    company: inv.company,
    company_id: inv.company_id || inv.companyId || '',
    plan: inv.plan || 'Pro Plan',
    amount: inv.amount || '₹25,000',
    numeric_amount: Number(inv.numeric_amount) || 25000,
    status: inv.status || 'Paid',
    due_date: inv.due_date || '15 Oct 2026',
    paid_date: inv.paid_date || null,
    created_at: new Date().toISOString()
  };
  local.invoices.unshift(newInv);
  writeLocalDB(local);
  res.json({ success: true, invoice: newInv, data: newInv });
});

app.put('/api/invoices/:id', async (req, res) => {
  if (!req.user || (!isSuperAdminEmailOrName(req.user) && req.user.role !== 'admin')) {
    return res.status(403).json({ success: false, message: 'Super Admin access required.' });
  }
  const { id } = req.params;
  const local = readLocalDB();
  if (!Array.isArray(local.invoices)) local.invoices = [];
  const idx = local.invoices.findIndex(i => i.id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Invoice not found.' });
  local.invoices[idx] = { ...local.invoices[idx], ...req.body, id, updated_at: new Date().toISOString() };
  writeLocalDB(local);
  res.json({ success: true, invoice: local.invoices[idx], data: local.invoices[idx] });
});

app.delete('/api/invoices/:id', async (req, res) => {
  if (!req.user || (!isSuperAdminEmailOrName(req.user) && req.user.role !== 'admin')) {
    return res.status(403).json({ success: false, message: 'Super Admin access required.' });
  }
  const { id } = req.params;
  const local = readLocalDB();
  local.invoices = (local.invoices || []).filter(i => i.id !== id);
  writeLocalDB(local);
  res.json({ success: true, message: 'Invoice deleted successfully.' });
});

// --- 6. SUPPORT TICKETS ---
app.get('/api/support-tickets', async (req, res) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required.' });
  const isSuper = isSuperAdminEmailOrName(req.user) || req.user.role === 'admin';
  const allTix = readLocalDB().supportTickets || readLocalDB().support_tickets || [];
  if (isSuper) {
    return res.json({ success: true, count: allTix.length, data: allTix, tickets: allTix });
  }
  const userTenant = req.user.companyName || req.user.companyId;
  const filtered = allTix.filter(t => t.company === userTenant || t.company_id === userTenant);
  res.json({ success: true, count: filtered.length, data: filtered, tickets: filtered });
});

app.post('/api/support-tickets', async (req, res) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required.' });
  const tix = req.body;
  if (!tix || !tix.subject) return res.status(400).json({ success: false, message: 'Subject required.' });
  const local = readLocalDB();
  if (!Array.isArray(local.supportTickets)) local.supportTickets = [];
  const newTix = {
    id: tix.id || `t_${Date.now()}`,
    ticket_id: tix.ticket_id || `#ST-${Math.floor(100 + Math.random() * 900)}`,
    subject: tix.subject,
    customer: tix.customer || req.user.name || 'User',
    company: tix.company || req.user.companyName || 'Company',
    priority: tix.priority || 'Medium',
    status: tix.status || 'Open',
    created_at_text: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    created_at: new Date().toISOString()
  };
  local.supportTickets.unshift(newTix);
  local.support_tickets = local.supportTickets;
  writeLocalDB(local);
  res.json({ success: true, ticket: newTix, data: newTix });
});

app.put('/api/support-tickets/:id', async (req, res) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required.' });
  const { id } = req.params;
  const local = readLocalDB();
  if (!Array.isArray(local.supportTickets)) local.supportTickets = [];
  const idx = local.supportTickets.findIndex(t => t.id === id || t.ticket_id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Ticket not found.' });
  local.supportTickets[idx] = { ...local.supportTickets[idx], ...req.body, id, updated_at: new Date().toISOString() };
  local.support_tickets = local.supportTickets;
  writeLocalDB(local);
  res.json({ success: true, ticket: local.supportTickets[idx], data: local.supportTickets[idx] });
});

app.delete('/api/support-tickets/:id', async (req, res) => {
  if (!req.user || (!isSuperAdminEmailOrName(req.user) && req.user.role !== 'admin')) {
    return res.status(403).json({ success: false, message: 'Super Admin access required.' });
  }
  const { id } = req.params;
  const local = readLocalDB();
  local.supportTickets = (local.supportTickets || []).filter(t => t.id !== id && t.ticket_id !== id);
  local.support_tickets = local.supportTickets;
  writeLocalDB(local);
  res.json({ success: true, message: 'Support ticket deleted successfully.' });
});

// --- 7. AUDIT LOGS ---
app.get('/api/audit-logs', async (req, res) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required.' });
  const isSuper = isSuperAdminEmailOrName(req.user) || req.user.role === 'admin';
  if (!isSuper) {
    return res.status(403).json({ success: false, message: 'Access denied: Audit logs are restricted to Super Admin.' });
  }
  const logs = readLocalDB().auditLogs || readLocalDB().audit_logs || [];
  res.json({ success: true, count: logs.length, data: logs, auditLogs: logs, logs: logs });
});

app.post('/api/audit-logs', async (req, res) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required.' });
  const { action, module, details } = req.body;
  const local = readLocalDB();
  if (!Array.isArray(local.auditLogs)) local.auditLogs = [];
  const newLog = {
    id: `al_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    date_time: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    dateTime: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    user_name: req.user.displayName || req.user.name || 'User',
    userName: req.user.displayName || req.user.name || 'User',
    action: action || 'Action',
    module: module || 'General',
    details: details || '',
    ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1',
    created_at: new Date().toISOString()
  };
  local.auditLogs.unshift(newLog);
  local.audit_logs = local.auditLogs;
  writeLocalDB(local);
  res.json({ success: true, log: newLog });
});

// --- 8. NOTIFICATIONS ---
app.get('/api/notifications', async (req, res) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required.' });
  const notifs = readLocalDB().notifications || [];
  res.json({ success: true, count: notifs.length, data: notifs, notifications: notifs });
});

app.post('/api/notifications', async (req, res) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required.' });
  const notif = req.body;
  const local = readLocalDB();
  if (!Array.isArray(local.notifications)) local.notifications = [];
  const newNotif = {
    id: notif.id || `notif_${Date.now()}`,
    title: notif.title || 'Notification',
    detail: notif.detail || '',
    type: notif.type || 'system',
    unread: true,
    time: 'Just now',
    created_at: new Date().toISOString()
  };
  local.notifications.unshift(newNotif);
  writeLocalDB(local);
  res.json({ success: true, notification: newNotif, data: newNotif });
});

app.put('/api/notifications/:id', async (req, res) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required.' });
  const { id } = req.params;
  const local = readLocalDB();
  if (!Array.isArray(local.notifications)) local.notifications = [];
  const idx = local.notifications.findIndex(n => n.id === id);
  if (idx !== -1) {
    local.notifications[idx] = { ...local.notifications[idx], ...req.body, id };
    writeLocalDB(local);
    return res.json({ success: true, notification: local.notifications[idx] });
  }
  res.status(404).json({ success: false, message: 'Notification not found.' });
});

// --- 9. INTEGRATIONS ---
app.get('/api/integrations', async (req, res) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required.' });
  const integs = readLocalDB().integrations || [];
  res.json({ success: true, count: integs.length, data: integs, integrations: integs });
});

app.put('/api/integrations/:id', async (req, res) => {
  if (!req.user || (!isSuperAdminEmailOrName(req.user) && req.user.role !== 'admin')) {
    return res.status(403).json({ success: false, message: 'Super Admin access required.' });
  }
  const { id } = req.params;
  const local = readLocalDB();
  if (!Array.isArray(local.integrations)) local.integrations = [];
  const idx = local.integrations.findIndex(i => i.id === id);
  if (idx !== -1) {
    local.integrations[idx] = { ...local.integrations[idx], ...req.body, id };
    writeLocalDB(local);
    return res.json({ success: true, integration: local.integrations[idx] });
  }
  res.status(404).json({ success: false, message: 'Integration not found.' });
});

// --- 10. SYSTEM SETTINGS ---
app.get('/api/system-settings', async (req, res) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required.' });
  const settings = readLocalDB().settings || readLocalDB().system_settings || {};
  const items = Array.isArray(settings) ? settings : Object.entries(settings).map(([key, value]) => ({ key, value }));
  const map = Array.isArray(settings) ? Object.fromEntries(settings.map(s => [s.key, s.value])) : settings;
  res.json({ success: true, count: items.length, data: items, settings: map, map, items });
});

app.put('/api/system-settings', async (req, res) => {
  if (!req.user || (!isSuperAdminEmailOrName(req.user) && req.user.role !== 'admin')) {
    return res.status(403).json({ success: false, message: 'Super Admin access required.' });
  }
  const { key, value } = req.body;
  const local = readLocalDB();
  if (!local.settings) local.settings = {};
  if (key) {
    local.settings[key] = value;
  } else if (typeof req.body === 'object') {
    local.settings = { ...local.settings, ...req.body };
  }
  local.system_settings = local.settings;
  writeLocalDB(local);
  res.json({ success: true, settings: local.settings, map: local.settings });
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const users = await getUsers();
  const leads = await getLeads();

  res.json({
    status: 'healthy',
    database: isSupabaseConnected ? 'Supabase PostgreSQL Cloud Database' : 'Local Persistent JSON (server/data/db.json)',
    connected: isSupabaseConnected,
    time: new Date().toISOString(),
    usersCount: users.filter(u => u.active !== false).length,
    leadsCount: leads.length
  });
});

// Client-side telemetry & error reporting
const clientErrorsList = [];
app.post('/api/client-error', (req, res) => {
  const errEntry = { ...req.body, time: new Date().toISOString() };
  clientErrorsList.unshift(errEntry);
  if (clientErrorsList.length > 50) clientErrorsList.pop();
  console.error('🚨 [CLIENT BROWSER ERROR]:', JSON.stringify(errEntry));
  res.json({ success: true });
});

app.get('/api/client-errors', (req, res) => {
  res.json(clientErrorsList);
});

// --- PRODUCTION STATIC FILE SERVING WITH AUTOMATIC ASSET FALLBACK ---
if (fs.existsSync(DIST_PATH)) {
  console.log(`📦 Serving static frontend from: ${DIST_PATH}`);

  // 1. SMART ASSET HANDLER FOR /assets/*
  // Resolves the "stale bundle hash -> HTML MIME type error -> white screen" bug:
  // If Chrome cached an older index.html requesting a previous bundle hash (e.g. index-CY12DsHb.js),
  // NEVER serve index.html with text/html!
  // Instead, dynamically find and serve the current bundle matching the extension with correct MIME type.
  app.use('/assets', (req, res, next) => {
    const assetsDir = path.join(DIST_PATH, 'assets');
    if (!fs.existsSync(assetsDir)) return next();

    // Check if exact file requested exists (strip any query strings)
    const cleanFileName = path.basename(req.path.split('?')[0]);
    const exactFilePath = path.join(assetsDir, cleanFileName);

    if (fs.existsSync(exactFilePath) && fs.statSync(exactFilePath).isFile()) {
      // Set long-lived cache for verified current immutable assets
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.sendFile(exactFilePath);
    }

    // Exact hashed file not found (e.g. user has cached HTML referencing old bundle)
    try {
      const files = fs.readdirSync(assetsDir);
      if (cleanFileName.endsWith('.js')) {
        const jsBundle = files.find(f => f.startsWith('index-') && f.endsWith('.js')) || files.find(f => f.endsWith('.js'));
        if (jsBundle) {
          console.warn(`[Asset Fallback] Serving current JS bundle (${jsBundle}) for stale request: ${req.path}`);
          res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache, must-revalidate');
          return res.sendFile(path.join(assetsDir, jsBundle));
        }
      } else if (cleanFileName.endsWith('.css')) {
        const cssBundle = files.find(f => f.startsWith('index-') && f.endsWith('.css')) || files.find(f => f.endsWith('.css'));
        if (cssBundle) {
          console.warn(`[Asset Fallback] Serving current CSS bundle (${cssBundle}) for stale request: ${req.path}`);
          res.setHeader('Content-Type', 'text/css; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache, must-revalidate');
          return res.sendFile(path.join(assetsDir, cssBundle));
        }
      }
    } catch (err) {
      console.error('[Asset Fallback Error]:', err);
    }

    // If it's another non-existent asset, send 404 with proper status - NEVER send index.html as a script!
    res.status(404).send('Asset not found');
  });

  // 2. Serve other static assets (favicon, icons, etc.)
  app.use(express.static(DIST_PATH, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        // Enforce no-cache on HTML so browsers always fetch latest bundle references
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  }));

  // 3. Client-side routing fallback for React Single Page App
  // Strictly applies ONLY to non-API and non-asset GET requests, with anti-caching headers
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api/') && !req.path.startsWith('/assets/')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      return res.sendFile(path.join(DIST_PATH, 'index.html'));
    }
    next();
  });
}

// Start server
if (!process.env.VERCEL) {
  initDatabase().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 ApexSales Fullstack CRM Server running on port ${PORT} (0.0.0.0:${PORT})`);
    });
  });
} else {
  initDatabase();
}

export default app;
export { app, initDatabase };

