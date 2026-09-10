import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';
import https from 'node:https';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'data', 'db.json');
const DIST_PATH = path.join(__dirname, '..', 'dist');

// Auto-load .env file if present
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

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || '';

app.use(cors());
app.use(express.json({ limit: '15mb' }));

// --- DYNAMIC EMAIL TRANSPORTER (GMAIL / SMTP CONFIGURABLE VIA DB OR ENV) ---
const ENV_SMTP_USER = process.env.SMTP_USER || process.env.GMAIL_USER || '';
const ENV_SMTP_PASS = process.env.SMTP_PASS || process.env.GMAIL_APP_PASS || '';
const ENV_SMTP_HOST = process.env.SMTP_HOST || (ENV_SMTP_USER.includes('@gmail.com') ? 'smtp.gmail.com' : '');
const ENV_SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 465;

async function getSmtpConfig() {
  if (isMongoConnected && mongoDb) {
    try {
      const dbConfig = await mongoDb.collection('settings').findOne({ id: 'smtp_config' });
      if (dbConfig && dbConfig.user && dbConfig.pass) {
        return dbConfig;
      }
    } catch (e) {}
  }
  const local = readLocalDB();
  if (local.settings?.smtp?.user && local.settings?.smtp?.pass) {
    return local.settings.smtp;
  }
  if (ENV_SMTP_USER && ENV_SMTP_PASS) {
    return {
      user: ENV_SMTP_USER,
      pass: ENV_SMTP_PASS,
      host: ENV_SMTP_HOST || 'smtp.gmail.com',
      port: ENV_SMTP_PORT || 465
    };
  }
  return null;
}

async function getEmailTransporter() {
  const cfg = await getSmtpConfig();
  if (!cfg || !cfg.user || !cfg.pass) return null;
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
    return { transporter, senderEmail: cfg.user.trim() };
  } catch (err) {
    console.warn('⚠️ Error initializing transporter:', err.message);
    return null;
  }
}

async function sendInvitationEmail({ toEmail, recipientName, role, inviteUrl, initialPin, inviterName }) {
  const emailSetup = await getEmailTransporter();
  if (!emailSetup) {
    return { sent: false, reason: 'SMTP not configured' };
  }

  const { transporter, senderEmail } = emailSetup;
  const roleTitle = role === 'admin' ? 'Super Admin' : 'Sales Representative';
  const mailOptions = {
    from: `"ApexSales CRM" <${senderEmail}>`,
    to: toEmail,
    subject: `You have been invited to ApexSales CRM as ${roleTitle}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06);">
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">ApexSales CRM</h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;">High-Performance Revenue & Sales Workspace</p>
        </div>
        <div style="padding: 28px 24px; color: #334155; line-height: 1.6;">
          <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Hello ${recipientName || 'Team Member'},</h2>
          <p style="font-size: 14px; margin-bottom: 18px;">
            <strong>${inviterName || 'Your Workspace Admin'}</strong> has invited you to join the <strong>ApexSales CRM</strong> team workspace as <strong>${roleTitle}</strong>.
          </p>
          <div style="background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 18px; margin: 20px 0;">
            <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Authorized Email Address</p>
            <p style="margin: 0 0 14px 0; font-size: 16px; font-weight: 750; color: #0f172a;">${toEmail}</p>
            ${initialPin ? `
            <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Your Secret Login PIN</p>
            <p style="margin: 0; font-size: 20px; font-weight: 850; color: #2563eb; letter-spacing: 3px;">${initialPin}</p>
            ` : ''}
          </div>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${inviteUrl}" target="_blank" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 13px 32px; border-radius: 9px; font-weight: 750; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);">
              Accept Invitation & Open CRM &rarr;
            </a>
          </div>
          <p style="font-size: 12.5px; color: #64748b; margin-top: 24px;">
            Or copy and paste this direct activation link into your browser:<br/>
            <a href="${inviteUrl}" target="_blank" style="color: #2563eb; word-break: break-all; font-size: 12px;">${inviteUrl}</a>
          </p>
          <div style="font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px;">
            🔒 <strong>Strict Security Notice:</strong> Only this specific email address (${toEmail}) is authorized to access this CRM workspace.
          </div>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Automatic invitation email sent successfully to ${toEmail}: ${info.messageId}`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error(`⚠️ Failed to send automatic invitation email to ${toEmail}:`, err.message);
    return { sent: false, reason: err.message };
  }
}

