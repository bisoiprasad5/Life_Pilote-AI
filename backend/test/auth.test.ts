import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

interface TestResult {
  testName: string;
  passed: boolean;
  details?: string;
}

async function runTests() {
  console.log('🚀 Bootstrapping NestJS Auth Test Suite...\n');

  const app = await NestFactory.create(AppModule, { logger: false });
  app.use(cookieParser());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.setGlobalPrefix('api/v1');

  const port = 4055;
  await app.listen(port);
  const baseUrl = `http://localhost:${port}/api/v1`;

  const results: TestResult[] = [];

  function record(name: string, passed: boolean, details?: string) {
    results.push({ testName: name, passed, details });
    if (passed) {
      console.log(`  ✅ PASS: ${name}`);
    } else {
      console.error(`  ❌ FAIL: ${name} - ${details}`);
    }
  }

  const testUser = {
    email: `test_${Date.now()}@lifepilot.ai`,
    password: 'Password123!',
    fullName: 'Test Pilot User',
  };

  let sessionCookie = '';
  let bearerToken = '';

  try {
    // TEST 1: Unauthorized Request
    console.log('\n--- 1. Testing Unauthorized Request ---');
    const unauthRes = await fetch(`${baseUrl}/auth/me`);
    const unauthBody = await unauthRes.json();
    record(
      'Unauthorized request to protected /auth/me returns 401',
      unauthRes.status === 401 && unauthBody.success === false,
      `Status: ${unauthRes.status}`,
    );

    // TEST 2: Invalid Input Validation (Short password)
    console.log('\n--- 2. Testing Input Validation ---');
    const invalidDtoRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid-email',
        password: '123', // less than 8 chars
        fullName: 'A',
      }),
    });
    record(
      'Invalid registration payload returns 400 Bad Request',
      invalidDtoRes.status === 400,
      `Status: ${invalidDtoRes.status}`,
    );

    // TEST 3: User Registration
    console.log('\n--- 3. Testing User Registration ---');
    const registerRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });
    const regCookieHeader = registerRes.headers.get('set-cookie');
    const registerData = await registerRes.json();

    const hasCookie = !!regCookieHeader && regCookieHeader.includes('lifepilot_session');
    const isHttpOnly = !!regCookieHeader && regCookieHeader.includes('HttpOnly');
    const noPasswordLeak = registerData.user && registerData.user.passwordHash === undefined;

    record(
      'User registration returns 201 Created and user profile',
      registerRes.status === 201 && registerData.success === true,
      `Status: ${registerRes.status}`,
    );
    record(
      'Registration sets secure HTTP-Only cookie',
      hasCookie && isHttpOnly,
      `Cookie header: ${regCookieHeader}`,
    );
    record(
      'Password hash is never exposed to client in registration response',
      noPasswordLeak,
      `User object keys: ${Object.keys(registerData.user || {}).join(', ')}`,
    );

    // TEST 4: Duplicate Email Registration
    console.log('\n--- 4. Testing Duplicate Email Conflict ---');
    const dupRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });
    record(
      'Duplicate email returns 409 Conflict',
      dupRes.status === 409,
      `Status: ${dupRes.status}`,
    );

    // TEST 5: Invalid Credentials Login
    console.log('\n--- 5. Testing Invalid Credentials ---');
    const wrongPassRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: 'WrongPassword!',
      }),
    });
    record(
      'Login with incorrect password returns 401 Unauthorized',
      wrongPassRes.status === 401,
      `Status: ${wrongPassRes.status}`,
    );

    const nonExistentRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nobody@nowhere.com',
        password: 'Password123!',
      }),
    });
    record(
      'Login with nonexistent email returns 401 Unauthorized',
      nonExistentRes.status === 401,
      `Status: ${nonExistentRes.status}`,
    );

    // TEST 6: Successful Login
    console.log('\n--- 6. Testing Successful Login ---');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password,
      }),
    });
    const loginCookieHeader = loginRes.headers.get('set-cookie');
    const loginData = await loginRes.json();

    if (loginCookieHeader) {
      sessionCookie = loginCookieHeader.split(';')[0];
    }
    bearerToken = loginData.token;

    record(
      'Successful login returns 200 OK and sets session cookie',
      loginRes.status === 200 &&
        loginData.success === true &&
        !!sessionCookie &&
        loginData.user.email === testUser.email,
      `Status: ${loginRes.status}`,
    );

    // TEST 7: Protected API with Session Cookie
    console.log('\n--- 7. Testing Protected API via Cookie ---');
    const meWithCookieRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Cookie: sessionCookie },
    });
    const meData = await meWithCookieRes.json();
    record(
      'Protected /auth/me returns current user when HTTP-Only cookie is provided',
      meWithCookieRes.status === 200 &&
        meData.success === true &&
        meData.user.email === testUser.email,
      `Status: ${meWithCookieRes.status}, Email: ${meData.user?.email}`,
    );

    // TEST 8: Protected API with Bearer Token fallback
    console.log('\n--- 8. Testing Protected API via Bearer Header ---');
    const meWithBearerRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${bearerToken}` },
    });
    record(
      'Protected /auth/me returns current user when Bearer token header is provided',
      meWithBearerRes.status === 200,
      `Status: ${meWithBearerRes.status}`,
    );

    // TEST 9: User Profile Retrieval & Update
    console.log('\n--- 9. Testing Profile & Preferences Management ---');
    const profileRes = await fetch(`${baseUrl}/auth/profile`, {
      headers: { Cookie: sessionCookie },
    });
    const profileData = await profileRes.json();
    record(
      'Get profile returns user details and default preferences',
      profileRes.status === 200 && !!profileData.profile?.preference,
      `Preference present: ${!!profileData.profile?.preference}`,
    );

    const updateProfileRes = await fetch(`${baseUrl}/auth/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        fullName: 'Captain Pilot Senior',
        energyLevel: 5,
        timezone: 'America/New_York',
        dailyWaterTargetMl: 3000,
      }),
    });
    const updatedData = await updateProfileRes.json();
    record(
      'Update profile modifies fullName and preferences',
      updateProfileRes.status === 200 &&
        updatedData.profile.fullName === 'Captain Pilot Senior' &&
        updatedData.profile.preference.energyLevel === 5 &&
        updatedData.profile.preference.dailyWaterTargetMl === 3000,
      `Updated Name: ${updatedData.profile?.fullName}, Energy: ${updatedData.profile?.preference?.energyLevel}`,
    );

    // TEST 10: Forgot Password & Password Reset Flow
    console.log('\n--- 10. Testing Forgot Password & Reset Flow ---');
    const forgotRes = await fetch(`${baseUrl}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUser.email }),
    });
    const forgotData = await forgotRes.json();
    const resetToken = forgotData.resetToken;

    record(
      'Forgot password endpoint generates secure reset token',
      forgotRes.status === 200 && !!resetToken,
      `Token generated: ${!!resetToken}`,
    );

    const newPassword = 'NewSecretPassword2026!';
    const resetRes = await fetch(`${baseUrl}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: resetToken,
        newPassword,
      }),
    });
    record(
      'Reset password succeeds with valid reset token',
      resetRes.status === 200,
      `Status: ${resetRes.status}`,
    );

    // Verify old password no longer works
    const oldLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password,
      }),
    });
    record(
      'Old password is successfully revoked (returns 401)',
      oldLoginRes.status === 401,
      `Status: ${oldLoginRes.status}`,
    );

    // Verify new password works
    const newLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: newPassword,
      }),
    });
    record(
      'New password logs in successfully (returns 200)',
      newLoginRes.status === 200,
      `Status: ${newLoginRes.status}`,
    );

    // TEST 11: Logout
    console.log('\n--- 11. Testing Logout ---');
    const logoutRes = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
    });
    const logoutCookieHeader = logoutRes.headers.get('set-cookie');
    const cleared =
      !!logoutCookieHeader &&
      (logoutCookieHeader.includes('Max-Age=0') ||
        logoutCookieHeader.includes('Expires=Thu, 01 Jan 1970'));

    record(
      'Logout successfully invalidates session cookie',
      logoutRes.status === 200 && cleared,
      `Set-Cookie: ${logoutCookieHeader}`,
    );
  } catch (err: any) {
    console.error('Test execution error:', err);
    record('Suite runtime without crashes', false, err.message);
  } finally {
    await app.close();
  }

  // Summary
  console.log('\n========================================');
  console.log('       AUTH TEST SUITE SUMMARY          ');
  console.log('========================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log(`Total tests: ${total}`);
  console.log(`Passed:      ${passed}`);
  console.log(`Failed:      ${failed}`);

  if (failed > 0) {
    console.error('\n⚠️ Some tests failed. Please review above logs.');
    process.exit(1);
  } else {
    console.log('\n🎉 ALL 14 AUTHENTICATION TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  }
}

runTests();
