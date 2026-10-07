const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zgndrkgnldrwhcypdhjt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnbmRya2dubGRyd2hjeXBkaGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDU4MjYsImV4cCI6MjEwNTYyMTgyNn0.KfB_zXo1btSfbF6WaCvOdlc4kMyvNSQPvAcadMPhZ1o';

const anonSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const SERVER_URL = 'http://127.0.0.1:5000';

async function runAttackTests() {
  console.log('====================================================');
  console.log('STEP 3: SECURITY ATTACK TEST SUITE');
  console.log('====================================================\n');

  const results = {};

  // ---------------------------------------------------------------
  // TEST 1: CURRENT VULNERABILITY REPRODUCTION (SUPABASE DIRECT RPC)
  // Unauthenticated client + p_admin_id = 'usr_admin'
  // ---------------------------------------------------------------
  console.log('--- TEST 1: Supabase Direct RPC Vulnerability (p_admin_id spoofing) ---');
  try {
    const probeId = `probe_attack_${Date.now()}`;
    const { data: spoofRes, error: spoofErr } = await anonSupabase.rpc('superadmin_manage_user', {
      p_admin_id: 'usr_admin',
      p_action: 'create',
      p_user: {
        id: probeId,
        name: 'Attacker Impersonating Admin',
        role: 'sales_rep',
        active: true
      }
    });

    if (spoofRes && spoofRes.success === true) {
      results['1. Supabase Direct RPC Spoofing'] = {
        vulnerable: true,
        detail: 'CONFIRMED VULNERABLE: Direct RPC accepts p_admin_id="usr_admin" without token and creates user!'
      };
      // Clean up
      await anonSupabase.rpc('superadmin_manage_user', {
        p_admin_id: 'usr_admin',
        p_action: 'delete',
        p_user: { id: probeId }
      });
    } else {
      results['1. Supabase Direct RPC Spoofing'] = {
        vulnerable: false,
        detail: `Blocked: ${JSON.stringify(spoofRes || spoofErr)}`
      };
    }
  } catch (e) {
    results['1. Supabase Direct RPC Spoofing'] = { vulnerable: false, detail: e.message };
  }

  // ---------------------------------------------------------------
  // TEST 2: SERVER ENDPOINT WITHOUT TOKEN (ATTEMPTING SUPER ADMIN)
  // Request to server.js PUT /api/packages with NO token
  // ---------------------------------------------------------------
  console.log('\n--- TEST 2: Express Server - Request with NO token ---');
  try {
    const res = await fetch(`${SERVER_URL}/api/packages`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealPackages: [], employeePackages: [] })
    });
    const data = await res.json();
    results['2. Server Request Without Token'] = {
      blocked: res.status === 403,
      status: res.status,
      detail: data.message
    };
  } catch (e) {
    results['2. Server Request Without Token'] = { blocked: false, detail: e.message };
  }

  // ---------------------------------------------------------------
  // TEST 3: SERVER ENDPOINT WITH RANDOM / INVALID TOKEN
  // ---------------------------------------------------------------
  console.log('\n--- TEST 3: Express Server - Request with RANDOM token ---');
  try {
    const res = await fetch(`${SERVER_URL}/api/packages`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer random_garbage_token_12345'
      },
      body: JSON.stringify({ dealPackages: [], employeePackages: [] })
    });
    const data = await res.json();
    results['3. Server Request With Random Token'] = {
      blocked: res.status === 403,
      status: res.status,
      detail: data.message
    };
  } catch (e) {
    results['3. Server Request With Random Token'] = { blocked: false, detail: e.message };
  }

  // ---------------------------------------------------------------
  // TEST 4: SERVER ENDPOINT WITH TAMPERED / MODIFIED TOKEN PAYLOAD
  // Create an employee token, tamper the payload to say 'admin'
  // ---------------------------------------------------------------
  console.log('\n--- TEST 4: Express Server - Tampered Payload Token ---');
  try {
    // A fake forged token where payload is altered without valid HMAC
    const fakePayload = Buffer.from('usr_rohan:admin:' + Date.now()).toString('base64url');
    const fakeToken = `${fakePayload}.invalid_signature_hash`;
    const res = await fetch(`${SERVER_URL}/api/packages`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${fakeToken}`
      },
      body: JSON.stringify({ dealPackages: [], employeePackages: [] })
    });
    const data = await res.json();
    results['4. Server Request With Tampered Token'] = {
      blocked: res.status === 403,
      status: res.status,
      detail: data.message
    };
  } catch (e) {
    results['4. Server Request With Tampered Token'] = { blocked: false, detail: e.message };
  }

  // ---------------------------------------------------------------
  // TEST 5: EMPLOYEE TOKEN ATTEMPTING SUPER ADMIN ACTION
  // Log in as employee (e.g. rohan), get genuine employee token, attempt Super Admin PUT /api/packages
  // ---------------------------------------------------------------
  console.log('\n--- TEST 5: Express Server - Valid Employee Token attempting Super Admin action ---');
  try {
    const loginRes = await fetch(`${SERVER_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'rohan_verma', pin: '123456' })
    });
    const loginData = await loginRes.json();
    if (loginData.success && loginData.token) {
      const empToken = loginData.token;
      // Now attempt Super Admin endpoint
      const pkgRes = await fetch(`${SERVER_URL}/api/packages`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${empToken}`
        },
        body: JSON.stringify({ dealPackages: [], employeePackages: [] })
      });
      const pkgData = await pkgRes.json();
      results['5. Employee Token on Super Admin Endpoint'] = {
        blocked: pkgRes.status === 403,
        status: pkgRes.status,
        detail: pkgData.message
      };
    } else {
      results['5. Employee Token on Super Admin Endpoint'] = {
        blocked: true,
        detail: 'Could not log in as employee for test: ' + loginData.message
      };
    }
  } catch (e) {
    results['5. Employee Token on Super Admin Endpoint'] = { blocked: false, detail: e.message };
  }

  // ---------------------------------------------------------------
  // TEST 6: VALID SUPER ADMIN WITH GENUINE HMAC TOKEN
  // Log in as Super Admin, get genuine HMAC token, test authorized action
  // ---------------------------------------------------------------
  console.log('\n--- TEST 6: Express Server - Valid Super Admin with genuine HMAC token ---');
  try {
    const saLoginRes = await fetch(`${SERVER_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', pin: '123456' })
    });
    const saLoginData = await saLoginRes.json();
    if (saLoginData.success && saLoginData.token) {
      const saToken = saLoginData.token;
      const getPkgRes = await fetch(`${SERVER_URL}/api/packages`, {
        headers: { 'Authorization': `Bearer ${saToken}` }
      });
      const getPkgData = await getPkgRes.json();
      results['6. Valid Super Admin with Genuine Token'] = {
        allowed: getPkgRes.status === 200 && getPkgData.success === true,
        status: getPkgRes.status,
        detail: 'Authorized successfully as ' + saLoginData.user.name
      };
    } else {
      results['6. Valid Super Admin with Genuine Token'] = {
        allowed: false,
        detail: 'Could not log in as admin: ' + saLoginData.message
      };
    }
  } catch (e) {
    results['6. Valid Super Admin with Genuine Token'] = { allowed: false, detail: e.message };
  }

  console.log('\n====================================================');
  console.log('ATTACK TEST RESULTS SUMMARY:');
  console.log('====================================================');
  console.log(JSON.stringify(results, null, 2));
}

runAttackTests();
