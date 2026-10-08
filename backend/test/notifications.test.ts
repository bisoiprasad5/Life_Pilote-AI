import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { NotificationCategory, NotificationTiming } from '../src/notifications/notifications.constants';

interface TestResult {
  testName: string;
  passed: boolean;
  details?: string;
}

async function runTests() {
  console.log('🚀 Bootstrapping NestJS Smart Notifications & Background Job Test Suite...\n');

  let app;
  try {
    app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  } catch (initErr: any) {
    console.error('💥 Failed to create Nest application:', initErr);
    throw initErr;
  }
  app.use(cookieParser());

  // Intercept routes for /api/ and /api/v1/ interoperability
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

  const port = 4072;
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
    email: `notifier_${Date.now()}@lifepilot.ai`,
    password: 'Password123!',
    fullName: 'Grace Hopper',
  };

  let token = '';
  let authHeaders: Record<string, string> = {};

  try {
    // ------------------------------------------------------------------------
    // SETUP: Register User
    // ------------------------------------------------------------------------
    console.log('--- 0. Setup: Registering Test Account ---');
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });
    const regData = await regRes.json();
    token = regData.token;
    authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
    record('User registered successfully for Smart Notifications', !!token, `User: ${testUser.email}`);

    // ------------------------------------------------------------------------
    // 1. NOTIFICATION PREFERENCES
    // ------------------------------------------------------------------------
    console.log('\n--- 1. Testing Notification Preferences ---');

    // 1.1 Get default preferences
    const prefRes = await fetch(`${baseUrl}/notifications/preferences`, {
      headers: authHeaders,
    });
    const prefData = await prefRes.json();
    record(
      'GET /notifications/preferences returns 200 with all default categories enabled',
      prefRes.status === 200 &&
        prefData.success &&
        prefData.data.upcomingTask === true &&
        prefData.data.waterReminder === true &&
        prefData.data.mealReminder === true &&
        prefData.data.examReminder === true &&
        prefData.data.browserEnabled === true,
      `Default preferences received: ${JSON.stringify(prefData.data?.defaultTiming)}`,
    );

    // 1.2 Update preferences - disable specific categories
    const updatePrefRes = await fetch(`${baseUrl}/notifications/preferences`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        waterReminder: false,
        examReminder: false,
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        defaultTiming: NotificationTiming.THIRTY_MINUTES,
      }),
    });
    const updatePrefData = await updatePrefRes.json();
    record(
      'PATCH /notifications/preferences toggles categories and settings',
      updatePrefRes.status === 200 &&
        updatePrefData.data.waterReminder === false &&
        updatePrefData.data.examReminder === false &&
        updatePrefData.data.quietHoursEnabled === true &&
        updatePrefData.data.defaultTiming === NotificationTiming.THIRTY_MINUTES,
      'Updated preferences verified',
    );

    // 1.3 Reset preferences
    const resetPrefRes = await fetch(`${baseUrl}/notifications/preferences/reset`, {
      method: 'POST',
      headers: authHeaders,
    });
    const resetPrefData = await resetPrefRes.json();
    record(
      'POST /notifications/preferences/reset restores default preferences',
      resetPrefRes.status === 200 &&
        resetPrefData.data.waterReminder === true &&
        resetPrefData.data.examReminder === true,
      'Preferences restored to defaults',
    );

    // ------------------------------------------------------------------------
    // 2. REMINDER CREATION FOR ALL 10 CATEGORIES & TIMING PRESETS
    // ------------------------------------------------------------------------
    console.log('\n--- 2. Testing Reminder Creation ---');

    const futureTarget = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours from now

    // 2.1 Schedule an Upcoming Task reminder with 15_MINUTES timing
    const createRemRes = await fetch(`${baseUrl}/notifications/reminders/schedule`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Complete Distributed Queue Benchmarks',
        category: NotificationCategory.UPCOMING_TASK,
        timing: NotificationTiming.FIFTEEN_MINUTES,
        targetTime: futureTarget,
        description: 'Prepare benchmark summary report for engineering sync.',
      }),
    });
    const createRemData = await createRemRes.json();
    const createdReminderId = createRemData.data?.reminder?.id;
    record(
      'POST /notifications/reminders/schedule creates delayed reminder with BullMQ job',
      createRemRes.status === 201 &&
        createRemData.success &&
        !!createdReminderId &&
        !!createRemData.data?.job?.id,
      `Reminder ID: ${createdReminderId}, Job ID: ${createRemData.data?.job?.id}`,
    );

    // 2.2 Verify All 10 Notification Categories can be scheduled
    const categoriesToTest = [
      NotificationCategory.TASK_STARTING,
      NotificationCategory.OVERDUE_TASK,
      NotificationCategory.DEADLINE_APPROACHING,
      NotificationCategory.HABIT_REMINDER,
      NotificationCategory.WATER_REMINDER,
      NotificationCategory.MEAL_REMINDER,
      NotificationCategory.STUDY_REMINDER,
      NotificationCategory.EXAM_REMINDER,
      NotificationCategory.GOAL_REMINDER,
    ];

    let allCategoriesCreated = true;
    for (const cat of categoriesToTest) {
      const res = await fetch(`${baseUrl}/notifications/reminders/schedule`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          title: `Scheduled ${cat}`,
          category: cat,
          timing: NotificationTiming.FIVE_MINUTES,
          targetTime: futureTarget,
        }),
      });
      const data = await res.json();
      if (res.status !== 201 || !data.success) {
        allCategoriesCreated = false;
        break;
      }
    }
    record(
      'Supports all 10 Notification Categories (Task Starting, Overdue, Deadline, Habit, Water, Meal, Study, Exam, Goal)',
      allCategoriesCreated,
      'All 10 notification categories verified',
    );

    // 2.3 Verify timing offsets presets (5m, 10m, 15m, 30m, 1h, 1d)
    const timingPresets = [
      NotificationTiming.FIVE_MINUTES,
      NotificationTiming.TEN_MINUTES,
      NotificationTiming.FIFTEEN_MINUTES,
      NotificationTiming.THIRTY_MINUTES,
      NotificationTiming.ONE_HOUR,
      NotificationTiming.ONE_DAY,
    ];
    let timingPresetsValid = true;
    for (const timing of timingPresets) {
      const target = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      const res = await fetch(`${baseUrl}/notifications/reminders/schedule`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          title: `Timing test for ${timing}`,
          category: NotificationCategory.UPCOMING_TASK,
          timing,
          targetTime: target,
        }),
      });
      const data = await res.json();
      if (res.status !== 201 || !data.data?.job?.delayMs) {
        timingPresetsValid = false;
        break;
      }
    }
    record(
      'Supports all 6 Notification Timing Presets (5m, 10m, 15m, 30m, 1h, 1d)',
      timingPresetsValid,
      'All 6 timing intervals properly computed',
    );

    // 2.4 List user reminders
    const listRemRes = await fetch(`${baseUrl}/notifications/reminders`, {
      headers: authHeaders,
    });
    const listRemData = await listRemRes.json();
    record(
      'GET /notifications/reminders retrieves scheduled reminders for current user',
      listRemRes.status === 200 && Array.isArray(listRemData.data) && listRemData.data.length >= 10,
      `Total scheduled reminders: ${listRemData.data?.length}`,
    );

    // ------------------------------------------------------------------------
    // 3. REMINDER EXECUTION & NOTIFICATION DELIVERY
    // ------------------------------------------------------------------------
    console.log('\n--- 3. Testing Reminder Execution ---');

    // 3.1 Immediate execution of the scheduled reminder
    const triggerRes = await fetch(
      `${baseUrl}/notifications/reminders/test-trigger/${createdReminderId}`,
      {
        method: 'POST',
        headers: authHeaders,
      },
    );
    const triggerData = await triggerRes.json();
    record(
      'POST /notifications/reminders/test-trigger/:id executes reminder and delivers notification',
      triggerRes.status === 200 &&
        triggerData.success &&
        triggerData.data?.status === 'delivered',
      `Execution result: ${triggerData.data?.status}`,
    );

    // 3.2 Verify notification in user list
    const notifsRes = await fetch(`${baseUrl}/notifications`, {
      headers: authHeaders,
    });
    const notifsData = await notifsRes.json();
    const deliveredNotif = notifsData.data?.find(
      (n: any) => n.title === 'Complete Distributed Queue Benchmarks',
    );
    record(
      'GET /notifications lists delivered notification with title and metadata',
      notifsRes.status === 200 && !!deliveredNotif,
      `Delivered Notification ID: ${deliveredNotif?.id}`,
    );

    // 3.3 Check unread count
    const unreadRes = await fetch(`${baseUrl}/notifications/unread-count`, {
      headers: authHeaders,
    });
    const unreadData = await unreadRes.json();
    record(
      'GET /notifications/unread-count returns correct unread count',
      unreadRes.status === 200 && unreadData.data?.unreadCount >= 1,
      `Unread Count: ${unreadData.data?.unreadCount}`,
    );

    // 3.4 Mark notification as read
    if (deliveredNotif) {
      const readRes = await fetch(`${baseUrl}/notifications/${deliveredNotif.id}/read`, {
        method: 'PATCH',
        headers: authHeaders,
      });
      const readData = await readRes.json();
      record(
        'PATCH /notifications/:id/read marks notification as read',
        readRes.status === 200 && readData.data?.isRead === true,
        `Notification marked as read: ${readData.data?.id}`,
      );
    }

    // 3.5 Mark all as read
    const markAllRes = await fetch(`${baseUrl}/notifications/mark-all-read`, {
      method: 'PATCH',
      headers: authHeaders,
    });
    record(
      'PATCH /notifications/mark-all-read marks all remaining notifications as read',
      markAllRes.status === 200,
      'All notifications marked read',
    );

    // 3.6 Test Preference Category Suppression
    console.log('\n--- 3.6 Testing Notification Preference Category Suppression ---');
    // Disable WATER_REMINDER in preferences
    await fetch(`${baseUrl}/notifications/preferences`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ waterReminder: false }),
    });

    // Schedule and trigger water reminder
    const waterRemRes = await fetch(`${baseUrl}/notifications/reminders/schedule`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Drink 300ml Water Now',
        category: NotificationCategory.WATER_REMINDER,
        timing: NotificationTiming.FIVE_MINUTES,
        targetTime: futureTarget,
      }),
    });
    const waterRemData = await waterRemRes.json();
    const waterRemId = waterRemData.data?.reminder?.id;

    const triggerSuppressedRes = await fetch(
      `${baseUrl}/notifications/reminders/test-trigger/${waterRemId}`,
      {
        method: 'POST',
        headers: authHeaders,
      },
    );
    const triggerSuppressedData = await triggerSuppressedRes.json();
    record(
      'Disabled category in user preferences suppresses reminder execution',
      triggerSuppressedRes.status === 200 &&
        triggerSuppressedData.data?.status === 'suppressed' &&
        triggerSuppressedData.data?.reason === 'CATEGORY_DISABLED',
      `Suppression status: ${triggerSuppressedData.data?.status} (${triggerSuppressedData.data?.reason})`,
    );

    // Re-enable all preferences
    await fetch(`${baseUrl}/notifications/preferences/reset`, {
      method: 'POST',
      headers: authHeaders,
    });

    // ------------------------------------------------------------------------
    // 4. RECURRING REMINDERS
    // ------------------------------------------------------------------------
    console.log('\n--- 4. Testing Recurring Reminders ---');

    const recurRes = await fetch(`${baseUrl}/notifications/reminders/recurring`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Hydration Ping: Stay Hydrated',
        category: NotificationCategory.WATER_REMINDER,
        intervalMinutes: 90,
        message: 'Drink 250ml water to maintain peak cognitive focus.',
      }),
    });
    const recurData = await recurRes.json();
    record(
      'POST /notifications/reminders/recurring registers recurring background job',
      recurRes.status === 201 &&
        recurData.success &&
        recurData.data?.intervalMinutes === 90 &&
        !!recurData.data?.recurringId,
      `Recurring ID: ${recurData.data?.recurringId}, Interval: 90 min`,
    );

    // ------------------------------------------------------------------------
    // 5. FAILED JOBS & QUEUE HEALTH
    // ------------------------------------------------------------------------
    console.log('\n--- 5. Testing Failed Jobs & Dead-Letter Tracking ---');

    // 5.1 Check Queue Stats
    const statsRes = await fetch(`${baseUrl}/notifications/jobs/stats`, {
      headers: authHeaders,
    });
    const statsData = await statsRes.json();
    record(
      'GET /notifications/jobs/stats returns queue metrics (waiting, active, delayed, completed, failed)',
      statsRes.status === 200 &&
        typeof statsData.data?.delayed === 'number' &&
        typeof statsData.data?.completed === 'number',
      `Queue Metrics: Delayed: ${statsData.data?.delayed}, Completed: ${statsData.data?.completed}`,
    );

    // 5.2 Trigger a deliberate permanent job failure (fails 4 times, exceeding 3 attempts)
    const failTestRes = await fetch(`${baseUrl}/notifications/jobs/test-fail-retry?failTimes=4`, {
      method: 'POST',
      headers: authHeaders,
    });
    const failTestData = await failTestRes.json();
    record(
      'POST /notifications/jobs/test-fail-retry enqueues job with deliberate failures',
      failTestRes.status === 200 && !!failTestData.data?.jobId,
      `Enqueued Test Job ID: ${failTestData.data?.jobId}`,
    );

    // Wait for the job engine to run attempts and exhaust retries (using setImmediate and short delay)
    await new Promise((resolve) => setTimeout(resolve, 3500));

    // 5.3 Verify job is recorded in failed jobs dead-letter store
    const failedListRes = await fetch(`${baseUrl}/notifications/jobs/failed`, {
      headers: authHeaders,
    });
    const failedListData = await failedListRes.json();
    const recordedFailedJob = failedListData.data?.find(
      (j: any) => j.id === failTestData.data?.jobId,
    );
    record(
      'Failed job exceeding max attempts is tracked in failed jobs queue with error reason',
      failedListRes.status === 200 && !!recordedFailedJob && recordedFailedJob.attemptsMade >= 3,
      `Failed job recorded with ${recordedFailedJob?.attemptsMade} attempts: "${recordedFailedJob?.failedReason}"`,
    );

    // ------------------------------------------------------------------------
    // 6. RETRY BEHAVIOR
    // ------------------------------------------------------------------------
    console.log('\n--- 6. Testing Retry Behavior & Manual Retry ---');

    // 6.1 Automatic exponential backoff retry testing:
    // Enqueue a job that fails 2 times, and then succeeds on attempt #3!
    const backoffTestRes = await fetch(
      `${baseUrl}/notifications/jobs/test-fail-retry?failTimes=2`,
      {
        method: 'POST',
        headers: authHeaders,
      },
    );
    const backoffTestData = await backoffTestRes.json();
    const backoffJobId = backoffTestData.data?.jobId;
    record(
      'Job configured with 2 failures enqueued to test automatic retry recovery',
      backoffTestRes.status === 200 && !!backoffJobId,
      `Job ID: ${backoffJobId}`,
    );

    // Wait for retries to complete with exponential backoff (attempt 1: immediate, attempt 2: 1s, attempt 3: 2s -> total ~3.5s)
    console.log('   ⏳ Waiting for exponential backoff retries to execute...');
    await new Promise((resolve) => setTimeout(resolve, 3800));

    // After recovery, this job should NOT be in failed jobs list because it succeeded on attempt 3
    const checkFailedAfterRetryRes = await fetch(`${baseUrl}/notifications/jobs/failed`, {
      headers: authHeaders,
    });
    const checkFailedData = await checkFailedAfterRetryRes.json();
    const wasPermanentlyFailed = checkFailedData.data?.some((j: any) => j.id === backoffJobId);
    record(
      'Job successfully recovered through automatic retry backoff without permanent failure',
      !wasPermanentlyFailed,
      'Automatic retry backoff recovery confirmed',
    );

    // 6.2 Manual retry of permanently failed job
    if (recordedFailedJob) {
      const retrySingleRes = await fetch(
        `${baseUrl}/notifications/jobs/retry/${recordedFailedJob.id}`,
        {
          method: 'POST',
          headers: authHeaders,
        },
      );
      const retrySingleData = await retrySingleRes.json();
      record(
        'POST /notifications/jobs/retry/:jobId manually retries and re-executes a failed job',
        retrySingleRes.status === 200 && retrySingleData.success === true,
        `Job ${recordedFailedJob.id} re-enqueued for retry`,
      );
    }

    // 6.3 Retry all failed jobs
    const retryAllRes = await fetch(`${baseUrl}/notifications/jobs/retry-failed`, {
      method: 'POST',
      headers: authHeaders,
    });
    const retryAllData = await retryAllRes.json();
    record(
      'POST /notifications/jobs/retry-failed successfully triggers batch retry',
      retryAllRes.status === 200 && typeof retryAllData.data?.retriedCount === 'number',
      `Batch retried jobs count: ${retryAllData.data?.retriedCount}`,
    );

  } catch (err: any) {
    console.error('💥 Test suite execution error:', err.message);
  } finally {
    await app.close();
  }

  // ------------------------------------------------------------------------
  // SUMMARY
  // ------------------------------------------------------------------------
  console.log('\n========================================');
  console.log('  SMART NOTIFICATIONS TEST SUMMARY');
  console.log('========================================');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Total tests: ${results.length}`);
  console.log(`Passed:      ${passed}`);
  console.log(`Failed:      ${failed}`);

  if (failed === 0) {
    console.log('\n🎉 ALL SMART NOTIFICATIONS TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  } else {
    console.error(`\n❌ ${failed} TESTS FAILED.\n`);
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('💥 FATAL UNCAUGHT ERROR:', err);
  process.exit(1);
});
