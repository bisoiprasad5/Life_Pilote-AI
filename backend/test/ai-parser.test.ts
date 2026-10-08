import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

interface TestResult {
  testName: string;
  passed: boolean;
  details?: string;
}

async function runTests() {
  console.log('🚀 Bootstrapping AI Task Parser End-to-End Test Suite...\n');

  // 1. Start Python AI Microservice if not running
  let pythonProc: ChildProcess | null = null;
  const aiServiceDir = path.resolve(__dirname, '../../ai-service');

  try {
    const healthCheck = await fetch('http://localhost:8000/health').catch(() => null);
    if (!healthCheck || !healthCheck.ok) {
      console.log('Starting Python FastAPI microservice on port 8000...');
      pythonProc = spawn('python', ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'], {
        cwd: aiServiceDir,
        stdio: 'pipe',
      });

      // Wait for health check to return 200
      let online = false;
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 500));
        const res = await fetch('http://localhost:8000/health').catch(() => null);
        if (res && res.ok) {
          online = true;
          break;
        }
      }
      if (!online) {
        throw new Error('Python AI microservice failed to start within 15 seconds');
      }
      console.log('✅ Python AI microservice is ready on http://localhost:8000\n');
    } else {
      console.log('✅ Python AI microservice is already running on http://localhost:8000\n');
    }
  } catch (err: any) {
    console.error(`Warning during Python service startup: ${err.message}`);
  }

  // 2. Start NestJS Backend
  const app = await NestFactory.create(AppModule, { logger: false });
  app.use(cookieParser());

  // Support both /api/ and /api/v1/ routes
  app.use((req: any, _res: any, next: any) => {
    if (req.url.startsWith('/api/') && !req.url.startsWith('/api/v1/')) {
      req.url = req.url.replace('/api/', '/api/v1/');
    }
    next();
  });

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.setGlobalPrefix('api/v1');

  const port = 4058;
  await app.listen(port);
  const baseUrl = `http://localhost:${port}/api`;

  const results: TestResult[] = [];

  function record(name: string, passed: boolean, details?: string) {
    results.push({ testName: name, passed, details });
    if (passed) {
      console.log(`  ✅ PASS: ${name}`);
    } else {
      console.error(`  ❌ FAIL: ${name} - ${details}`);
    }
  }

  try {
    // 3. Register a test user for authenticated task tests
    const userEmail = `ai_tester_${Date.now()}@lifepilot.ai`;
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userEmail,
        password: 'Password123!',
        fullName: 'AI Test User',
      }),
    });
    const regData = await regRes.json();
    const token = regData.token;
    record('Register test user for AI task parser', regRes.ok && !!token);

    // =========================================================================
    // TEST 1: "Remind me to study Java DSA tomorrow at 7 PM for 1 hour."
    // =========================================================================
    console.log('\n--- Scenario 1: Java DSA Study Task ---');
    const parseRes1 = await fetch(`${baseUrl}/ai/task-parser`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        text: 'Remind me to study Java DSA tomorrow at 7 PM for 1 hour.',
        referenceDate: '2026-10-05 12:00:00',
      }),
    });
    const data1 = await parseRes1.json();
    record('POST /api/ai/task-parser returns 200 OK', parseRes1.status === 200);
    record('Intent is CREATE_TASK', data1.intent === 'CREATE_TASK');
    record('Title extracted as "Study Java DSA"', data1.task?.title === 'Study Java DSA', `got "${data1.task?.title}"`);
    record('Date extracted as tomorrow (2026-10-06)', data1.task?.date === '2026-10-06', `got "${data1.task?.date}"`);
    record('Time extracted as 19:00', data1.task?.time === '19:00', `got "${data1.task?.time}"`);
    record('Duration extracted as 60 mins', data1.task?.duration === 60, `got "${data1.task?.duration}"`);
    record('EndTime calculated as 20:00', data1.task?.endTime === '20:00', `got "${data1.task?.endTime}"`);
    record('Category classified as STUDY', data1.task?.category === 'STUDY', `got "${data1.task?.category}"`);

    // =========================================================================
    // TEST 2: "Study OS for 2 hours tomorrow."
    // =========================================================================
    console.log('\n--- Scenario 2: Study OS for 2 hours tomorrow ---');
    const parseRes2 = await fetch(`${baseUrl}/ai/task-parser`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Study OS for 2 hours tomorrow.',
        referenceDate: '2026-10-05 12:00:00',
      }),
    });
    const data2 = await parseRes2.json();
    record('Title is "Study OS"', data2.task?.title === 'Study OS', `got "${data2.task?.title}"`);
    record('Duration is 120 minutes', data2.task?.duration === 120, `got "${data2.task?.duration}"`);
    record('Category is STUDY', data2.task?.category === 'STUDY');

    // =========================================================================
    // TEST 3: "Every Sunday remind me to plan my week." (Recurrence)
    // =========================================================================
    console.log('\n--- Scenario 3: Recurrence - Every Sunday plan my week ---');
    const parseRes3 = await fetch(`${baseUrl}/ai/task-parser`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Every Sunday remind me to plan my week.',
        referenceDate: '2026-10-05 12:00:00',
      }),
    });
    const data3 = await parseRes3.json();
    record('isRecurring is true', data3.task?.isRecurring === true);
    record('recurrenceInterval is WEEKLY', data3.task?.recurrenceInterval === 'WEEKLY');
    record('Recurrence rule has BYDAY=SU', data3.task?.recurrenceRule?.includes('BYDAY=SU'));

    // =========================================================================
    // TEST 4: "Submit assignment before Friday 5 PM." (Deadline)
    // =========================================================================
    console.log('\n--- Scenario 4: Deadline - Submit assignment before Friday 5 PM ---');
    const parseRes4 = await fetch(`${baseUrl}/ai/task-parser`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Submit assignment before Friday 5 PM.',
        referenceDate: '2026-10-05 12:00:00',
      }),
    });
    const data4 = await parseRes4.json();
    record('Title is "Submit Assignment"', data4.task?.title === 'Submit Assignment');
    record('Deadline is populated', !!data4.task?.deadline);
    record('Category is STUDY', data4.task?.category === 'STUDY');

    // =========================================================================
    // TEST 5: Auto-Create Task in Database with Validation
    // =========================================================================
    console.log('\n--- Scenario 5: Auto-Create in Database with Backend Validation ---');
    const parseRes5 = await fetch(`${baseUrl}/ai/task-parser`, {
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
    const data5 = await parseRes5.json();
    record('AutoCreate returns autoCreated=true', data5.autoCreated === true);
    record('Database task entity created', !!data5.createdTask?.id);
    record('Created task category in DB is FITNESS', data5.createdTask?.category === 'FITNESS');
    record('Created task duration in DB is 45', data5.createdTask?.estimatedDuration === 45);

    // Verify task exists in user task list
    const listRes = await fetch(`${baseUrl}/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const listData = await listRes.json();
    const found = listData.data?.some((t: any) => t.id === data5.createdTask?.id);
    record('Created task appears in user task list GET /api/tasks', found);

    // =========================================================================
    // TEST 6: Reject Empty Input & Missing Auth for Auto-Create
    // =========================================================================
    console.log('\n--- Scenario 6: Validation Edge Cases ---');
    const emptyRes = await fetch(`${baseUrl}/ai/task-parser`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '    ' }),
    });
    record('Empty input returns 400 Bad Request', emptyRes.status === 400);

    const unauthAutoRes = await fetch(`${baseUrl}/ai/task-parser`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Study physics tomorrow', autoCreate: true }),
    });
    record('AutoCreate without token returns 401 Unauthorized', unauthAutoRes.status === 401);

    // =========================================================================
    // TEST 7: /api/v1/ai/task-parser route parity
    // =========================================================================
    console.log('\n--- Scenario 7: Route Parity (/api/v1/ai/task-parser) ---');
    const v1Res = await fetch(`http://localhost:${port}/api/v1/ai/task-parser`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Dentist appointment on October 15 at 2:30 PM' }),
    });
    const v1Data = await v1Res.json();
    record('POST /api/v1/ai/task-parser returns 200 OK', v1Res.status === 200);
    record('Category is HEALTH', v1Data.task?.category === 'HEALTH');
    record('Time is 14:30', v1Data.task?.time === '14:30');

    // =========================================================================
    // TEST 8: GET /api/ai/providers
    // =========================================================================
    console.log('\n--- Scenario 8: Provider Abstraction Discovery ---');
    const provRes = await fetch(`${baseUrl}/ai/providers`);
    const provData = await provRes.json();
    record('GET /api/ai/providers returns 200 OK', provRes.status === 200);
    record('Active provider reported', !!provData.active_provider);
    record('Local NLP listed as provider', provData.available_providers?.includes('local'));

  } catch (err: any) {
    console.error('Fatal test error:', err);
    record('Unexpected test suite crash', false, err.message);
  } finally {
    await app.close();
    if (pythonProc) {
      pythonProc.kill();
    }
  }

  // Summary
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log('\n' + '='.repeat(80));
  console.log(`AI TASK PARSER TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('='.repeat(80));

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
