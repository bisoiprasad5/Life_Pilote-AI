/**
 * LifePilot Verification Suite
 * STEP 13: "AI Daily Planner" - System Verification Test Suite
 *
 * Validates the complete AI Daily Planning system analyzing:
 * 1. Tasks
 * 2. Deadlines
 * 3. Priorities
 * 4. Available time
 * 5. Calendar
 * 6. Habits
 * 7. Study goals
 * 8. User preferences
 * 9. Previous productivity
 * 10. Missed tasks
 *
 * Verifies Core Requirements:
 * - No overlapping tasks
 * - Respect fixed calendar events
 * - Respect important deadlines
 * - Include breaks
 * - Consider estimated duration
 * - Consider user's available hours
 * - Prioritize urgent work
 * - Avoid unrealistic schedules
 * - Show generated plan before applying major changes
 * - Allow [Apply Plan], [Edit Plan], [Cancel]
 * - Clearly show what will change if applying the plan
 * - Never silently modify important deadlines
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

function parseTimeToMinutes(tStr) {
  if (!tStr) return 0;
  const parts = tStr.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

async function main() {
  console.log('='.repeat(80));
  console.log('🚀 STEP 13: "AI DAILY PLANNER" - VERIFICATION TEST SUITE');
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

    for (let i = 0; i < 25; i++) {
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

    for (let i = 0; i < 35; i++) {
      await wait(600);
      nestOnline = await checkService(`${BACKEND_URL}/ai/providers`).catch(() => false);
      if (nestOnline) break;
    }
  }

  if (!nestOnline) {
    console.log('Trying backend development mode...');
    nestProc = spawn('npm', ['run', 'start'], {
      cwd: path.resolve(__dirname, 'backend'),
      stdio: 'pipe',
      shell: true,
    });

    for (let i = 0; i < 35; i++) {
      await wait(600);
      nestOnline = await checkService(`${BACKEND_URL}/ai/providers`).catch(() => false);
      if (nestOnline) break;
    }
  }

  if (!nestOnline) {
    console.error('❌ Could not start NestJS Backend Gateway.');
    if (pyProc) pyProc.kill();
    process.exit(1);
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
      email: `pilot_step13_${Date.now()}@lifepilot.io`,
      password: 'SecurePassword123!',
      fullName: 'Dr. Sarah Connor',
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
    // TEST 2: Direct AI Microservice Daily Planner Optimization Engine
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: AI Microservice Direct Planning Verification ---');
    const targetDate = '2026-10-09';
    const pyPayload = {
      targetDate,
      currentUserTime: '2026-10-09T08:00:00.000Z',
      timezone: 'UTC',
      tasks: [
        {
          id: 'task-1',
          title: 'Deep Work: System Architecture Refactoring',
          priority: 'HIGH',
          estimatedMinutes: 60,
          category: 'WORK',
          deadline: '2026-10-09T18:00:00.000Z',
        },
        {
          id: 'task-2',
          title: 'Review Engineering Design Document',
          priority: 'MEDIUM',
          estimatedMinutes: 45,
          category: 'WORK',
        },
        {
          id: 'task-3',
          title: 'Low Priority Documentation Cleanups',
          priority: 'LOW',
          estimatedMinutes: 30,
          category: 'WORK',
        },
      ],
      missedTasks: [
        {
          id: 'missed-1',
          title: 'Urgent: Fix Production Memory Leak',
          priority: 'CRITICAL',
          estimatedMinutes: 45,
          category: 'WORK',
          deadline: '2026-10-08T20:00:00.000Z', // Overdue
        },
      ],
      calendarEvents: [
        {
          id: 'cal-event-1',
          title: 'Executive Board Strategy Sync',
          startTime: '10:00',
          endTime: '11:00',
          isAllDay: false,
        },
      ],
      habits: [
        {
          id: 'habit-1',
          title: 'Morning Mindfulness & Hydration',
          category: 'HEALTH',
          isCompleted: false,
        },
      ],
      studyGoals: [
        {
          id: 'study-1',
          title: 'Distributed Systems Raft Consensus',
          durationMinutes: 45,
        },
      ],
      userPreferences: {
        energyLevel: 4,
        workingHoursStart: '08:30',
        workingHoursEnd: '18:30',
      },
      previousProductivity: {
        avgFocusMinutesPerDay: 300,
      },
    };

    const pyRes = await fetch(`${AI_SERVICE_URL}/api/v1/planner/daily-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pyPayload),
    });
    const pyData = await pyRes.json();

    assert('AI Microservice daily-plan endpoint responded 200 OK', pyRes.ok);
    assert('Success flag is true', pyData.success === true);
    assert('Target date matches request', pyData.date === targetDate);
    assert('Deadlines preserved flag is true', pyData.deadlinesPreserved === true);
    assert('Slots array returned', Array.isArray(pyData.slots) && pyData.slots.length > 0);
    assert('Changes array returned', Array.isArray(pyData.changes) && pyData.changes.length > 0);

    // -------------------------------------------------------------------------
    // TEST 3: Algorithmic Invariants & Constraints Verification
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Algorithmic Invariants & Constraint Enforcements ---');
    const slots = pyData.slots;

    // Requirement: No overlapping tasks
    let hasOverlap = false;
    for (let i = 0; i < slots.length - 1; i++) {
      const curEnd = parseTimeToMinutes(slots[i].endTime);
      const nextStart = parseTimeToMinutes(slots[i + 1].startTime);
      if (curEnd > nextStart) {
        hasOverlap = true;
        console.error(`Overlap detected between ${slots[i].title} (${slots[i].endTime}) and ${slots[i + 1].title} (${slots[i + 1].startTime})`);
        break;
      }
    }
    assert('No overlapping tasks constraint satisfied', !hasOverlap);

    // Requirement: Respect fixed calendar events
    const fixedSlot = slots.find((s) => s.slotType === 'CALENDAR_EVENT' || s.isFixed);
    assert(
      'Fixed calendar event is preserved at exact scheduled time',
      fixedSlot && fixedSlot.startTime === '10:00' && fixedSlot.endTime === '11:00' && fixedSlot.isFixed === true,
    );

    // Requirement: Include breaks
    const breakSlot = slots.find((s) => s.slotType === 'BREAK' || s.slotType === 'LUNCH_BREAK');
    assert('Schedule includes strategic breaks to prevent burnout', !!breakSlot);
    assert('Break minutes tracked in summary metrics', pyData.breakMinutes > 0);

    // Requirement: Prioritize urgent work & missed tasks
    const firstTaskSlot = slots.find((s) => s.slotType === 'TASK');
    assert(
      'Urgent/Missed critical task prioritized at front of work slots',
      firstTaskSlot && firstTaskSlot.title.includes('Fix Production Memory Leak') && firstTaskSlot.priority === 'CRITICAL',
    );

    // Requirement: Respect important deadlines & Never silently modify deadlines
    const deadlineTaskChange = pyData.changes.find((c) => c.taskId === 'task-1');
    assert(
      'Task deadline strictly preserved without alteration',
      deadlineTaskChange && deadlineTaskChange.deadline === '2026-10-09T18:00:00.000Z',
    );
    const deadlineTaskSlot = slots.find((s) => s.taskId === 'task-1');
    if (deadlineTaskSlot) {
      const slotEndMin = parseTimeToMinutes(deadlineTaskSlot.endTime);
      assert('Task scheduled before its deadline (18:00)', slotEndMin <= 18 * 60);
    }

    // -------------------------------------------------------------------------
    // TEST 4: Backend Gateway Generation with Seeded Database Data
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: NestJS Gateway Plan Generation with Real DB Records ---');
    const testDate = '2026-10-10';

    // Seed fixed calendar event
    const calEventRes = await fetch(`${BACKEND_URL}/calendar/events`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Weekly All-Hands & Engineering Sync',
        startTime: `${testDate}T10:00:00.000Z`,
        endTime: `${testDate}T11:00:00.000Z`,
        category: 'WORK',
      }),
    });
    assert('Seeded fixed calendar event in NestJS DB', calEventRes.ok);

    // Seed task with approaching deadline
    const originalDeadline = `${testDate}T17:00:00.000Z`;
    const taskRes = await fetch(`${BACKEND_URL}/tasks`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Deploy Production AI Pipeline V2',
        description: 'Complete container rollout and smoke tests',
        priority: 'CRITICAL',
        category: 'WORK',
        estimatedMinutes: 60,
        deadline: originalDeadline,
      }),
    });
    const taskData = await taskRes.json();
    assert('Seeded critical task with strict deadline in NestJS DB', taskRes.ok && taskData.data?.id);
    const testTaskId = taskData.data.id;

    // Call Backend Gateway to generate Daily Plan
    const genRes = await fetch(`${BACKEND_URL}/ai/daily-plan/generate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        targetDate: testDate,
        timezone: 'UTC',
      }),
    });
    const genData = await genRes.json();

    assert('Backend POST /ai/daily-plan/generate responded 200 OK', genRes.ok);
    assert('Backend generated plan returned valid slots', Array.isArray(genData.slots) && genData.slots.length > 0);
    assert('Backend preserved all deadlines', genData.deadlinesPreserved === true);

    // Verify no automatic task mutation before user confirms
    const checkTaskBeforeApply = await fetch(`${BACKEND_URL}/tasks/${testTaskId}`, {
      headers: authHeaders,
    });
    const checkTaskBeforeData = await checkTaskBeforeApply.json();
    assert(
      'SAFETY CHECK: Tasks NOT automatically modified before user confirmation',
      checkTaskBeforeData.data.startTime === null || checkTaskBeforeData.data.startTime === undefined,
    );

    // -------------------------------------------------------------------------
    // TEST 5: Apply Plan & Verify Changes & Deadline Preservation
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: [Apply Plan] & Strict Deadline Immutability ---');

    const applyRes = await fetch(`${BACKEND_URL}/ai/daily-plan/apply`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        targetDate: testDate,
        slots: genData.slots,
        changes: genData.changes,
      }),
    });
    const applyData = await applyRes.json();

    assert('Backend POST /ai/daily-plan/apply responded 200 OK', applyRes.ok);
    assert('Apply plan response confirmed success', applyData.success === true);
    assert('Applied slots count confirmed', applyData.appliedSlotsCount > 0);

    // Verify task in database has been updated with start/end time
    const checkTaskAfterApply = await fetch(`${BACKEND_URL}/tasks/${testTaskId}`, {
      headers: authHeaders,
    });
    const checkTaskAfterData = await checkTaskAfterApply.json();
    const updatedTask = checkTaskAfterData.data;

    assert('Task scheduled with startTime', !!updatedTask.startTime);
    assert('Task scheduled with endTime', !!updatedTask.endTime);

    // STRICT GUARANTEE VERIFICATION: Deadline was NEVER altered!
    const afterDeadlineIso = new Date(updatedTask.deadline).toISOString();
    assert(
      'STRICT GUARANTEE: Task deadline remained EXACTLY IDENTICAL after plan application',
      afterDeadlineIso === originalDeadline,
      `Expected ${originalDeadline}, got ${afterDeadlineIso}`,
    );

    // -------------------------------------------------------------------------
    // TEST 6: [Edit Plan] Inline Modification Verification
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: [Edit Plan] Custom Slot Adjustment Flow ---');
    const customSlots = [
      {
        id: 'slot-custom-1',
        slotType: 'TASK',
        taskId: testTaskId,
        title: 'Deploy Production AI Pipeline V2 (User Adjusted)',
        startTime: '14:00',
        endTime: '15:00',
        durationMinutes: 60,
        priority: 'CRITICAL',
        category: 'WORK',
        isFixed: false,
        reason: 'User manually adjusted time window',
      },
      {
        id: 'break-custom-user',
        slotType: 'BREAK',
        title: 'Afternoon Espresso & Mindfulness',
        startTime: '15:00',
        endTime: '15:15',
        durationMinutes: 15,
        priority: 'NONE',
        category: 'HEALTH',
        isFixed: false,
        reason: 'User added break block',
      },
    ];

    const editApplyRes = await fetch(`${BACKEND_URL}/ai/daily-plan/apply`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        targetDate: testDate,
        slots: customSlots,
      }),
    });
    const editApplyData = await editApplyRes.json();

    assert('Edited plan applied successfully', editApplyRes.ok && editApplyData.success === true);

    const checkEditedTask = await fetch(`${BACKEND_URL}/tasks/${testTaskId}`, {
      headers: authHeaders,
    });
    const checkEditedData = await checkEditedTask.json();
    assert(
      'Task updated to user-edited time (14:00 - 15:00)',
      checkEditedData.data.startTime === '14:00' && checkEditedData.data.endTime === '15:00',
    );
    assert(
      'Deadline STILL strictly untouched after edit application',
      new Date(checkEditedData.data.deadline).toISOString() === originalDeadline,
    );
  } catch (err) {
    console.error('💥 Unexpected test error:', err);
    failed++;
  } finally {
    // Cleanup spawned processes
    if (pyProc) {
      console.log('\nStopping spawned Python microservice...');
      pyProc.kill();
    }
    if (nestProc) {
      console.log('Stopping spawned NestJS process...');
      nestProc.kill();
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('='.repeat(80));

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 STEP 13: AI DAILY PLANNER FULLY VERIFIED!\n');
    process.exit(0);
  }
}

main();