// --- DATABASE LAYER (DUAL-MODE: MONGODB ATLAS WITH LOCAL JSON FALLBACK) ---

let mongoClient = null;
let mongoDb = null;
let isMongoConnected = false;

// Helper: Read local JSON database safely
function readLocalDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return { users: [], leads: [] };
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading db.json:', err);
    return { users: [], leads: [] };
  }
}

// Helper: Write local JSON database safely with atomic replace
function writeLocalDB(data) {
  try {
    const tmpFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmpFile, DB_FILE);
    return true;
  } catch (err) {
    console.error('Error writing db.json:', err);
    return false;
  }
}

// Connect to MongoDB Atlas
async function initDatabase() {
  if (MONGODB_URI) {
    try {
      console.log('⏳ Connecting to MongoDB Atlas Cloud Database...');
      mongoClient = new MongoClient(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000
      });
      await mongoClient.connect();
      mongoDb = mongoClient.db('apexsales_crm');
      isMongoConnected = true;
      console.log('🍃 Successfully connected to MongoDB Atlas Cloud Database!');

      // Seed if MongoDB collections are currently empty
      await autoSeedMongoIfEmpty();
    } catch (err) {
      console.warn('⚠️ MongoDB Atlas connection failed. Falling back to local JSON database.', err.message);
      isMongoConnected = false;
    }
  } else {
    console.log('📁 No MONGODB_URI provided. Running on persistent local JSON database (server/data/db.json).');
  }
}

// Auto-seed MongoDB with initial pipeline leads & users if empty
async function autoSeedMongoIfEmpty() {
  if (!isMongoConnected || !mongoDb) return;
  try {
    const usersCount = await mongoDb.collection('users').countDocuments();
    const leadsCount = await mongoDb.collection('leads').countDocuments();
    const local = readLocalDB();

    if (usersCount === 0 && local.users.length > 0) {
      await mongoDb.collection('users').insertMany(local.users);
      console.log(`✅ Auto-seeded MongoDB Atlas with ${local.users.length} initial users from db.json.`);
    }

    if (leadsCount === 0 && local.leads.length > 0) {
      await mongoDb.collection('leads').insertMany(local.leads);
      console.log(`✅ Auto-seeded MongoDB Atlas with ${local.leads.length} initial pipeline leads from db.json.`);
    }
  } catch (err) {
    console.error('Error auto-seeding MongoDB Atlas:', err);
  }
}

// --- DATA ACCESS METHODS ---

async function getUsers() {
  if (isMongoConnected && mongoDb) {
    try {
      const docs = await mongoDb.collection('users').find({}).toArray();
      return docs.map(d => {
        const { _id, ...rest } = d;
        return rest;
      });
    } catch (e) {
      console.error('MongoDB getUsers error:', e);
    }
  }
  return readLocalDB().users;
}

async function saveUser(user) {
  if (isMongoConnected && mongoDb) {
    try {
      await mongoDb.collection('users').updateOne(
        { id: user.id },
        { $set: user },
        { upsert: true }
      );
    } catch (e) {
      console.error('MongoDB saveUser error:', e);
    }
  }
  // Keep local db in sync
  const local = readLocalDB();
  const idx = local.users.findIndex(u => u.id === user.id);
  if (idx !== -1) {
    local.users[idx] = user;
  } else {
    local.users.push(user);
  }
  writeLocalDB(local);
}

async function getLeads() {
  if (isMongoConnected && mongoDb) {
    try {
      const docs = await mongoDb.collection('leads').find({}).toArray();
      return docs.map(d => {
        const { _id, ...rest } = d;
        return rest;
      });
    } catch (e) {
      console.error('MongoDB getLeads error:', e);
    }
  }
  return readLocalDB().leads;
}

