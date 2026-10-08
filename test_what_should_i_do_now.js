/**
 * LifePilot Verification Suite
 * STEP 12: "What should I do now?" - AI Planner & Dynamic Action Pipeline Test
 *
 * Validates the complete 9-step planning flow:
 * 1. Current user time
 * 2. Today's schedule
 * 3. Pending tasks
 * 4. Deadlines
 * 5. Priorities
 * 6. Available time
 * 7. Relevant habits/study goals
 * 8. Detect conflicts
 * 9. Ask AI planner for best next action
 *
 * Verifies Return Structure:
 * - Recommended task
 * - Reason
 * - Estimated duration
 * - Priority
 * - Next task
 *
 * Verifies Safety Constraint:
 * - Do not create or modify tasks automatically unless the user confirms.
 */

const { spawn } = require('child_process');
const path = require('path');

const BACKEND_URL = 'http://localhost:4000/api/v1';
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
  console.log('🚀 STEP 12: "What should I do now?" - VERIFICATION TEST SUITE');
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

  if (!nestOnline) {
    console.log('Trying backend start dev...');
    nestProc = spawn('npm', ['run', 'start'], {
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
    // -------------------------------------------------------------------------
    // TEST 1: Register and Authenticate User
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Authentication & User Setup ---');
    const userPayload = {
      email: `pilot_step12_${Date.now()}@lifepilot.io`,
      password: 'SecurePassword123!',
      fullName: 'Alex Vance',
    };

    const regRes = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userPayload),
    });
    const regData = await regRes.json();
    assert('User registered successfully', regRes.ok && regData.token);
    const token = regData.token;
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // -------------------------------------------------------------------------
    // TEST 2: Seed Schedule (45 minutes available until next event)
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 2: Seed Today's Calendar Schedule (Next Event in 45 Mins) ---");
    const now = new Date();
    // Schedule event 45 minutes from now
    const eventStart = new Date(now.getTime() + 45 * 60 * 1000);
    const eventEnd = new Date(now.getTime() + 105 * 60 * 1000);

    const eventRes = await fetch(`${BACKEND_URL}/calendar/events`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Team Architecture Standup & Sync',
        startTime: eventStart.toISOString(),
        endTime: eventEnd.toISOString(),
        category: 'WORK',
      }),
    });
    const eventData = await eventRes.json();
    assert('Created upcoming calendar event in 45 mins', eventRes.ok && eventData.success);

    // -------------------------------------------------------------------------
    // TEST 3: Seed Pending Tasks with Priorities and Deadlines
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Seed Pending Tasks (Java DSA task & Backlog items) ---');
    // Task A: High priority Java DSA task, 30 min duration, deadline tonight
    const taskARes = await fetch(`${BACKEND_URL}/tasks`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Complete your pending Java DSA task',
        description: 'Implement balance factors and AVL rotations on Binary Search Tree',
        priority: 'HIGH',
        category: 'STUDY',
        estimatedMinutes: 30,
        deadline: new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString(),
      }),
    });
    const taskAData = await taskARes.json();
    assert('Created Java DSA task (HIGH priority, 30 min duration)', taskARes.ok && taskAData.success);
    const dsaTaskId = taskAData.data.id;

    // Task B: Low priority task, 90 mins (does not fit 45 min window)
    const taskBRes = await fetch(`${BACKEND_URL}/tasks`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Organize desk drawers and archive receipts',
        priority: 'LOW',
        category: 'PERSONAL',
        estimatedMinutes: 90,
      }),
    });
    const taskBData = await taskBRes.json();
    assert('Created low priority task (90 min duration)', taskBRes.ok && taskBData.success);

    // -------------------------------------------------------------------------
    // TEST 4: Execute STEP 12: "What should I do now?" Pipeline
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Execute "What should I do now?" Endpoint (POST /api/v1/ai/what-to-do-now) ---');
    const planRes = await fetch(`${BACKEND_URL}/ai/what-to-do-now`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        currentTime: now.toISOString(),
        timezone: 'UTC',
      }),
    });
    const plan = await planRes.json();
    if (!planRes.ok) {
      console.error('Plan request returned error:', planRes.status, plan);
    }
    assert('Endpoint returned HTTP 200 OK', planRes.ok);
    assert('Response success flag is true', plan.success === true);

    console.log('\n  [Returned AI Plan Details]:');
    console.log('  -------------------------------------------------------------');
    console.log(`  ⏱️ Available Time:     ${plan.availableTimeFormatted} (${plan.availableTimeMinutes} mins)`);
    console.log(`  🎯 Recommended Task:   ${plan.recommendedTask?.title}`);
    console.log(`  ⚡ Priority:           ${plan.priority || plan.recommendedTask?.priority}`);
    console.log(`  ⏳ Estimated Duration: ${plan.estimatedDuration || plan.recommendedTask?.estimatedDuration}`);
    console.log(`  💡 Reason:             ${plan.reason}`);
    console.log(`  ⏭️ Next Task:          ${plan.nextTask?.title} (${plan.nextTask?.estimatedDuration})`);
    console.log('  -------------------------------------------------------------');

    // Assert Return Specifications
    assert('1. Calculated Available Time corresponds to 45 min window', plan.availableTimeMinutes >= 40 && plan.availableTimeMinutes <= 50);
    assert('2. Available time statement formatted correctly', plan.availableTimeFormatted.includes('available'));
    assert('3. Recommended Task is Java DSA task', plan.recommendedTask?.title?.includes('Java DSA'));
    assert('4. Recommended Task has HIGH priority', plan.priority === 'HIGH' || plan.recommendedTask?.priority === 'HIGH');
    assert('5. Estimated duration is 30 minutes', (plan.estimatedDuration || '').includes('30') || (plan.recommendedTask?.estimatedDuration || '').includes('30'));
    assert('6. Meaningful AI reason provided', typeof plan.reason === 'string' && plan.reason.length > 20);
    assert('7. Next Task is provided with duration', Boolean(plan.nextTask?.title && plan.nextTask?.estimatedDuration));

    // -------------------------------------------------------------------------
    // TEST 5: Verify Safety Rule (No automatic task mutations)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Verify Safety Constraint (Tasks NOT modified automatically) ---');
    assert('Safety guarantee flag autoMutated === false', plan.autoMutated === false);

    // Verify task in DB remains in TODO status
    const verifyTaskRes = await fetch(`${BACKEND_URL}/tasks/${dsaTaskId}`, {
      headers: authHeaders,
    });
    const verifyTaskData = await verifyTaskRes.json();
    assert('Java DSA task is STILL in TODO status in database', verifyTaskData.data?.status === 'TODO');

    // -------------------------------------------------------------------------
    // TEST 6: Explicit User Confirmation Action
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: User Confirms Task Completion ---');
    const completeRes = await fetch(`${BACKEND_URL}/tasks/${dsaTaskId}/complete`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ completed: true }),
    });
    const completeData = await completeRes.json();
    assert(
      'Task updated to COMPLETED only after explicit user confirmation',
      completeRes.ok && completeData.data?.status === 'COMPLETED',
    );

    // -------------------------------------------------------------------------
    // TEST 7: AI Service Direct Endpoint (/api/v1/planner/what-to-do-now)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: AI Microservice Direct Planning Endpoint ---');
    const directRes = await fetch(`${AI_SERVICE_URL}/api/v1/planner/what-to-do-now`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentUserTime: now.toISOString(),
        availableTimeMinutes: 45,
        pendingTasks: [
          {
            title: 'Complete your pending Java DSA task',
            priority: 'HIGH',
            estimatedDuration: 30,
            category: 'STUDY',
          },
        ],
        schedule: [],
      }),
    });
    const directData = await directRes.json();
    assert('Direct AI microservice endpoint returned 200 OK', directRes.ok && directData.success);
    assert('Direct AI returned Java DSA recommendation', directData.recommendedTask?.title?.includes('Java DSA'));
    assert('Direct AI returned summaryText matching required format', directData.summaryText?.includes('You have 45 minutes available'));

  } catch (error) {
    console.error('❌ Exception occurred during test run:', error);
    failed++;
  } finally {
    if (pyProc) pyProc.kill();
    if (nestProc) nestProc.kill();
  }

  console.log('\n' + '='.repeat(80));
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('='.repeat(80));

  if (failed === 0) {
    console.log('🎉 ALL STEP 12 TESTS PASSED WITH 100% SUCCESS!');
    process.exit(0);
  } else {
    console.error('❌ SOME TESTS FAILED.');
    process.exit(1);
  }
}

main();
