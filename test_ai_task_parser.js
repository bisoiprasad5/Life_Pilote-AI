/**
 * LifePilot AI Task Parser Verification Script
 * Validates the complete 4-tier architecture:
 * Frontend/Client -> NestJS (POST /api/ai/task-parser) -> Python FastAPI -> LLM Provider -> Backend Validation -> DB
 */

const { spawn } = require('child_process');
const path = require('path');

const BACKEND_URL = 'http://localhost:4000/api/v1';
const BACKEND_ALT_URL = 'http://localhost:4000/api';
const AI_SERVICE_URL = 'http://localhost:8000';

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkService(url) {
  try {
    const res = await fetch(url);
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('🚀 STEP 10: AI TASK PARSER - COMPLETE ARCHITECTURE TEST');
  console.log('='.repeat(80));

  let pyProc = null;
  let nestProc = null;

  // 1. Ensure Python AI microservice is running
  let pyOnline = await checkService(`${AI_SERVICE_URL}/health`);
  if (!pyOnline) {
    console.log('Starting Python FastAPI AI Microservice on port 8000...');
    pyProc = spawn('python', ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'], {
      cwd: path.resolve(__dirname, 'ai-service'),
      stdio: 'pipe',
    });

    for (let i = 0; i < 20; i++) {
      await wait(500);
      if (await checkService(`${AI_SERVICE_URL}/health`)) {
        pyOnline = true;
        break;
      }
    }
  }

  if (!pyOnline) {
    console.error('❌ Could not start Python AI microservice.');
    process.exit(1);
  }
  console.log('✅ Python AI Microservice is active on ' + AI_SERVICE_URL);

  // 2. Ensure NestJS Backend is running
  let nestOnline = await checkService(`${BACKEND_URL}/health`).catch(() => false);
  if (!nestOnline) {
    // Check if port 4000 responds to anything
    nestOnline = await checkService(`${BACKEND_URL}/ai/providers`).catch(() => false);
  }

  if (!nestOnline) {
    console.log('Starting NestJS Backend Gateway on port 4000...');
    nestProc = spawn('npm', ['run', 'start:prod'], {
      cwd: path.resolve(__dirname, 'backend'),
      stdio: 'pipe',
      shell: true,
    });

    for (let i = 0; i < 30; i++) {
      await wait(500);
      nestOnline = await checkService(`${BACKEND_URL}/ai/providers`).catch(() => false);
      if (nestOnline) break;
    }
  }

  console.log('✅ NestJS Backend Gateway is active on port 4000\n');

  // Track results
  let passed = 0;
  let failed = 0;

  function assert(name, condition, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  try {
    // Test Provider Discovery on NestJS
    console.log('--- Test: Provider Abstraction Discovery ---');
    const provRes = await fetch(`${BACKEND_URL}/ai/providers`);
    const provData = await provRes.json();
    assert('GET /api/v1/ai/providers returns 200', provRes.ok);
    assert('Active provider exists', !!provData.active_provider);

    // Scenario 1: "Remind me to study Java DSA tomorrow at 7 PM for 1 hour."
    console.log('\n--- Scenario 1: Study Java DSA tomorrow at 7 PM for 1 hour ---');
    const s1Res = await fetch(`${BACKEND_ALT_URL}/ai/task-parser`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Remind me to study Java DSA tomorrow at 7 PM for 1 hour.',
        referenceDate: '2026-10-05 12:00:00',
      }),
    });
    const s1Data = await s1Res.json();
    assert('POST /api/ai/task-parser returns 200', s1Res.ok);
    assert('Intent is CREATE_TASK', s1Data.intent === 'CREATE_TASK');
    assert('Task title is "Study Java DSA"', s1Data.task?.title === 'Study Java DSA', s1Data.task?.title);
    assert('Date is tomorrow (2026-10-06)', s1Data.task?.date === '2026-10-06', s1Data.task?.date);
    assert('Time is 19:00', s1Data.task?.time === '19:00', s1Data.task?.time);
    assert('Duration is 60', s1Data.task?.duration === 60, s1Data.task?.duration);
    assert('EndTime is 20:00', s1Data.task?.endTime === '20:00', s1Data.task?.endTime);
    assert('Category is STUDY', s1Data.task?.category === 'STUDY', s1Data.task?.category);

    // Scenario 2: "Study OS for 2 hours tomorrow."
    console.log('\n--- Scenario 2: Study OS for 2 hours tomorrow ---');
    const s2Res = await fetch(`${BACKEND_URL}/ai/task-parser`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Study OS for 2 hours tomorrow.',
        referenceDate: '2026-10-05 12:00:00',
      }),
    });
    const s2Data = await s2Res.json();
    assert('Task title is "Study OS"', s2Data.task?.title === 'Study OS', s2Data.task?.title);
    assert('Duration is 120 minutes', s2Data.task?.duration === 120, s2Data.task?.duration);
    assert('Category is STUDY', s2Data.task?.category === 'STUDY');

    // Scenario 3: "Every Sunday remind me to plan my week."
    console.log('\n--- Scenario 3: Recurrence - Every Sunday plan my week ---');
    const s3Res = await fetch(`${BACKEND_URL}/ai/task-parser`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Every Sunday remind me to plan my week.',
        referenceDate: '2026-10-05 12:00:00',
      }),
    });
    const s3Data = await s3Res.json();
    assert('isRecurring is true', s3Data.task?.isRecurring === true);
    assert('recurrenceInterval is WEEKLY', s3Data.task?.recurrenceInterval === 'WEEKLY');
    assert('recurrenceRule contains BYDAY=SU', s3Data.task?.recurrenceRule?.includes('BYDAY=SU'));

    // Scenario 4: "Submit assignment before Friday 5 PM."
    console.log('\n--- Scenario 4: Deadline - Submit assignment before Friday 5 PM ---');
    const s4Res = await fetch(`${BACKEND_URL}/ai/task-parser`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Submit assignment before Friday 5 PM.',
        referenceDate: '2026-10-05 12:00:00',
      }),
    });
    const s4Data = await s4Res.json();
    assert('Task title is "Submit Assignment"', s4Data.task?.title === 'Submit Assignment');
    assert('Deadline is extracted', !!s4Data.task?.deadline);
    assert('Category is STUDY', s4Data.task?.category === 'STUDY');

    // Scenario 5: User registration + autoCreate: true (Backend Validation & Persistence)
    console.log('\n--- Scenario 5: Authenticated Auto-Create with Backend Validation ---');
    const regRes = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `pilot_ai_${Date.now()}@lifepilot.ai`,
        password: 'Password123!',
        fullName: 'Pilot AI Tester',
      }),
    });
    const regData = await regRes.json();
    const token = regData.token;
    assert('User registered and received JWT', !!token);

    const s5Res = await fetch(`${BACKEND_URL}/ai/task-parser`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        text: 'Gym workout tomorrow morning at 6:30 AM for 45 minutes',
        referenceDate: '2026-10-05 12:00:00',
        autoCreate: true,
      }),
    });
    const s5Data = await s5Res.json();
    assert('autoCreated is true', s5Data.autoCreated === true);
    assert('Task created in database with valid ID', !!s5Data.createdTask?.id);
    assert('DB task category is FITNESS', s5Data.createdTask?.category === 'FITNESS');
    assert('DB task duration is 45', s5Data.createdTask?.estimatedDuration === 45);

    // Scenario 6: Backend Validation Security: Prompt Injection / Malicious Input
    console.log('\n--- Scenario 6: Backend Validation & Sanitization Security ---');
    const s6Res = await fetch(`${BACKEND_URL}/ai/task-parser`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: '<script>alert(1)</script>Study Algorithms tomorrow at 10 AM',
        referenceDate: '2026-10-05 12:00:00',
      }),
    });
    const s6Data = await s6Res.json();
    assert('Script tags stripped by backend sanitizer', !s6Data.task?.title.includes('<script>'));
    assert('Category safely inferred as STUDY', s6Data.task?.category === 'STUDY');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    if (pyProc) pyProc.kill();
    if (nestProc) nestProc.kill();
  }

  console.log('\n' + '='.repeat(80));
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('='.repeat(80));

  if (failed > 0) process.exit(1);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