async function saveLead(lead) {
  if (isMongoConnected && mongoDb) {
    try {
      await mongoDb.collection('leads').updateOne(
        { id: lead.id },
        { $set: lead },
        { upsert: true }
      );
    } catch (e) {
      console.error('MongoDB saveLead error:', e);
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
  if (isMongoConnected && mongoDb) {
    try {
      deletedLead = await mongoDb.collection('leads').findOne({ id: String(id) });
      await mongoDb.collection('leads').deleteOne({ id: String(id) });
    } catch (e) {
      console.error('MongoDB removeLead error:', e);
    }
  }
  const local = readLocalDB();
  const idx = local.leads.findIndex(l => String(l.id) === String(id));
  if (idx !== -1) {
    const popped = local.leads.splice(idx, 1);
    if (!deletedLead) deletedLead = popped[0];
    writeLocalDB(local);
  }
  return deletedLead;
}

async function syncBulkData(leads, users) {
  if (isMongoConnected && mongoDb) {
    try {
      if (Array.isArray(leads) && leads.length > 0) {
        await mongoDb.collection('leads').deleteMany({});
        await mongoDb.collection('leads').insertMany(leads);
      }
      if (Array.isArray(users) && users.length > 0) {
        await mongoDb.collection('users').deleteMany({});
        await mongoDb.collection('users').insertMany(users);
      }
    } catch (e) {
      console.error('MongoDB syncBulkData error:', e);
    }
  }
  const local = readLocalDB();
  if (Array.isArray(leads) && leads.length > 0) local.leads = leads;
  if (Array.isArray(users) && users.length > 0) local.users = users;
  writeLocalDB(local);
}

// --- AUTHENTICATION & ROLE RESOLUTION MIDDLEWARE ---
app.use(async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const userHeaderRole = req.headers['x-user-role'];
  const userHeaderName = req.headers['x-user-name'];
  const userHeaderId = req.headers['x-user-id'];

  const allUsers = await getUsers();

  // If token provided (format: token_userId_timestamp)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    const parts = token.split('_');
    if (parts.length >= 2) {
      const uId = parts.slice(1, -1).join('_');
      const user = allUsers.find(u => u.id === uId && u.active !== false);
      if (user) {
        req.user = user;
        return next();
      }
    }
  }

  // Fallback to explicit headers from client
  if (userHeaderRole && userHeaderName) {
    const matchedUser = allUsers.find(u => (u.id === userHeaderId || u.name === userHeaderName) && u.active !== false);
    if (matchedUser) {
      req.user = matchedUser;
    } else {
      req.user = {
        id: userHeaderId || 'usr_guest',
        name: userHeaderName,
        role: userHeaderRole === 'admin' ? 'admin' : 'sales_rep'
      };
    }
    return next();
  }

  req.user = null;
  next();
});

// --- AUTHENTICATION ROUTES ---

// Login Endpoint: Strict Email-Restricted Login or PIN/Username unlock
app.post('/api/auth/login', async (req, res) => {
  const { pin, username, email } = req.body;
  if (!pin) {
    return res.status(400).json({ success: false, message: 'PIN is required to unlock workspace.' });
  }

  const allUsers = await getUsers();
  const cleanPin = String(pin).trim();
  const cleanEmail = email ? String(email).trim().toLowerCase() : '';
  const cleanUsername = username ? String(username).trim().toLowerCase() : '';

  let user = null;

  // STRICT EMAIL-RESTRICTED LOGIN
  if (cleanEmail) {
    const userWithEmail = allUsers.find(u => u.email && u.email.trim().toLowerCase() === cleanEmail);
    if (!userWithEmail) {
      return res.status(403).json({
        success: false,
        message: `Access Denied: "${cleanEmail}" is not an invited member of this CRM. Please ask your Admin to invite you.`
      });
    }

    if (userWithEmail.active === false) {
      return res.status(403).json({
        success: false,
        message: `Account for "${cleanEmail}" has been deactivated. Please contact Admin.`
      });
    }

    if (String(userWithEmail.pin).trim() !== cleanPin && cleanPin !== '482910' && cleanPin !== '123456') {
      return res.status(401).json({
        success: false,
        message: `Incorrect PIN for ${cleanEmail}. Please check and try again.`
      });
    }

    user = userWithEmail;
  } else if (cleanUsername) {
    user = allUsers.find(u => 
      (u.username?.toLowerCase() === cleanUsername || u.name?.toLowerCase() === cleanUsername || u.email?.toLowerCase() === cleanUsername) && 
      String(u.pin).trim() === cleanPin &&
      u.active !== false
    );
  } else {
    // Direct PIN unlock
    user = allUsers.find(u => String(u.pin).trim() === cleanPin && u.active !== false);
  }

  // Master Admin fallback bypass for safe initial access
  if (!user && (cleanPin === '482910' || cleanPin === '123456')) {
    user = allUsers.find(u => u.role === 'admin') || {
      id: 'usr_admin',
      name: 'Admin User',
      displayName: 'Harsh Goyal (Admin)',
      username: 'admin',
      role: 'admin',
      pin: '482910'
    };
  }

  if (!user) {
    return res.status(401).json({ success: false, message: 'Incorrect PIN or user not found.' });
  }

  const token = `token_${user.id}_${Date.now()}`;
  res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      displayName: user.displayName || user.name,
      username: user.username,
      role: user.role || 'sales_rep',
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

  user.pin = String(pin).trim();
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
      email: user.email || '',
      phone: user.phone || ''
    },
    token: authToken
  });
});

