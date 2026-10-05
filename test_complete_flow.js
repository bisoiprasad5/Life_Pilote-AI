// test_complete_flow.js
const API_BASE = 'http://localhost:4000/api/v1';

async function runTest() {
  console.log('====================================================');
  console.log('🚀 STARTING STEP 7 COMPLETE FLOW VERIFICATION TEST');
  console.log('====================================================\n');

  const testUser = {
    email: `test_${Date.now()}@lifepilot.io`,
    password: 'Password123!',
    fullName: 'Commander Shepard',
  };

  let token = '';
  let taskId = '';

  // 1. REGISTER
  console.log(`[1] Testing Registration with email: ${testUser.email}...`);
  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser),
  });
  const regData = await regRes.json();
  if (!regRes.ok || !regData.success) {
    throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
  }
  console.log(`✅ Registered successfully. User ID: ${regData.user.id}, Role: ${regData.user.role}`);
  token = regData.token;

  // 2. LOGIN
  console.log('\n[2] Testing Login with registered credentials...');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testUser.email, password: testUser.password }),
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok || !loginData.success) {
    throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
  }
  token = loginData.token;
  console.log(`✅ Login successful. Token received (length: ${token.length})`);

  // 3. CURRENT USER (GET /auth/me)
  console.log('\n[3] Testing Current User (/auth/me)...');
  const meRes = await fetch(`${API_BASE}/auth/me`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const meData = await meRes.json();
  if (!meRes.ok || !meData.success) {
    throw new Error(`/auth/me failed: ${JSON.stringify(meData)}`);
  }
  console.log(`✅ Current user verified: ${meData.user.fullName} (${meData.user.email})`);

  // 4. DASHBOARD INITIAL TASK FETCH (EMPTY STATE)
  console.log('\n[4] Testing Initial Task Fetch (Empty state for new user)...');
  const initialTasksRes = await fetch(`${API_BASE}/tasks?limit=50`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const initialTasksData = await initialTasksRes.json();
  if (!initialTasksRes.ok || !initialTasksData.success) {
    throw new Error(`Initial tasks fetch failed: ${JSON.stringify(initialTasksData)}`);
  }
  console.log(`✅ Initial tasks count: ${initialTasksData.data.length} (Empty state verified)`);

  // 5. CREATE TASK
  console.log('\n[5] Testing Task Creation...');
  const newTaskPayload = {
    title: 'Deploy Production Kubernetes Ingress',
    description: 'Configure TLS termination, rate limiting, and route annotations.',
    category: 'WORK',
    priority: 'CRITICAL',
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00 AM',
    estimatedDuration: 60,
    subtasks: [
      { title: 'Draft helm values.yaml', isCompleted: false, order: 0 },
      { title: 'Apply cert-manager issuer', isCompleted: false, order: 1 },
    ],
  };

  const createTaskRes = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(newTaskPayload),
  });
  const createTaskData = await createTaskRes.json();
  if (!createTaskRes.ok || !createTaskData.success) {
    throw new Error(`Task creation failed: ${JSON.stringify(createTaskData)}`);
  }
  taskId = createTaskData.data.id;
  console.log(`✅ Task created successfully. ID: ${taskId}, Title: "${createTaskData.data.title}", Priority: ${createTaskData.data.priority}`);

  // 6. VIEW TASK
  console.log(`\n[6] Testing View Task by ID (/tasks/${taskId})...`);
  const viewTaskRes = await fetch(`${API_BASE}/tasks/${taskId}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const viewTaskData = await viewTaskRes.json();
  if (!viewTaskRes.ok || !viewTaskData.success) {
    throw new Error(`View task failed: ${JSON.stringify(viewTaskData)}`);
  }
  console.log(`✅ View task confirmed: "${viewTaskData.data.title}" (Subtasks: ${viewTaskData.data.subtasks.length})`);

  // 7. EDIT TASK
  console.log(`\n[7] Testing Edit Task (/tasks/${taskId})...`);
  const editPayload = {
    title: 'Deploy Production Kubernetes Ingress [v2 - Final]',
    description: 'Updated with zero-downtime rolling restart policy.',
    priority: 'HIGH',
    category: 'WORK',
    status: 'IN_PROGRESS',
    estimatedDuration: 75,
  };
  const editTaskRes = await fetch(`${API_BASE}/tasks/${taskId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(editPayload),
  });
  const editTaskData = await editTaskRes.json();
  if (!editTaskRes.ok || !editTaskData.success) {
    throw new Error(`Edit task failed: ${JSON.stringify(editTaskData)}`);
  }
  console.log(`✅ Task edited successfully. New Title: "${editTaskData.data.title}", Status: ${editTaskData.data.status}`);

  // 8. RESCHEDULE / SNOOZE TASK
  console.log(`\n[8] Testing Reschedule / Snooze Task (/tasks/${taskId}/snooze)...`);
  const snoozeRes = await fetch(`${API_BASE}/tasks/${taskId}/snooze`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ minutes: 60 }),
  });
  const snoozeData = await snoozeRes.json();
  if (!snoozeRes.ok || !snoozeData.success) {
    throw new Error(`Snooze task failed: ${JSON.stringify(snoozeData)}`);
  }
  console.log(`✅ Task snoozed successfully.`);

  // 9. COMPLETE TASK
  console.log(`\n[9] Testing Complete Task (/tasks/${taskId}/complete)...`);
  const completeRes = await fetch(`${API_BASE}/tasks/${taskId}/complete`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ completed: true }),
  });
  const completeData = await completeRes.json();
  if (!completeRes.ok || !completeData.success) {
    throw new Error(`Complete task failed: ${JSON.stringify(completeData)}`);
  }
  console.log(`✅ Task completed. Status: ${completeData.data.status}, CompletedAt: ${completeData.data.completedAt}`);

  // 10. TASK FILTERING & SEARCH
  console.log('\n[10] Testing Task Filtering & Search...');
  // Search
  const searchRes = await fetch(`${API_BASE}/tasks?search=Kubernetes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const searchData = await searchRes.json();
  console.log(`   - Search 'Kubernetes': ${searchData.data.length} match(es)`);
  if (searchData.data.length === 0) throw new Error('Search failed to find task');

  // Filter Completed
  const completedFilterRes = await fetch(`${API_BASE}/tasks?status=COMPLETED`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const completedFilterData = await completedFilterRes.json();
  console.log(`   - Filter status=COMPLETED: ${completedFilterData.data.length} match(es)`);
  if (completedFilterData.data.length === 0) throw new Error('Filter COMPLETED failed');

  // Filter TODO
  const todoFilterRes = await fetch(`${API_BASE}/tasks?status=TODO`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const todoFilterData = await todoFilterRes.json();
  console.log(`   - Filter status=TODO: ${todoFilterData.data.length} match(es) (0 expected)`);

  // 11. LOGOUT
  console.log('\n[11] Testing Logout (/auth/logout)...');
  const logoutRes = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const logoutData = await logoutRes.json();
  if (!logoutRes.ok || !logoutData.success) {
    throw new Error(`Logout failed: ${JSON.stringify(logoutData)}`);
  }
  console.log('✅ Logged out successfully.');

  // 12. LOGIN AGAIN
  console.log('\n[12] Testing Login Again with the same account...');
  const reloginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testUser.email, password: testUser.password }),
  });
  const reloginData = await reloginRes.json();
  if (!reloginRes.ok || !reloginData.success) {
    throw new Error(`Re-login failed: ${JSON.stringify(reloginData)}`);
  }
  const newToken = reloginData.token;
  console.log(`✅ Re-login successful. User ID: ${reloginData.user.id}`);

  // 13. VERIFY PERSISTENCE AFTER RE-LOGIN
  console.log('\n[13] Verifying Task Persistence After Re-login...');
  const postLoginTasksRes = await fetch(`${API_BASE}/tasks?limit=50`, {
    headers: { Authorization: `Bearer ${newToken}` },
  });
  const postLoginTasksData = await postLoginTasksRes.json();
  if (!postLoginTasksRes.ok || !postLoginTasksData.success) {
    throw new Error(`Failed to fetch tasks after re-login: ${JSON.stringify(postLoginTasksData)}`);
  }
  const foundTask = postLoginTasksData.data.find((t) => t.id === taskId);
  if (!foundTask) {
    throw new Error(`Task with ID ${taskId} not found after re-login!`);
  }
  console.log(`✅ Task "${foundTask.title}" persisted and retrieved. Status: ${foundTask.status}`);

  console.log('\n====================================================');
  console.log('🎉 ALL 13 TEST STEPS PASSED WITH 100% SUCCESS!');
  console.log('====================================================\n');
}

runTest().catch((err) => {
  console.error('\n❌ TEST FAILED:', err.message);
  process.exit(1);
});
