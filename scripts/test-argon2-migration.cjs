const fs = require('fs');
const crypto = require('crypto');

async function testArgon2Migration() {
  console.log('========================================================================');
  console.log('TESTING ARGON2ID CREDENTIAL MIGRATION & LEGACY AUTO-UPGRADE');
  console.log('========================================================================\n');

  const tokenRes = await fetch('http://localhost:5000/api/auth/demo?role=admin');
  const { token } = await tokenRes.json();
  const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };

  // 1. Create a user with a known legacy password
  const testEmail = 'argon2_test_' + Date.now() + '@apexsales.com';
  const createRes = await fetch('http://localhost:5000/api/users', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'Argon2 Test User',
      email: testEmail,
      role: 'sales_rep',
      pin: 'SecretPass123!'
    })
  });
  const createData = await createRes.json();
  const userId = createData.user?.id;
  console.log('1. User created with password directly: ID =', userId);

  // Check stored hash starts with Argon2id prefix
  const db1 = JSON.parse(fs.readFileSync('server/data/db.json', 'utf8'));
  const storedUser1 = db1.users.find(u => u.id === userId);
  const isDirectArgon = storedUser1.pin.startsWith('$argon2id$');
  console.log('2. Stored credential format starts with Argon2id prefix:', isDirectArgon);

  // Test authenticating against Argon2id
  const loginRes1 = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'SecretPass123!' })
  });
  const loginData1 = await loginRes1.json();
  console.log('3. Login with Argon2id hash succeeded:', loginData1.success);

  // Test negative authentication with wrong password
  const badLogin = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'WrongPassword999!' })
  });
  console.log('4. Bad password correctly rejected (401):', badLogin.status === 401);

  // 5. Test Legacy Account Auto-Upgrade:
  // Artificially inject a legacy salted SHA-256 hash into this user account
  const salt = 'apexsales_crm_salt_2026_x7k9';
  const legacySha256 = crypto.createHash('sha256').update('LegacyPassword456!' + salt).digest('hex');
  
  storedUser1.pin = legacySha256;
  fs.writeFileSync('server/data/db.json', JSON.stringify(db1, null, 2));
  console.log('5. Injected legacy 64-char SHA-256 hash: length =', storedUser1.pin.length);

  // Authenticate with legacy password
  const loginRes2 = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'LegacyPassword456!' })
  });
  const loginData2 = await loginRes2.json();
  console.log('6. Legacy SHA-256 account logged in successfully:', loginData2.success);

  // Wait a tick for async file save
  await new Promise(r => setTimeout(r, 200));

  // Check that the database record was automatically upgraded to Argon2id
  const db2 = JSON.parse(fs.readFileSync('server/data/db.json', 'utf8'));
  const storedUser2 = db2.users.find(u => u.id === userId);
  const upgradedToArgon = storedUser2.pin.startsWith('$argon2id$');
  console.log('7. Legacy account automatically upgraded to Argon2id format:', upgradedToArgon);

  // Authenticate again to prove Argon2id verifier works on the upgraded credential
  const loginRes3 = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'LegacyPassword456!' })
  });
  const loginData3 = await loginRes3.json();
  console.log('8. Re-authenticated successfully against newly upgraded Argon2id hash:', loginData3.success);

  // Clean up test user
  await fetch('http://localhost:5000/api/users/' + userId, { method: 'DELETE', headers });
  console.log('9. Cleaned up disposable test user.');

  console.log('\n========================================================================');
  const allPassed = isDirectArgon && loginData1.success && (badLogin.status === 401) && loginData2.success && upgradedToArgon && loginData3.success;
  console.log('ARGON2ID MIGRATION TEST RESULT:', allPassed ? '✅ VERIFIED PASS' : '❌ FAILED');
  console.log('========================================================================');
}

testArgon2Migration();