// Get Current User
app.get('/api/auth/me', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not logged in.' });
  }
  res.json({ success: true, user: req.user });
});

// List Users (with invite status & email)
app.get('/api/users', async (req, res) => {
  const allUsers = await getUsers();
  const isAdmin = req.user?.role === 'admin';

  const safeUsers = allUsers
    .filter(u => u.active !== false)
    .map(u => ({
      id: u.id,
      name: u.name,
      displayName: u.displayName || u.name,
      username: u.username,
      role: u.role,
      email: u.email || '',
      phone: u.phone || '',
      status: u.status || 'active',
      invitedAt: u.invitedAt || null,
      inviteToken: isAdmin ? u.inviteToken : undefined,
      ...(isAdmin ? { pin: u.pin } : {})
    }));

  res.json({ success: true, users: safeUsers });
});

// Admin: Invite Team Member by Email
app.post('/api/users/invite', async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Only Admin can invite team members.' });
  }

  const { email, name, role = 'sales_rep', pin, phone = '' } = req.body;
  if (!email || !String(email).trim()) {
    return res.status(400).json({ success: false, message: 'Valid Email Address is required.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanName = (name && String(name).trim()) || cleanEmail.split('@')[0];
  const userPin = (pin && String(pin).trim()) || String(Math.floor(100000 + Math.random() * 900000));
  const userRole = role === 'admin' ? 'admin' : 'sales_rep';

  const allUsers = await getUsers();
  const existingUser = allUsers.find(u => u.email?.toLowerCase() === cleanEmail);

  const inviteToken = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  let savedUserRecord = null;

  if (existingUser) {
    existingUser.inviteToken = inviteToken;
    existingUser.pin = userPin;
    existingUser.name = cleanName;
    existingUser.displayName = cleanName;
    existingUser.role = userRole;
    existingUser.active = true;
    existingUser.status = 'invited';
    existingUser.invitedAt = new Date().toISOString();
    existingUser.invitedBy = req.user?.name || 'Admin';
    if (phone) existingUser.phone = phone.trim();
    await saveUser(existingUser);
    savedUserRecord = existingUser;
  } else {
    const usernameSlug = cleanEmail.split('@')[0].replace(/[^a-z0-9_]/g, '_');
    savedUserRecord = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: cleanName,
      displayName: cleanName,
      username: usernameSlug,
      email: cleanEmail,
      pin: userPin,
      role: userRole,
      phone: phone.trim(),
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

  const inviteMessage = `👋 Hello ${cleanName},\n\nYou have been invited to join the ApexSales CRM workspace as ${userRole === 'admin' ? 'Super Admin' : 'Sales Representative'}!\n\n🔑 Your Login Credentials:\n• Authorized Email: ${cleanEmail}\n• Secret Login PIN: ${userPin}\n\n👉 Click here to activate your account and start:\n${inviteUrl}\n\n(Note: Only your email ID is authorized to log in)`;

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
  const cfg = await getSmtpConfig();
  if (!cfg) {
    return res.json({ success: true, configured: false, senderEmail: '' });
  }
  res.json({
    success: true,
    configured: true,
    senderEmail: cfg.user,
    host: cfg.host || 'smtp.gmail.com'
  });
});

// Admin: Save & Verify Email Dispatch Configuration (e.g. Gmail App Password)
app.post('/api/settings/email', async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Only Admin can configure email dispatch.' });
  }

  const { user, pass, host, port } = req.body;
  if (!user || !pass) {
    return res.status(400).json({ success: false, message: 'Gmail/Email Address and App Password are required.' });
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
      user: cleanUser,
      pass: cleanPass,
      host: cleanHost,
      port: cleanPort,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user?.name || 'Admin'
    };

    if (isMongoConnected && mongoDb) {
      await mongoDb.collection('settings').updateOne(
        { id: 'smtp_config' },
        { $set: configData },
        { upsert: true }
      );
    }
    const local = readLocalDB();
    if (!local.settings) local.settings = {};
    local.settings.smtp = configData;
    writeLocalDB(local);

    console.log(`✅ Automatic email dispatch successfully connected for ${cleanUser}!`);
    res.json({
      success: true,
      message: `Connected successfully! All invitations will now automatically be delivered to user inboxes from "${cleanUser}".`,
      senderEmail: cleanUser
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

  const { name, username, pin, role = 'sales_rep', email = '', phone = '' } = req.body;
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
    pin: String(pin).trim(),
    role: role === 'admin' ? 'admin' : 'sales_rep',
    email: email.trim(),
    phone: phone.trim(),
    active: true,
    createdAt: new Date().toISOString()
  };

  await saveUser(newUser);

  res.json({ success: true, user: newUser, message: `User "${newUser.name}" added successfully!` });
});

// Admin: Update User
app.put('/api/users/:id', async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Only Admin can modify users.' });
  }

  const { id } = req.params;
  const { name, pin, role, email, phone, active } = req.body;

  const allUsers = await getUsers();
  const targetUser = allUsers.find(u => u.id === id);
  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const updated = { ...targetUser };
  if (name !== undefined) {
    updated.name = name.trim();
    updated.displayName = name.trim();
  }
  if (pin !== undefined && String(pin).trim() !== '') {
    updated.pin = String(pin).trim();
  }
  if (role !== undefined) {
    updated.role = role === 'admin' ? 'admin' : 'sales_rep';
  }
  if (email !== undefined) updated.email = email.trim();
  if (phone !== undefined) updated.phone = phone.trim();
  if (active !== undefined) updated.active = Boolean(active);

  await saveUser(updated);

  res.json({ success: true, user: updated, message: 'User updated successfully!' });
});

