import { AiSanitizerService } from '../src/ai/ai-sanitizer.service';
import { PriorityLevel, TaskCategoryType } from '../src/tasks/dto/create-task.dto';

async function testSanitizer() {
  console.log('🧪 Running AI Sanitizer & Validation Unit Tests...\n');
  const sanitizer = new AiSanitizerService();

  let passed = 0;
  let failed = 0;

  function assert(desc: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  // Test 1: Valid study task
  const raw1 = {
    intent: 'CREATE_TASK',
    task: {
      title: 'Study Java DSA',
      date: '2026-10-06',
      time: '19:00',
      duration: 60,
      category: 'STUDY',
      priority: 'MEDIUM',
    },
  };
  const val1 = await sanitizer.validateAndSanitize(raw1);
  assert('Study Java DSA validated', val1.title === 'Study Java DSA');
  assert('Category is STUDY', val1.category === TaskCategoryType.STUDY);
  assert('Time is 19:00', val1.time === '19:00');
  assert('EndTime is 20:00', val1.endTime === '20:00');
  assert('Duration is 60', val1.duration === 60);

  // Test 2: Malicious / Prompt Injection stripping
  const raw2 = {
    intent: 'CREATE_TASK',
    task: {
      title: '<script>alert("hacked")</script>Study Physics; DROP TABLE tasks;--',
      date: 'invalid-date',
      time: '29:99',
      duration: -500,
      category: 'INVALID_CATEGORY',
      priority: 'SUPER_URGENT',
      notes: '<img src=x onerror=alert(1)>Important notes',
      tags: ['<tag>', 'NORMAL-TAG', 'TOO-LONG-TAG-1234567890123456789012345678901234567890'],
    },
  };
  const val2 = await sanitizer.validateAndSanitize(raw2);
  assert('HTML script stripped from title', !val2.title.includes('<script>') && !val2.title.includes('</script>'));
  assert('Invalid date neutralized to null', val2.date === null);
  assert('Invalid time neutralized to null', val2.time === null);
  assert('Negative duration neutralized to null', val2.duration === null);
  assert('Invalid category defaulted to OTHER', val2.category === TaskCategoryType.OTHER);
  assert('Invalid priority defaulted to MEDIUM', val2.priority === PriorityLevel.MEDIUM);
  assert('HTML stripped from notes', !val2.notes?.includes('<img'));
  assert('Tags sanitized properly', val2.tags?.includes('normal-tag') && !val2.tags?.some((t) => t.includes('<')));

  // Test 3: Duration clamp test (> 24 hours)
  const raw3 = {
    task: {
      title: 'Long task',
      duration: 5000,
    },
  };
  const val3 = await sanitizer.validateAndSanitize(raw3);
  assert('Duration clamped to 1440 mins max', val3.duration === 1440);

  // Test 4: Conversion to CreateTaskDto
  const createDto = sanitizer.toCreateTaskDto(val1);
  assert('CreateTaskDto title preserved', createDto.title === 'Study Java DSA');
  assert('CreateTaskDto category matches', createDto.category === TaskCategoryType.STUDY);
  assert('CreateTaskDto duration matches', createDto.estimatedDuration === 60);

  console.log(`\nSanitizer Unit Tests Summary: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

testSanitizer().catch((err) => {
  console.error(err);
  process.exit(1);
});
