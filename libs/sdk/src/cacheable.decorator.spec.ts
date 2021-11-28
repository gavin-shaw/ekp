import { cache, cacheable } from './cacheable.decorator';

class TestService {
  @cacheable()
  async testFunction(
    testString: string,
    testArray: string[],
    testOptional?: string,
  ) {
    return { testString, testArray, testOptional };
  }
}

describe('Cacheable decorator', () => {
  let testService: TestService;

  beforeAll(async () => {
    testService = new TestService();
  });

  beforeEach(async () => {
    cache.reset();
  });

  it('return the correct result from the method', async () => {
    const response: any = await testService.testFunction('testStringValue', [
      'testArrayElement1',
      'testArrayElement2',
    ]);

    expect(response).toBeTruthy();
    expect(response.testString).toEqual('testStringValue');
  });

  it('set the correct key in the cache', async () => {
    await testService.testFunction('testStringValue', [
      'testArrayElement1',
      'testArrayElement2',
    ]);

    const cached = await cache.get(
      'TestService.testFunction(testStringValue,[testArrayElement1,testArrayElement2])',
    );

    expect(cached).toBeTruthy();
  });
});