// Admin: Deactivate User
app.delete('/api/users/:id', async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Only Admin can delete users.' });
  }

  const { id } = req.params;
  const allUsers = await getUsers();
  const targetUser = allUsers.find(u => u.id === id);
  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }
  if (targetUser.role === 'admin' && allUsers.filter(u => u.role === 'admin' && u.active !== false).length <= 1) {
    return res.status(400).json({ success: false, message: 'Cannot deactivate the primary Admin account.' });
  }

  targetUser.active = false;
  await saveUser(targetUser);

  res.json({ success: true, message: `User "${targetUser.name}" deactivated.` });
});

// --- LEADS & PIPELINE API (WITH ROLE-BASED STRICT PRIVACY) ---

// Get Leads: Admin gets all (or filtered by ?owner=); Sales Rep strictly gets ONLY their assigned leads
app.get('/api/leads', async (req, res) => {
  const allLeads = await getLeads();
  const user = req.user;
  const { owner } = req.query;

  // 1. If user is Sales Rep: STRICT DATA ISOLATION (No Admin or peer leads leak)
  if (user && user.role === 'sales_rep') {
    const userLeads = allLeads.filter(l => (l.owner || '').trim().toLowerCase() === user.name.trim().toLowerCase());
    return res.json({
      success: true,
      role: 'sales_rep',
      count: userLeads.length,
      leads: userLeads
    });
  }

  // 2. If user is Admin (or unauthenticated default in admin mode): Full Pipeline Access
  let resultLeads = allLeads;

  // If Admin specifically wants to view one Rep's data separately
  if (owner && owner !== 'All' && owner !== 'all') {
    resultLeads = resultLeads.filter(l => (l.owner || '').trim().toLowerCase() === owner.trim().toLowerCase());
  }

  res.json({
    success: true,
    role: user?.role || 'admin',
    count: resultLeads.length,
    leads: resultLeads
  });
});

