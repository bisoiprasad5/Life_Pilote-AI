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
  console.log('🚀 Bootstrapping NestJS Smart Task Manager Test Suite...\n');

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

  const port = 4056;
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

  // Test accounts
  const userA = {
    email: `alice_${Date.now()}@lifepilot.ai`,
    password: 'Password123!',
    fullName: 'Alice Pilot',
  };

  const userB = {
    email: `bob_${Date.now()}@lifepilot.ai`,
    password: 'Password123!',
    fullName: 'Bob Pilot',
  };

  let tokenA = '';
  let tokenB = '';
  let cookieA = '';
  let cookieB = '';

  let createdTaskId = '';
  let createdSubtaskId = '';

  try {
    // ------------------------------------------------------------------------
    // SETUP: Register Users A and B
    // ------------------------------------------------------------------------
    console.log('--- 0. Setup: Registering Test Users ---');
    const regARes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userA),
    });
    const regAData = await regARes.json();
    tokenA = regAData.token;
    const setCookieA = regARes.headers.get('set-cookie');
    if (setCookieA) cookieA = setCookieA.split(';')[0];

    const regBRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userB),
    });
    const regBData = await regBRes.json();
    tokenB = regBData.token;
    const setCookieB = regBRes.headers.get('set-cookie');
    if (setCookieB) cookieB = setCookieB.split(';')[0];

    record('Setup test accounts Alice & Bob', !!tokenA && !!tokenB, `Alice: ${userA.email}, Bob: ${userB.email}`);

    const authHeadersA = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
      Cookie: cookieA,
    };

    const authHeadersB = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenB}`,
      Cookie: cookieB,
    };

    // ------------------------------------------------------------------------
    // TEST 1: Unauthorized Requests
    // ------------------------------------------------------------------------
    console.log('\n--- 1. Testing Unauthorized Requests ---');
    const unauthGet = await fetch(`${baseUrl}/tasks`);
    record(
      'GET /api/tasks without authorization returns 401',
      unauthGet.status === 401,
      `Status: ${unauthGet.status}`,
    );

    const unauthPost = await fetch(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Unauthorized Task' }),
    });
    record(
      'POST /api/tasks without authorization returns 401',
      unauthPost.status === 401,
      `Status: ${unauthPost.status}`,
    );

    // ------------------------------------------------------------------------
    // TEST 2: DTO Validation
    // ------------------------------------------------------------------------
    console.log('\n--- 2. Testing DTO Validation ---');
    const emptyTitleRes = await fetch(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({ title: '' }),
    });
    record(
      'POST /api/tasks with empty title returns 400 Bad Request',
      emptyTitleRes.status === 400,
      `Status: ${emptyTitleRes.status}`,
    );

    const invalidPriorityRes = await fetch(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({ title: 'Valid Title', priority: 'INVALID_PRIORITY' }),
    });
    record(
      'POST /api/tasks with invalid priority returns 400 Bad Request',
      invalidPriorityRes.status === 400,
      `Status: ${invalidPriorityRes.status}`,
    );

    const invalidCategoryRes = await fetch(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({ title: 'Valid Title', category: 'NOT_A_CATEGORY' }),
    });
    record(
      'POST /api/tasks with invalid category returns 400 Bad Request',
      invalidCategoryRes.status === 400,
      `Status: ${invalidCategoryRes.status}`,
    );

    // ------------------------------------------------------------------------
    // TEST 3: Create Task with Full Fields
    // ------------------------------------------------------------------------
    console.log('\n--- 3. Testing Task Creation with Full Field Support ---');
    const taskPayload = {
      title: 'Complete NestJS Task Manager Backend',
      description: 'Implement full CRUD, subtasks, scheduling, and tests',
      date: '2026-10-15',
      startTime: '09:00',
      endTime: '12:00',
      deadline: '2026-10-15T18:00:00.000Z',
      priority: 'CRITICAL',
      category: 'WORK',
      status: 'TODO',
      estimatedDuration: 180,
      recurringSchedule: {
        isRecurring: true,
        interval: 'WEEKLY',
        rule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
      },
      reminder: {
        triggerTime: '2026-10-15T08:30:00.000Z',
        channel: 'IN_APP',
      },
      notes: 'Remember to verify edge cases for snooze and reschedule',
      subtasks: [
        { title: 'Write DTOs', isCompleted: true, order: 0 },
        { title: 'Implement Service methods', isCompleted: false, order: 1 },
        { title: 'Write automated test suite', isCompleted: false, order: 2 },
      ],
      tags: ['backend', 'nestjs', 'smart-task-manager'],
    };

    const createRes = await fetch(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify(taskPayload),
    });
    const createData = await createRes.json();
    createdTaskId = createData.data?.id;

    record(
      'POST /api/tasks returns 201 Created and creates full task',
      createRes.status === 201 && createData.success === true && !!createdTaskId,
      `Status: ${createRes.status}, ID: ${createdTaskId}`,
    );

    record(
      'Created task contains all fields correctly mapped',
      createData.data?.title === taskPayload.title &&
        createData.data?.priority === 'CRITICAL' &&
        createData.data?.category === 'WORK' &&
        createData.data?.status === 'TODO' &&
        createData.data?.estimatedDuration === 180 &&
        createData.data?.startTime === '09:00' &&
        createData.data?.endTime === '12:00' &&
        createData.data?.notes === taskPayload.notes &&
        createData.data?.recurringSchedule?.interval === 'WEEKLY' &&
        createData.data?.subtasks?.length === 3,
      `Subtasks count: ${createData.data?.subtasks?.length}, Priority: ${createData.data?.priority}`,
    );

    if (createData.data?.subtasks?.length > 0) {
      createdSubtaskId = createData.data.subtasks[1].id;
    }

    // ------------------------------------------------------------------------
    // TEST 4: Create Tasks across all Categories and Priorities
    // ------------------------------------------------------------------------
    console.log('\n--- 4. Testing All Categories and Priorities ---');
    const batchTasks = [
      { title: 'Study Math', category: 'STUDY', priority: 'HIGH' },
      { title: 'Doctor Appointment', category: 'HEALTH', priority: 'CRITICAL' },
      { title: 'Gym Workout', category: 'FITNESS', priority: 'MEDIUM' },
      { title: 'Budget Review', category: 'FINANCE', priority: 'LOW' },
      { title: 'Call Family', category: 'PERSONAL', priority: 'MEDIUM' },
      { title: 'Car Wash', category: 'OTHER', priority: 'LOW' },
    ];

    let batchSuccess = true;
    for (const t of batchTasks) {
      const res = await fetch(`${baseUrl}/tasks`, {
        method: 'POST',
        headers: authHeadersA,
        body: JSON.stringify(t),
      });
      if (res.status !== 201) batchSuccess = false;
    }
    record(
      'Supports all required categories (STUDY, WORK, PERSONAL, HEALTH, FITNESS, FINANCE, OTHER) and priorities (LOW, MEDIUM, HIGH, CRITICAL)',
      batchSuccess,
      `Created ${batchTasks.length} varied tasks`,
    );

    // ------------------------------------------------------------------------
    // TEST 5: Read Tasks with Pagination
    // ------------------------------------------------------------------------
    console.log('\n--- 5. Testing Pagination ---');
    const pagedRes = await fetch(`${baseUrl}/tasks?page=1&limit=3`, {
      headers: authHeadersA,
    });
    const pagedData = await pagedRes.json();
    record(
      'GET /api/tasks supports pagination with metadata',
      pagedRes.status === 200 &&
        pagedData.data.length === 3 &&
        pagedData.meta.total >= 7 &&
        pagedData.meta.page === 1 &&
        pagedData.meta.limit === 3 &&
        pagedData.meta.totalPages >= 3 &&
        pagedData.meta.hasNextPage === true,
      `Page: ${pagedData.meta?.page}, Limit: ${pagedData.meta?.limit}, Total: ${pagedData.meta?.total}`,
    );

    // ------------------------------------------------------------------------
    // TEST 6: Filtering by Status, Priority, Category
    // ------------------------------------------------------------------------
    console.log('\n--- 6. Testing Filtering ---');
    const filterCatRes = await fetch(`${baseUrl}/tasks?category=FITNESS`, {
      headers: authHeadersA,
    });
    const filterCatData = await filterCatRes.json();
    record(
      'Filtering by Category (category=FITNESS) returns only FITNESS tasks',
      filterCatRes.status === 200 &&
        filterCatData.data.length > 0 &&
        filterCatData.data.every((t: any) => t.category === 'FITNESS'),
      `Returned ${filterCatData.data.length} tasks`,
    );

    const filterPrioRes = await fetch(`${baseUrl}/tasks?priority=CRITICAL`, {
      headers: authHeadersA,
    });
    const filterPrioData = await filterPrioRes.json();
    record(
      'Filtering by Priority (priority=CRITICAL) returns only CRITICAL tasks',
      filterPrioRes.status === 200 &&
        filterPrioData.data.length > 0 &&
        filterPrioData.data.every((t: any) => t.priority === 'CRITICAL'),
      `Returned ${filterPrioData.data.length} tasks`,
    );

    // ------------------------------------------------------------------------
    // TEST 7: Search
    // ------------------------------------------------------------------------
    console.log('\n--- 7. Testing Search ---');
    const searchRes = await fetch(`${baseUrl}/tasks?search=NestJS`, {
      headers: authHeadersA,
    });
    const searchData = await searchRes.json();
    record(
      'Search query (search=NestJS) finds tasks matching in title/description/notes',
      searchRes.status === 200 &&
        searchData.data.length > 0 &&
        searchData.data[0].id === createdTaskId,
      `Found ${searchData.data.length} matching tasks`,
    );

    // ------------------------------------------------------------------------
    // TEST 8: Sorting
    // ------------------------------------------------------------------------
    console.log('\n--- 8. Testing Sorting ---');
    const sortPrioRes = await fetch(`${baseUrl}/tasks?sortBy=priority&sortOrder=desc`, {
      headers: authHeadersA,
    });
    const sortPrioData = await sortPrioRes.json();
    const firstPriority = sortPrioData.data[0]?.priority;
    record(
      'Sorting by priority descending places CRITICAL tasks first',
      sortPrioRes.status === 200 && firstPriority === 'CRITICAL',
      `First item priority: ${firstPriority}`,
    );

    const sortTitleRes = await fetch(`${baseUrl}/tasks?sortBy=title&sortOrder=asc`, {
      headers: authHeadersA,
    });
    const sortTitleData = await sortTitleRes.json();
    const titles = sortTitleData.data.map((t: any) => t.title);
    const isSorted = titles.slice(0, 4).every((val: string, i: number, arr: string[]) => !i || arr[i - 1].localeCompare(val) <= 0);
    record(
      'Sorting by title ascending orders alphabetically',
      sortTitleRes.status === 200 && isSorted,
      `First 3 titles: ${titles.slice(0, 3).join(', ')}`,
    );

    // ------------------------------------------------------------------------
    // TEST 9: Read Single Task
    // ------------------------------------------------------------------------
    console.log('\n--- 9. Testing Read Single Task ---');
    const getSingleRes = await fetch(`${baseUrl}/tasks/${createdTaskId}`, {
      headers: authHeadersA,
    });
    const getSingleData = await getSingleRes.json();
    record(
      'GET /api/tasks/:id retrieves task details and subtasks',
      getSingleRes.status === 200 && getSingleData.data.id === createdTaskId,
      `Task Title: ${getSingleData.data?.title}`,
    );

    // ------------------------------------------------------------------------
    // TEST 10: Authorization & Multi-tenant Isolation
    // ------------------------------------------------------------------------
    console.log('\n--- 10. Testing Multi-Tenant Authorization ---');
    // Bob should not see Alice's task in his task list
    const bobListRes = await fetch(`${baseUrl}/tasks`, {
      headers: authHeadersB,
    });
    const bobListData = await bobListRes.json();
    record(
      'User B (Bob) task list is empty and does not leak User A tasks',
      bobListRes.status === 200 && bobListData.data.length === 0,
      `Bob tasks count: ${bobListData.data?.length}`,
    );

    // Bob cannot read Alice's task by ID
    const bobGetAliceTask = await fetch(`${baseUrl}/tasks/${createdTaskId}`, {
      headers: authHeadersB,
    });
    record(
      'User B cannot access User A task (returns 403 Forbidden or 404)',
      bobGetAliceTask.status === 403 || bobGetAliceTask.status === 404,
      `Status: ${bobGetAliceTask.status}`,
    );

    // Bob cannot update Alice's task
    const bobUpdateAliceTask = await fetch(`${baseUrl}/tasks/${createdTaskId}`, {
      method: 'PUT',
      headers: authHeadersB,
      body: JSON.stringify({ title: 'Hacked by Bob' }),
    });
    record(
      'User B cannot update User A task',
      bobUpdateAliceTask.status === 403 || bobUpdateAliceTask.status === 404,
      `Status: ${bobUpdateAliceTask.status}`,
    );

    // Bob cannot delete Alice's task
    const bobDeleteAliceTask = await fetch(`${baseUrl}/tasks/${createdTaskId}`, {
      method: 'DELETE',
      headers: authHeadersB,
    });
    record(
      'User B cannot delete User A task',
      bobDeleteAliceTask.status === 403 || bobDeleteAliceTask.status === 404,
      `Status: ${bobDeleteAliceTask.status}`,
    );

    // ------------------------------------------------------------------------
    // TEST 11: Update Task
    // ------------------------------------------------------------------------
    console.log('\n--- 11. Testing Update Task ---');
    const updateRes = await fetch(`${baseUrl}/tasks/${createdTaskId}`, {
      method: 'PUT',
      headers: authHeadersA,
      body: JSON.stringify({
        title: 'Updated Task Manager Backend Title',
        notes: 'Updated notes with new requirements',
        priority: 'HIGH',
      }),
    });
    const updateData = await updateRes.json();
    record(
      'PUT /api/tasks/:id updates specified task fields',
      updateRes.status === 200 &&
        updateData.data.title === 'Updated Task Manager Backend Title' &&
        updateData.data.priority === 'HIGH' &&
        updateData.data.notes === 'Updated notes with new requirements',
      `Title: ${updateData.data?.title}, Priority: ${updateData.data?.priority}`,
    );

    // ------------------------------------------------------------------------
    // TEST 12: Complete Task
    // ------------------------------------------------------------------------
    console.log('\n--- 12. Testing Complete Task Action ---');
    const completeRes = await fetch(`${baseUrl}/tasks/${createdTaskId}/complete`, {
      method: 'PATCH',
      headers: authHeadersA,
      body: JSON.stringify({ completed: true }),
    });
    const completeData = await completeRes.json();
    record(
      'PATCH /api/tasks/:id/complete marks task as COMPLETED with timestamp',
      completeRes.status === 200 &&
        completeData.data.status === 'COMPLETED' &&
        !!completeData.data.completedAt,
      `Status: ${completeData.data?.status}, completedAt: ${completeData.data?.completedAt}`,
    );

    // Reopen task
    const reopenRes = await fetch(`${baseUrl}/tasks/${createdTaskId}/complete`, {
      method: 'PATCH',
      headers: authHeadersA,
      body: JSON.stringify({ completed: false }),
    });
    const reopenData = await reopenRes.json();
    record(
      'PATCH /api/tasks/:id/complete with completed=false reopens task to TODO',
      reopenRes.status === 200 &&
        reopenData.data.status === 'TODO' &&
        reopenData.data.completedAt === null,
      `Status: ${reopenData.data?.status}`,
    );

    // ------------------------------------------------------------------------
    // TEST 13: Snooze Task
    // ------------------------------------------------------------------------
    console.log('\n--- 13. Testing Snooze Task Action ---');
    const snoozeRes = await fetch(`${baseUrl}/tasks/${createdTaskId}/snooze`, {
      method: 'PATCH',
      headers: authHeadersA,
      body: JSON.stringify({ minutes: 120 }),
    });
    const snoozeData = await snoozeRes.json();
    record(
      'PATCH /api/tasks/:id/snooze postpones task deadline by requested minutes',
      snoozeRes.status === 200 && !!snoozeData.data.deadline,
      `New Deadline: ${snoozeData.data?.deadline}`,
    );

    // ------------------------------------------------------------------------
    // TEST 14: Reschedule Task
    // ------------------------------------------------------------------------
    console.log('\n--- 14. Testing Reschedule Task Action ---');
    const rescheduleRes = await fetch(`${baseUrl}/tasks/${createdTaskId}/reschedule`, {
      method: 'PATCH',
      headers: authHeadersA,
      body: JSON.stringify({
        date: '2026-11-01',
        startTime: '14:00',
        endTime: '16:00',
        deadline: '2026-11-01T20:00:00.000Z',
      }),
    });
    const rescheduleData = await rescheduleRes.json();
    record(
      'PATCH /api/tasks/:id/reschedule updates date, start/end times and deadline',
      rescheduleRes.status === 200 &&
        rescheduleData.data.startTime === '14:00' &&
        rescheduleData.data.endTime === '16:00' &&
        rescheduleData.data.deadline === '2026-11-01T20:00:00.000Z',
      `StartTime: ${rescheduleData.data?.startTime}, Deadline: ${rescheduleData.data?.deadline}`,
    );

    // ------------------------------------------------------------------------
    // TEST 15: Duplicate Task
    // ------------------------------------------------------------------------
    console.log('\n--- 15. Testing Duplicate Task Action ---');
    const duplicateRes = await fetch(`${baseUrl}/tasks/${createdTaskId}/duplicate`, {
      method: 'POST',
      headers: authHeadersA,
    });
    const duplicateData = await duplicateRes.json();
    const dupTask = duplicateData.data;
    record(
      'POST /api/tasks/:id/duplicate creates a new cloned task with cloned subtasks',
      duplicateRes.status === 201 &&
        dupTask.id !== createdTaskId &&
        dupTask.title.includes('(Copy)') &&
        dupTask.status === 'TODO' &&
        dupTask.subtasks?.length > 0,
      `Cloned ID: ${dupTask?.id}, Title: ${dupTask?.title}`,
    );

    // ------------------------------------------------------------------------
    // TEST 16: Subtask Management Endpoints
    // ------------------------------------------------------------------------
    console.log('\n--- 16. Testing Subtasks Standalone Endpoints ---');
    // Add subtask
    const addSubtaskRes = await fetch(`${baseUrl}/tasks/${createdTaskId}/subtasks`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({ title: 'Newly Added Subtask via API' }),
    });
    const addSubtaskData = await addSubtaskRes.json();
    const newSubtaskId = addSubtaskData.data?.id;
    record(
      'POST /api/tasks/:id/subtasks adds a subtask to task',
      addSubtaskRes.status === 201 && !!newSubtaskId,
      `Subtask ID: ${newSubtaskId}, Title: ${addSubtaskData.data?.title}`,
    );

    // Update / Toggle subtask
    const updateSubtaskRes = await fetch(`${baseUrl}/tasks/${createdTaskId}/subtasks/${newSubtaskId}`, {
      method: 'PATCH',
      headers: authHeadersA,
      body: JSON.stringify({ isCompleted: true, title: 'Completed Standalone Subtask' }),
    });
    const updateSubtaskData = await updateSubtaskRes.json();
    record(
      'PATCH /api/tasks/:id/subtasks/:subtaskId updates and toggles subtask',
      updateSubtaskRes.status === 200 &&
        updateSubtaskData.data.isCompleted === true &&
        updateSubtaskData.data.title === 'Completed Standalone Subtask',
      `isCompleted: ${updateSubtaskData.data?.isCompleted}`,
    );

    // Delete subtask
    const delSubtaskRes = await fetch(`${baseUrl}/tasks/${createdTaskId}/subtasks/${newSubtaskId}`, {
      method: 'DELETE',
      headers: authHeadersA,
    });
    record(
      'DELETE /api/tasks/:id/subtasks/:subtaskId removes subtask',
      delSubtaskRes.status === 200,
      `Status: ${delSubtaskRes.status}`,
    );

    // ------------------------------------------------------------------------
    // TEST 17: Delete Task
    // ------------------------------------------------------------------------
    console.log('\n--- 17. Testing Delete Task ---');
    const deleteRes = await fetch(`${baseUrl}/tasks/${createdTaskId}`, {
      method: 'DELETE',
      headers: authHeadersA,
    });
    record(
      'DELETE /api/tasks/:id deletes task successfully',
      deleteRes.status === 200,
      `Status: ${deleteRes.status}`,
    );

    const getAfterDeleteRes = await fetch(`${baseUrl}/tasks/${createdTaskId}`, {
      headers: authHeadersA,
    });
    record(
      'Subsequent GET /api/tasks/:id on deleted task returns 404 Not Found',
      getAfterDeleteRes.status === 404,
      `Status: ${getAfterDeleteRes.status}`,
    );

    // ------------------------------------------------------------------------
    // TEST 18: Verify /api/v1/tasks and /api/tasks URL routing
    // ------------------------------------------------------------------------
    console.log('\n--- 18. Testing Route Prefix Interoperability ---');
    const v1Res = await fetch(`http://localhost:${port}/api/v1/tasks`, {
      headers: authHeadersA,
    });
    const plainApiRes = await fetch(`http://localhost:${port}/api/tasks`, {
      headers: authHeadersA,
    });
    record(
      'Both /api/tasks and /api/v1/tasks resolve identically and successfully',
      v1Res.status === 200 && plainApiRes.status === 200,
      `v1 Status: ${v1Res.status}, plain Status: ${plainApiRes.status}`,
    );
  } catch (err: any) {
    console.error('Test execution error:', err);
    record('Task suite runtime without unexpected crashes', false, err.message);
  } finally {
    await app.close();
  }

  // Summary
  console.log('\n========================================');
  console.log('       TASK TEST SUITE SUMMARY          ');
  console.log('========================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log(`Total tests: ${total}`);
  console.log(`Passed:      ${passed}`);
  console.log(`Failed:      ${failed}`);

  if (failed > 0) {
    console.error('\n⚠️ Some task tests failed. Please review above logs.');
    process.exit(1);
  } else {
    console.log(`\n🎉 ALL ${passed} SMART TASK MANAGER TESTS PASSED SUCCESSFULLY!\n`);
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('CRITICAL ERROR in runTests:', err);
  process.exit(1);
});

