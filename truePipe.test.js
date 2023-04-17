const truePipe = require("./truePipe");

describe("truePipe", () => {
  const asyncFunction1 = jest.fn(async (ctx) => {
    ctx.value = 1;
  });

  const asyncFunction2 = jest.fn(async (ctx) => {
    ctx.value = 2;
  });

  const asyncFunction3 = jest.fn(async (ctx) => {
    ctx.value = 3;
  });

  const asyncFunctionWithError = jest.fn(async (ctx) => {
    throw new Error("Test error");
  });

  const afterEachFunction = jest.fn();
  const onErrorFunction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should execute functions in parallel", async () => {
    const step1 = jest.fn(async (ctx) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      ctx.step1 = true;
    });

    const step2 = jest.fn(async (ctx) => {
      ctx.step2 = true;
    });

    const step3 = jest.fn(async (ctx) => {
      ctx.step3 = true;
    });

    const startTime = Date.now();
    const { ctx } = await truePipe([[step1, step2], step3]);
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(ctx.step1).toBe(true);
    expect(ctx.step2).toBe(true);
    expect(ctx.step3).toBe(true);
    expect(duration).toBeLessThanOrEqual(200);
    expect(step1).toHaveBeenCalledTimes(1);
    expect(step2).toHaveBeenCalledTimes(1);
    expect(step3).toHaveBeenCalledTimes(1);
  });

  test("should stop execution if condition returns false", async () => {
    const conditionFunction = (ctx) => ctx.value < 2;

    const callbacks = [
      { fn: asyncFunction1, flags: { condition: conditionFunction } },
      { fn: asyncFunction2, flags: { condition: conditionFunction } },
      { fn: asyncFunction3, flags: { condition: conditionFunction } },
    ];

    const { success, ctx } = await truePipe(callbacks, { ctx: { value: 0 } });

    expect(success).toBe(false);
    expect(ctx.value).toBe(2);
    expect(asyncFunction1).toHaveBeenCalledTimes(1);
    expect(asyncFunction2).toHaveBeenCalledTimes(1);
    expect(asyncFunction3).toHaveBeenCalledTimes(0);
  });

  test("should handle waitBefore and waitAfter delays", async () => {
    const callbacks = [
      { fn: asyncFunction1, flags: { waitAfter: 100 } },
      { fn: asyncFunction2, flags: { waitBefore: 100 } },
    ];

    const startTime = Date.now();
    const { success, ctx } = await truePipe(callbacks, { ctx: { value: 0 } });
    const endTime = Date.now();

    expect(success).toBe(true);
    expect(ctx.value).toBe(2);
    expect(asyncFunction1).toHaveBeenCalledTimes(1);
    expect(asyncFunction2).toHaveBeenCalledTimes(1);
    expect(endTime - startTime).toBeGreaterThanOrEqual(200);
  });

  test("should continue execution after the first failed function if safeToFail is true", async () => {
    const callbacks = [
      { fn: asyncFunction1 },
      {
        fn: asyncFunctionWithError,
        flags: { safeToFail: true },
      },
      { fn: asyncFunction2 },
    ];

    const { success, ctx } = await truePipe(callbacks, {
      ctx: { value: 0 },
      fnOnError: onErrorFunction,
    });

    expect(success).toBe(true);
    expect(ctx.value).toBe(2);
    expect(asyncFunction1).toHaveBeenCalledTimes(1);
    expect(asyncFunctionWithError).toHaveBeenCalledTimes(1);
    expect(asyncFunction2).toHaveBeenCalledTimes(1);
    expect(onErrorFunction).toHaveBeenCalledTimes(1);
  });

  test("should execute all functions and return success", async () => {
    const callbacks = [
      { fn: asyncFunction1 },
      { fn: asyncFunction2 },
      { fn: asyncFunction3 },
    ];

    const { success, ctx } = await truePipe(callbacks, { ctx: { value: 0 } });

    expect(success).toBe(true);
    expect(ctx.value).toBe(3);
    expect(asyncFunction1).toHaveBeenCalledTimes(1);
    expect(asyncFunction2).toHaveBeenCalledTimes(1);
    expect(asyncFunction3).toHaveBeenCalledTimes(1);
  });

  test("should stop execution after the first failed function", async () => {
    const callbacks = [
      { fn: asyncFunction1 },
      {
        fn: asyncFunctionWithError,
        flags: { safeToFail: false },
      },
      { fn: asyncFunction2 },
    ];

    const { success, ctx } = await truePipe(callbacks, { ctx: { value: 0 } });

    expect(success).toBe(false);
    expect(ctx.value).toBe(1);
    expect(asyncFunction1).toHaveBeenCalledTimes(1);
    expect(asyncFunctionWithError).toHaveBeenCalledTimes(1);
    expect(asyncFunction2).toHaveBeenCalledTimes(0);
    expect(onErrorFunction).toHaveBeenCalledTimes(0);
  });

  test("should execute functions with alwaysExecute flag regardless of the previous function's success", async () => {
    const callbacks = [
      { fn: asyncFunction1 },
      { fn: asyncFunctionWithError },
      { fn: asyncFunction2, flags: { alwaysExecute: true } },
    ];

    const { success, ctx } = await truePipe(callbacks, { ctx: { value: 0 } });

    expect(success).toBe(true);
    expect(ctx.value).toBe(2);
    expect(asyncFunction1).toHaveBeenCalledTimes(1);
    expect(asyncFunctionWithError).toHaveBeenCalledTimes(1);
    expect(asyncFunction2).toHaveBeenCalledTimes(1);
  });

  test("should execute fnAfterEach after each function", async () => {
    const callbacks = [
      { fn: asyncFunction1 },
      { fn: asyncFunction2 },
      { fn: asyncFunction3 },
    ];

    const { success, ctx } = await truePipe(callbacks, {
      ctx: { value: 0 },
      fnAfterEach: afterEachFunction,
    });

    expect(success).toBe(true);
    expect(ctx.value).toBe(3);
    expect(asyncFunction1).toHaveBeenCalledTimes(1);
    expect(asyncFunction2).toHaveBeenCalledTimes(1);
    expect(asyncFunction3).toHaveBeenCalledTimes(1);
    expect(afterEachFunction).toHaveBeenCalledTimes(3);
  });

  test("should pass custom logger to truePipe", async () => {
    const customLogger = {
      log: jest.fn(),
      error: jest.fn(),
    };

    const callbacks = [
      { fn: asyncFunction1 },
      { fn: asyncFunction2 },
      { fn: asyncFunction3 },
    ];

    const { success, ctx } = await truePipe(callbacks, {
      ctx: { value: 0 },
      logger: customLogger,
    });

    expect(success).toBe(true);
    expect(ctx.value).toBe(3);
    expect(customLogger.log).toHaveBeenCalledTimes(3);
    expect(customLogger.error).toHaveBeenCalledTimes(0);
  });

  test("should execute function twice if retryCount flag is 1", async () => {
    const callbacks = [
      { fn: asyncFunction1 },
      { fn: asyncFunctionWithError, flags: { retryCount: 1 } },
      { fn: asyncFunction2, flags: { alwaysExecute: true } },
    ];

    const { success, ctx } = await truePipe(callbacks, { ctx: { value: 0 } });

    expect(success).toBe(true);
    expect(ctx.value).toBe(2);
    expect(asyncFunction1).toHaveBeenCalledTimes(1);
    expect(asyncFunctionWithError).toHaveBeenCalledTimes(2);
    expect(asyncFunction2).toHaveBeenCalledTimes(1);
  });
});
