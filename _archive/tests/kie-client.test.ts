/**
 * ===== KIE CLIENT TESTS =====
 * Automated tests for KieClient class
 */

import { KieClient, KiePhotoModel, KieVideoModel } from '@/lib/api/kie-client-extended';

const API_KEY = process.env.KIE_API_KEY || '';
const client = new KieClient(API_KEY);

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  taskId?: string;
  resultUrls?: string[];
  error?: string;
}

const results: TestResult[] = [];

async function runTest(
  name: string,
  fn: () => Promise<any>,
  skip: boolean = false
): Promise<TestResult> {
  console.log(`\n📝 ${name}`);
  
  if (skip) {
    console.log('   ⏭️  Skipped (premium model)');
    return { name, status: 'skipped', duration: 0 };
  }

  const startTime = Date.now();
  
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    
    console.log(`   ✅ Passed (${duration}ms)`);
    
    return {
      name,
      status: 'passed',
      duration,
      taskId: result?.taskId || result?.data?.taskId,
      resultUrls: result?.resultUrls,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    console.log(`   ❌ Failed: ${errorMsg}`);
    
    return {
      name,
      status: 'failed',
      duration,
      error: errorMsg,
    };
  }
}

// ===== TEST SUITE =====

async function testSuite() {
  console.log('='.repeat(60));
  console.log('KIE CLIENT TEST SUITE');
  console.log('='.repeat(60));

  // Test 1: Client initialization
  results.push(await runTest('Client initialization', async () => {
    if (!API_KEY) throw new Error('KIE_API_KEY not set');
    const health = await client.checkHealth();
    if (!health) throw new Error('API health check failed');
    return { taskId: 'init' };
  }));

  // Test 2: Get credits
  results.push(await runTest('Get account credits', async () => {
    const credits = await client.getCredits();
    console.log(`   Credits: ${credits}`);
    return { taskId: 'credits', credits };
  }));

  // Test 3: Text to Image - Nano Banana (available)
  results.push(await runTest('Text to Image - Nano Banana', async () => {
    const response = await client.textToImage({
      model: KiePhotoModel.NANO_BANANA,
      prompt: 'A serene mountain landscape at sunset',
      aspectRatio: '1:1',
      resolution: '1K',
    });
    console.log(`   Task ID: ${response.data.taskId}`);
    return response;
  }));

  // Test 4: Text to Image - Imagen 4 (available)
  results.push(await runTest('Text to Image - Imagen 4', async () => {
    const response = await client.textToImage({
      model: KiePhotoModel.IMAGEN_4,
      prompt: 'Ocean waves at sunset',
      aspectRatio: '16:9',
      quality: 'fast',
    });
    console.log(`   Task ID: ${response.data.taskId}`);
    return response;
  }));

  // Test 5: Text to Image - FLUX.2 (premium - skip)
  results.push(await runTest('Text to Image - FLUX.2', async () => {
    const response = await client.textToImage({
      model: KiePhotoModel.FLUX_2_PRO,
      prompt: 'Test',
      aspectRatio: '1:1',
    });
    return response;
  }, true)); // Skip premium

  // Test 6: Veo 3.1 Text to Video (available)
  results.push(await runTest('Text to Video - Veo 3.1', async () => {
    const response = await client.textToVideo({
      model: KieVideoModel.VEO_3,
      prompt: 'Mountain landscape at sunset, cinematic',
      aspectRatio: '16:9',
    });
    console.log(`   Task ID: ${response.data.taskId}`);
    return response;
  }));

  // Test 7: Veo 3.1 Fast Text to Video (available)
  results.push(await runTest('Text to Video - Veo 3.1 Fast', async () => {
    const response = await client.textToVideo({
      model: KieVideoModel.VEO_3_FAST,
      prompt: 'Ocean waves, cinematic',
      aspectRatio: '16:9',
    });
    console.log(`   Task ID: ${response.data.taskId}`);
    return response;
  }));

  // Test 8: Kling 2.6 Text to Video (premium - skip)
  results.push(await runTest('Text to Video - Kling 2.6', async () => {
    const response = await client.textToVideo({
      model: KieVideoModel.KLING_2_6_T2V,
      prompt: 'Test video',
      duration: '5',
      aspectRatio: '16:9',
    });
    return response;
  }, true)); // Skip premium

  // Test 9: Sora 2 Image to Video (available)
  results.push(await runTest('Image to Video - Sora 2', async () => {
    const response = await client.imageToVideo({
      model: KieVideoModel.SORA_2_I2V,
      prompt: 'Animate with gentle motion',
      imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920',
      duration: '10',
      aspectRatio: 'landscape',
    });
    console.log(`   Task ID: ${response.data.taskId}`);
    return response;
  }));

  // Test 10: Wait for result (Nano Banana)
  const nanoBananaTest = results.find(r => r.name.includes('Nano Banana') && r.status === 'passed');
  if (nanoBananaTest?.taskId) {
    results.push(await runTest('Wait for result - Nano Banana', async () => {
      console.log(`   Waiting for task: ${nanoBananaTest.taskId}...`);
      const result = await client.waitForResult(nanoBananaTest.taskId!, 2 * 60 * 1000);
      console.log(`   Result URLs: ${result.resultUrls?.length || 0}`);
      return result;
    }));
  }

  // Test 11: Get task info
  if (nanoBananaTest?.taskId) {
    results.push(await runTest('Get task info', async () => {
      const info = await client.getTaskInfo(nanoBananaTest.taskId!);
      console.log(`   State: ${info.data.state}`);
      return { taskId: nanoBananaTest.taskId };
    }));
  }

  // Test 12: Veo get status
  const veoTest = results.find(r => r.name.includes('Veo 3.1') && r.status === 'passed');
  if (veoTest?.taskId) {
    results.push(await runTest('Veo get status', async () => {
      const status = await client.veoGetStatus(veoTest.taskId!);
      console.log(`   Success Flag: ${status.data.successFlag}`);
      return { taskId: veoTest.taskId };
    }));
  }

  // Print summary
  printSummary();
}

function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  const total = results.length;

  console.log(`\nTotal: ${total} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}\n`);

  // Passed tests
  if (passed > 0) {
    console.log('✅ Passed Tests:');
    results
      .filter(r => r.status === 'passed')
      .forEach(r => {
        console.log(`   • ${r.name} (${r.duration}ms)`);
        if (r.taskId) console.log(`     Task ID: ${r.taskId}`);
        if (r.resultUrls) console.log(`     Results: ${r.resultUrls.length} URLs`);
      });
    console.log('');
  }

  // Failed tests
  if (failed > 0) {
    console.log('❌ Failed Tests:');
    results
      .filter(r => r.status === 'failed')
      .forEach(r => {
        console.log(`   • ${r.name}`);
        console.log(`     Error: ${r.error}`);
      });
    console.log('');
  }

  // Skipped tests
  if (skipped > 0) {
    console.log('⏭️  Skipped Tests (Premium models):');
    results
      .filter(r => r.status === 'skipped')
      .forEach(r => {
        console.log(`   • ${r.name}`);
      });
    console.log('');
  }

  console.log('='.repeat(60));
  
  // Exit code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
if (require.main === module) {
  testSuite().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

export { testSuite };
