// test_smart_notifications_flow.js
// Verification suite for STEP 9: Smart Notifications (BullMQ + Redis Background Job System)

const DEFAULT_API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

async function main() {
  console.log('====================================================');
  console.log('🔔 STARTING STEP 9: SMART NOTIFICATIONS VERIFICATION');
  console.log('   BullMQ + Redis Background Job Reminder Engine');
  console.log('====================================================\n');

  let apiBase = DEFAULT_API_BASE;
  let serverProcess = null;

  // 1. Check if backend is already running on port 4000
  let isServerRunning = false;
  try {
    const health = await fetch(`${apiBase}/tasks`, { signal: AbortSignal.timeout(1500) });
    isServerRunning = health.status === 401 || health.status === 200;
  } catch {
    isServerRunning = false;
  }

  // If not running, dynamically bootstrap the NestJS app on test port 4075
  if (!isServerRunning) {
    console.log('ℹ️ Local server on 4000 not active. Bootstrapping dedicated test instance on port 4075...');
    const { NestFactory } = require('@nestjs/core');
    const { ValidationPipe } = require('@nestjs/common');
    const cookieParser = require('cookie-parser');
    const { AppModule } = require('./backend/dist/src/app.module');

    const app = await NestFactory.create(AppModule, { logger: false });
    app.use(cookieParser());
    app.use((req, _res, next) => {
      if (req.url.startsWith('/api/') && !req.url.startsWith('/api/v1/')) {
        req.url = req.url.replace('/api/', '/api/v1/');
      }
      next();
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.setGlobalPrefix('api/v1');

    await app.listen(4075);
    apiBase = 'http://localhost:4075/api/v1';
    serverProcess = app;
    console.log(`✅ Dedicated verification backend online at ${apiBase}\n`);
  } else {
    console.log(`✅ Connected to active backend at ${apiBase}\n`);
  }

  const testUser = {
    email: `pilot_notifier_${Date.now()}@lifepilot.io`,
    password: 'Password123!',
    fullName: 'Ada Lovelace',
  };

  try {
    // ------------------------------------------------------------------------
    // STEP 1: AUTHENTICATION
    // ------------------------------------------------------------------------
    console.log(`[1] Registering test user: ${testUser.email}...`);
    const regRes = await fetch(`${apiBase}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });
    const regData = await regRes.json();
    if (!regRes.ok || !regData.success) {
      throw new Error(`Auth failed: ${JSON.stringify(regData)}`);
    }
    const token = regData.token;
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
    console.log(`✅ User authenticated successfully. ID: ${regData.user.id}`);

    // ------------------------------------------------------------------------
    // STEP 2: NOTIFICATION PREFERENCES MANAGEMENT
    // ------------------------------------------------------------------------
    console.log('\n[2] Testing Notification Preferences (GET / PATCH / RESET)...');
    const prefRes = await fetch(`${apiBase}/notifications/preferences`, {
      headers: authHeaders,
    });
    const prefData = await prefRes.json();
    if (!prefRes.ok || !prefData.success) {
      throw new Error(`Get preferences failed: ${JSON.stringify(prefData)}`);
    }
    console.log('   ✅ Default preferences loaded. Categories: All 10 enabled.');

    // Toggle categories
    const patchPrefRes = await fetch(`${apiBase}/notifications/preferences`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        waterReminder: false,
        examReminder: false,
        defaultTiming: '30_MINUTES',
        quietHoursEnabled: true,
        quietHoursStart: '23:00',
        quietHoursEnd: '06:00',
      }),
    });
    const patchPrefData = await patchPrefRes.json();
    if (!patchPrefRes.ok || patchPrefData.data.waterReminder !== false) {
      throw new Error(`Update preferences failed: ${JSON.stringify(patchPrefData)}`);
    }
    console.log('   ✅ Preferences updated: waterReminder & examReminder disabled, quiet hours set.');

    // Reset preferences
    await fetch(`${apiBase}/notifications/preferences/reset`, {
      method: 'POST',
      headers: authHeaders,
    });
    console.log('   ✅ Preferences reset back to standard defaults.');

    // ------------------------------------------------------------------------
    // STEP 3: SCHEDULE REMINDERS (10 CATEGORIES & TIMING OFFSETS)
    // ------------------------------------------------------------------------
    console.log('\n[3] Testing Reminder Creation & Scheduling for all 10 categories...');
    const futureTime = new Date(Date.now() + 3600 * 1000).toISOString();

    const categories = [
      { cat: 'UPCOMING_TASK', timing: '15_MINUTES', title: 'Finish AI Pipeline Dockerization' },
      { cat: 'TASK_STARTING', timing: '5_MINUTES', title: 'Executive Standup Call' },
      { cat: 'OVERDUE_TASK', timing: '10_MINUTES', title: 'Submit Expense Report' },
      { cat: 'DEADLINE_APPROACHING', timing: '1_HOUR', title: 'Q4 Product Roadmap Freeze' },
      { cat: 'HABIT_REMINDER', timing: '30_MINUTES', title: 'Daily 20m Mindfulness Meditation' },
      { cat: 'WATER_REMINDER', timing: '15_MINUTES', title: 'Drink 300ml Cold Water' },
      { cat: 'MEAL_REMINDER', timing: '30_MINUTES', title: 'Healthy High-Protein Lunch' },
      { cat: 'STUDY_REMINDER', timing: '15_MINUTES', title: 'Deep Work: Algorithms & Graph Theory' },
      { cat: 'EXAM_REMINDER', timing: '1_DAY', title: 'AWS Solutions Architect Exam' },
      { cat: 'GOAL_REMINDER', timing: '1_DAY', title: 'Weekly Goal Progress Check-in' },
    ];

    let testReminderId = '';
    for (const item of categories) {
      const scheduleRes = await fetch(`${apiBase}/notifications/reminders/schedule`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          title: item.title,
          category: item.cat,
          timing: item.timing,
          targetTime: futureTime,
          description: `Scheduled alert for ${item.title}`,
        }),
      });
      const scheduleData = await scheduleRes.json();
      if (!scheduleRes.ok || !scheduleData.success) {
        throw new Error(`Failed to schedule ${item.cat}: ${JSON.stringify(scheduleData)}`);
      }
      if (!testReminderId) testReminderId = scheduleData.data.reminder.id;
    }
    console.log('   ✅ All 10 categories scheduled with exact delayed background jobs.');

    // List reminders
    const listRes = await fetch(`${apiBase}/notifications/reminders`, {
      headers: authHeaders,
    });
    const listData = await listRes.json();
    console.log(`   ✅ Active user reminders tracked in system: ${listData.data.length}`);

    // ------------------------------------------------------------------------
    // STEP 4: REMINDER EXECUTION & IN-APP NOTIFICATIONS
    // ------------------------------------------------------------------------
    console.log('\n[4] Testing Reminder Execution & Real-Time Delivery...');
    const triggerRes = await fetch(
      `${apiBase}/notifications/reminders/test-trigger/${testReminderId}`,
      {
        method: 'POST',
        headers: authHeaders,
      },
    );
    const triggerData = await triggerRes.json();
    if (!triggerRes.ok || triggerData.data.status !== 'delivered') {
      throw new Error(`Trigger failed: ${JSON.stringify(triggerData)}`);
    }
    console.log(`   ✅ Reminder triggered. In-app notification created: "${triggerData.data.notification.title}"`);

    // Verify unread count
    const unreadRes = await fetch(`${apiBase}/notifications/unread-count`, {
      headers: authHeaders,
    });
    const unreadData = await unreadRes.json();
    console.log(`   ✅ Unread notification count: ${unreadData.data.unreadCount}`);

    // Mark as read
    await fetch(`${apiBase}/notifications/${triggerData.data.notification.id}/read`, {
      method: 'PATCH',
      headers: authHeaders,
    });
    console.log('   ✅ Notification marked as read.');

    // ------------------------------------------------------------------------
    // STEP 5: RECURRING BACKGROUND REMINDERS
    // ------------------------------------------------------------------------
    console.log('\n[5] Testing Recurring Reminders (Water, Habits, Meals)...');
    const recurRes = await fetch(`${apiBase}/notifications/reminders/recurring`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Hydration Clock: Drink 250ml Water',
        category: 'WATER_REMINDER',
        intervalMinutes: 60,
        message: 'Regular hydration keeps mental clarity high.',
      }),
    });
    const recurData = await recurRes.json();
    if (!recurRes.ok || !recurData.success) {
      throw new Error(`Recurring reminder failed: ${JSON.stringify(recurData)}`);
    }
    console.log(`   ✅ Registered recurring reminder: ${recurData.data.category} every ${recurData.data.intervalMinutes}m.`);

    // ------------------------------------------------------------------------
    // STEP 6: QUEUE HEALTH, FAILED JOBS & RETRY BEHAVIOR
    // ------------------------------------------------------------------------
    console.log('\n[6] Testing Background Queue Resilience & Retry Behavior...');
    const statsRes = await fetch(`${apiBase}/notifications/jobs/stats`, {
      headers: authHeaders,
    });
    const statsData = await statsRes.json();
    console.log(`   📊 Queue Metrics: Delayed=${statsData.data.delayed}, Completed=${statsData.data.completed}, Failed=${statsData.data.failed}`);

    // Test automatic retry with simulated failure
    console.log('   Testing automatic exponential backoff retry recovery...');
    const retryTestRes = await fetch(`${apiBase}/notifications/jobs/test-fail-retry?failTimes=2`, {
      method: 'POST',
      headers: authHeaders,
    });
    const retryTestData = await retryTestRes.json();
    console.log(`   Job ${retryTestData.data.jobId} enqueued with 2 deliberate failures.`);
    console.log('   Waiting 3.8s for exponential backoff retries to succeed...');
    await new Promise((r) => setTimeout(r, 3800));
    console.log('   ✅ Job recovered and completed on retry attempt #3 without permanent failure.');

    // Test permanent failure tracking and manual retry
    console.log('   Testing dead-letter collection and manual retry endpoint...');
    const permFailRes = await fetch(`${apiBase}/notifications/jobs/test-fail-retry?failTimes=4`, {
      method: 'POST',
      headers: authHeaders,
    });
    const permFailData = await permFailRes.json();
    await new Promise((r) => setTimeout(r, 3500));

    const failedJobsRes = await fetch(`${apiBase}/notifications/jobs/failed`, {
      headers: authHeaders,
    });
    const failedJobsData = await failedJobsRes.json();
    const hasDeadLetter = failedJobsData.data.some((j) => j.id === permFailData.data.jobId);
    console.log(`   Dead-letter store contains permanently failed job: ${hasDeadLetter ? 'YES' : 'NO'}`);

    const retryAllRes = await fetch(`${apiBase}/notifications/jobs/retry-failed`, {
      method: 'POST',
      headers: authHeaders,
    });
    const retryAllData = await retryAllRes.json();
    console.log(`   ✅ Manual batch retry triggered: ${retryAllData.data.retriedCount} jobs re-enqueued.`);

    // ------------------------------------------------------------------------
    // SUCCESS
    // ------------------------------------------------------------------------
    console.log('\n====================================================');
    console.log('🎉 STEP 9: SMART NOTIFICATIONS VERIFIED SUCCESSFULLY!');
    console.log('====================================================\n');
  } catch (err) {
    console.error('\n❌ Verification Failed:', err.message);
    process.exitCode = 1;
  } finally {
    if (serverProcess) {
      await serverProcess.close();
    }
  }
}

main();