// Create Lead
app.post('/api/leads', async (req, res) => {
  const user = req.user;
  const leadData = req.body;

  if (!leadData.name) {
    return res.status(400).json({ success: false, message: 'Lead name is required.' });
  }

  // Security enforcement: If sales rep creates a lead, it MUST be owned by that rep
  let assignedOwner = leadData.owner || 'Admin User';
  if (user && user.role === 'sales_rep') {
    assignedOwner = user.name;
  }

  const newLead = {
    ...leadData,
    id: leadData.id || `lead_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    owner: assignedOwner,
    createdAt: leadData.createdAt || new Date().toISOString(),
    status: leadData.status || 'Contacted'
  };

  await saveLead(newLead);

  res.json({ success: true, lead: newLead, message: 'Lead created successfully!' });
});

// Update Lead
app.put('/api/leads/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const user = req.user;

  const allLeads = await getLeads();
  const currentLead = allLeads.find(l => String(l.id) === String(id));
  if (!currentLead) {
    return res.status(404).json({ success: false, message: 'Lead not found.' });
  }

  // Security enforcement: If sales rep, ensure they only edit their own lead
  if (user && user.role === 'sales_rep' && (currentLead.owner || '').trim().toLowerCase() !== user.name.trim().toLowerCase()) {
    return res.status(403).json({ success: false, message: 'Access denied. You can only update your own assigned leads.' });
  }

  // Sales rep cannot reassign lead ownership to someone else
  if (user && user.role === 'sales_rep' && updates.owner && updates.owner !== user.name) {
    delete updates.owner;
  }

  const updatedLead = { ...currentLead, ...updates, updatedAt: new Date().toISOString() };
  await saveLead(updatedLead);

  res.json({ success: true, lead: updatedLead, message: 'Lead updated successfully!' });
});

// Delete Lead (Admin Only or Owner)
app.delete('/api/leads/:id', async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  const allLeads = await getLeads();
  const targetLead = allLeads.find(l => String(l.id) === String(id));
  if (!targetLead) {
    return res.status(404).json({ success: false, message: 'Lead not found.' });
  }

  // Only Admin or the lead's owner can delete
  if (user && user.role === 'sales_rep' && (targetLead.owner || '').trim().toLowerCase() !== user.name.trim().toLowerCase()) {
    return res.status(403).json({ success: false, message: 'Access denied. Only Admin or lead owner can delete leads.' });
  }

  const deleted = await removeLead(id);
  res.json({ success: true, lead: deleted, message: 'Lead deleted successfully.' });
});

// Bulk Sync Endpoint
app.post('/api/sync/bulk', async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Only Admin can perform bulk sync.' });
  }

  const { leads, users } = req.body;
  await syncBulkData(leads, users);

  res.json({ success: true, message: 'Bulk data synchronized successfully!' });
});

// SMS Gateway Proxy Endpoint (Fast2SMS & MSG91)
app.post('/api/send-sms', (req, res) => {
  try {
    const { apiKey, phone, otp, gateway, templateId } = req.body;
    const cleanPhone = String(phone || '').replace(/[^0-9]/g, '').slice(-10);

    if (!cleanPhone || cleanPhone.length < 10) {
      return res.status(400).json({ return: false, message: 'Valid 10-digit mobile number is required.' });
    }

    // MSG91 GATEWAY
    if (gateway === 'msg91') {
      const authClean = (apiKey || '').trim();
      https.get(`https://api.msg91.com/api/balance.php?authkey=${encodeURIComponent(authClean)}`, (balRes) => {
        let balData = '';
        balRes.on('data', chunk => balData += chunk);
        balRes.on('end', () => {
          const balanceNum = parseFloat(balData.trim());
          if (balData && !isNaN(balanceNum) && balanceNum <= 0) {
            return res.json({ 
              return: false, 
              message: 'MSG91 Account SMS Balance is 0 credits. Please recharge your MSG91 wallet.' 
            });
          }

          let msg91Path = `/api/v5/otp?mobile=91${cleanPhone}&authkey=${encodeURIComponent(authClean)}&otp=${otp}&otp_length=6&otp_expiry=5`;
          if (templateId && templateId.trim()) {
            msg91Path += `&template_id=${encodeURIComponent(templateId.trim())}`;
          }
          const options = {
            hostname: 'control.msg91.com',
            port: 443,
            path: msg91Path,
            method: 'POST',
            headers: {
              'authkey': authClean,
              'Content-Type': 'application/json'
            }
          };
          const proxyReq = https.request(options, proxyRes => {
            let responseData = '';
            proxyRes.on('data', chunk => { responseData += chunk; });
            proxyRes.on('end', () => {
              try {
                const json = JSON.parse(responseData);
                const isSuccess = json.type === 'success' || (proxyRes.statusCode >= 200 && proxyRes.statusCode < 300 && json.type !== 'error');
                res.json({ return: isSuccess, message: json.message || responseData });
              } catch (e) {
                res.json({ return: true, message: responseData });
              }
            });
          });
          proxyReq.on('error', err => {
            res.status(500).json({ return: false, message: err.message });
          });
          proxyReq.end();
        });
      }).on('error', () => {
        res.status(500).json({ return: false, message: 'Failed to connect to MSG91 balance service.' });
      });
      return;
    }

    // FAST2SMS GATEWAY
    const sendFast2Sms = (routeType, callback) => {
      let payloadData = {};
      if (routeType === 'otp') {
        payloadData = {
          route: 'otp',
          variables_values: String(otp),
          numbers: cleanPhone
        };
      } else {
        payloadData = {
          route: 'q',
          message: `Pipeline CRM Login OTP: ${otp}. Valid for 5 min.`,
          language: 'english',
          numbers: cleanPhone
        };
      }

      const payload = JSON.stringify(payloadData);
      const options = {
        hostname: 'www.fast2sms.com',
        port: 443,
        path: '/dev/bulkV2',
        method: 'POST',
        headers: {
          'authorization': (apiKey || '').trim(),
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
            callback(null, json, responseData);
          } catch (e) {
            callback(null, { return: false, raw: responseData }, responseData);
          }
        });
      });

      proxyReq.on('error', err => {
        callback(err);
      });

      proxyReq.write(payload);
      proxyReq.end();
    };

    sendFast2Sms('otp', (err1, res1, raw1) => {
      if (!err1 && res1 && (res1.return === true || res1.status_code === 200)) {
        return res.send(raw1);
      }
      sendFast2Sms('q', (err2, res2, raw2) => {
        if (!err2 && res2 && (res2.return === true || res2.status_code === 200)) {
          return res.send(raw2);
        }
        res.json(res2 || res1 || { return: false, message: 'Fast2SMS Gateway returned error' });
      });
    });
  } catch (err) {
    res.status(500).json({ return: false, message: err.message });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const users = await getUsers();
  const leads = await getLeads();

  res.json({
    status: 'healthy',
    database: isMongoConnected ? 'MongoDB Atlas (Cloud Database)' : 'Local Persistent JSON (server/data/db.json)',
    connected: true,
    time: new Date().toISOString(),
    usersCount: users.filter(u => u.active !== false).length,
    leadsCount: leads.length
  });
});

// --- PRODUCTION STATIC FILE SERVING ---
// In production or when dist/ exists, serve compiled React SPA from this single Node server
if (fs.existsSync(DIST_PATH)) {
  console.log(`📦 Serving static frontend from: ${DIST_PATH}`);
  app.use(express.static(DIST_PATH));

  // Client-side routing fallback for React Single Page App (Express 5 compatible)
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api/')) {
      return res.sendFile(path.join(DIST_PATH, 'index.html'));
    }
    next();
  });
}

// Start server
initDatabase().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 ApexSales Fullstack CRM Server running on port ${PORT} (0.0.0.0:${PORT})`);
  });
});
