// test_calendar_flow.js
const API_BASE = 'http://localhost:4000/api/v1';

async function runCalendarTests() {
  console.log('====================================================');
  console.log('📅 STARTING STEP 8: CALENDAR & SCHEDULE VERIFICATION');
  console.log('====================================================\n');

  const testUser = {
    email: `calendar_test_${Date.now()}@lifepilot.io`,
    password: 'Password123!',
    fullName: 'Dr. Gordon Freeman',
  };

  // 1. REGISTER & GET TOKEN
  console.log(`[1] Registering test user: ${testUser.email}...`);
  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser),
  });
  const regData = await regRes.json();
  if (!regRes.ok || !regData.success) {
    throw new Error(`Register failed: ${JSON.stringify(regData)}`);
  }
  const token = regData.token;
  console.log(`✅ Authenticated with token. User ID: ${regData.user.id}`);

  // 2. CREATE CALENDAR EVENT
  console.log('\n[2] Testing Create Calendar Event (POST /calendar/events)...');
  const today = new Date().toISOString().split('T')[0];
  const eventPayload = {
    title: 'Distributed Systems Tech Sync',
    description: 'Review consensus replication logs and latency profiling.',
    location: 'Conference Room 4B / Meet',
    startTime: `${today}T10:00:00.000Z`,
    endTime: `${today}T11:00:00.000Z`,
    isAllDay: false,
    color: '#3b82f6',
    category: 'WORK',
  };

  const createEventRes = await fetch(`${API_BASE}/calendar/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(eventPayload),
  });
  const createEventData = await createEventRes.json();
  if (!createEventRes.ok || !createEventData.success) {
    throw new Error(`Create event failed: ${JSON.stringify(createEventData)}`);
  }
  const eventId = createEventData.data.id;
  console.log(`✅ Event created. ID: ${eventId}, Title: "${createEventData.data.title}"`);

  // 3. GET CALENDAR EVENTS LIST
  console.log('\n[3] Testing Fetch Calendar Events (GET /calendar/events)...');
  const getEventsRes = await fetch(`${API_BASE}/calendar/events`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const getEventsData = await getEventsRes.json();
  if (!getEventsRes.ok || !getEventsData.success) {
    throw new Error(`Get events failed: ${JSON.stringify(getEventsData)}`);
  }
  const found = getEventsData.data.find((e) => e.id === eventId);
  if (!found) throw new Error(`Created event ${eventId} not found in events list!`);
  console.log(`✅ Event confirmed in list. Total events: ${getEventsData.data.length}`);

  // 4. GET SINGLE EVENT
  console.log(`\n[4] Testing Get Event by ID (GET /calendar/events/${eventId})...`);
  const getSingleRes = await fetch(`${API_BASE}/calendar/events/${eventId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const getSingleData = await getSingleRes.json();
  if (!getSingleRes.ok || !getSingleData.success) {
    throw new Error(`Get single event failed: ${JSON.stringify(getSingleData)}`);
  }
  console.log(`✅ Single event verified: "${getSingleData.data.title}" at "${getSingleData.data.location}"`);

  // 5. EDIT CALENDAR EVENT
  console.log(`\n[5] Testing Update Event (PUT /calendar/events/${eventId})...`);
  const updatePayload = {
    title: 'Distributed Systems Architecture Review [v2]',
    location: 'Executive Boardroom',
    startTime: `${today}T10:00:00.000Z`,
    endTime: `${today}T11:30:00.000Z`, // extended to 90m
    color: '#8b5cf6',
  };
  const updateRes = await fetch(`${API_BASE}/calendar/events/${eventId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updatePayload),
  });
  const updateData = await updateRes.json();
  if (!updateRes.ok || !updateData.success) {
    throw new Error(`Update event failed: ${JSON.stringify(updateData)}`);
  }
  console.log(`✅ Event updated: "${updateData.data.title}", Location: "${updateData.data.location}", End: ${updateData.data.endTime}`);

  // 6. CONFLICT DETECTION (POST /calendar/check-conflicts)
  console.log('\n[6] Testing Conflict Detection API...');
  // A. Overlapping time slot: 10:30 to 11:15 (overlaps with 10:00 to 11:30)
  const overlapCheckRes = await fetch(`${API_BASE}/calendar/check-conflicts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      startTime: `${today}T10:30:00.000Z`,
      endTime: `${today}T11:15:00.000Z`,
    }),
  });
  const overlapData = await overlapCheckRes.json();
  console.log(`   - Overlapping slot check: hasConflict = ${overlapData.hasConflict} (${overlapData.conflicts?.length} conflict)`);
  if (!overlapData.hasConflict) throw new Error('Expected conflict was not detected!');
  console.log(`   ✅ Correctly flagged conflict with: "${overlapData.conflicts[0].title}"`);

  // B. Free time slot: 14:00 to 15:00
  const freeCheckRes = await fetch(`${API_BASE}/calendar/check-conflicts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      startTime: `${today}T14:00:00.000Z`,
      endTime: `${today}T15:00:00.000Z`,
    }),
  });
  const freeData = await freeCheckRes.json();
  console.log(`   - Free slot check: hasConflict = ${freeData.hasConflict}`);
  if (freeData.hasConflict) throw new Error('Unexpected conflict on free slot!');
  console.log('   ✅ Free slot verified with no conflicts');

  // 7. TASK INTEGRATION & UNIFIED SCHEDULE
  console.log('\n[7] Testing Task Integration & Unified Schedule (GET /calendar/schedule)...');
  // Create a timed task
  const taskRes = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: 'Complete Distributed Testing Suite',
      category: 'WORK',
      priority: 'CRITICAL',
      date: today,
      startTime: '10:30 AM', // conflicts with the 10:00 - 11:30 event!
      estimatedDuration: 45,
      deadline: `${today}T18:00:00.000Z`,
    }),
  });
  const taskData = await taskRes.json();
  const taskId = taskData.data.id;
  console.log(`   - Created Task: "${taskData.data.title}" (ID: ${taskId}) at 10:30 AM with Deadline at 18:00`);

  // Fetch unified schedule
  const scheduleRes = await fetch(`${API_BASE}/calendar/schedule`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const scheduleData = await scheduleRes.json();
  console.log(`   - Unified schedule count: ${scheduleData.data.length} items`);
  console.log(`   - Detected schedule conflicts: ${scheduleData.conflictsCount}`);
  if (scheduleData.conflictsCount === 0) {
    throw new Error('Unified schedule failed to compute conflict between overlapping event and task!');
  }
  console.log('   ✅ Unified schedule successfully computed overlap conflicts across tasks and calendar events');

  // 8. RESCHEDULE TASK IN CALENDAR
  console.log('\n[8] Testing Reschedule Task in Calendar...');
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const rescheduleRes = await fetch(`${API_BASE}/tasks/${taskId}/reschedule`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      date: tomorrow,
      startTime: '02:00 PM',
    }),
  });
  const rescheduleData = await rescheduleRes.json();
  if (!rescheduleRes.ok || !rescheduleData.success) {
    throw new Error(`Reschedule task failed: ${JSON.stringify(rescheduleData)}`);
  }
  console.log(`   ✅ Task rescheduled to ${rescheduleData.data.date}, time: ${rescheduleData.data.startTime}`);

  // 9. DELETE CALENDAR EVENT
  console.log(`\n[9] Testing Delete Calendar Event (DELETE /calendar/events/${eventId})...`);
  const delRes = await fetch(`${API_BASE}/calendar/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const delData = await delRes.json();
  if (!delRes.ok || !delData.success) {
    throw new Error(`Delete event failed: ${JSON.stringify(delData)}`);
  }
  console.log(`✅ Event deleted. Message: "${delData.message}"`);

  // 10. VERIFY POST-DELETION SCHEDULE
  console.log('\n[10] Verifying Unified Schedule After Deletion...');
  const finalScheduleRes = await fetch(`${API_BASE}/calendar/schedule`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const finalScheduleData = await finalScheduleRes.json();
  const deletedEventStillPresent = finalScheduleData.data.some((i) => i.id === eventId);
  if (deletedEventStillPresent) {
    throw new Error('Deleted event is still present in schedule!');
  }
  console.log(`✅ Event successfully absent from schedule. Remaining items: ${finalScheduleData.data.length}`);

  console.log('\n====================================================');
  console.log('🎉 ALL 10 CALENDAR & SCHEDULE TESTS PASSED (100%)!');
  console.log('====================================================\n');
}

runCalendarTests().catch((err) => {
  console.error('\n❌ CALENDAR TEST FAILED:', err.message);
  process.exit(1);
});
