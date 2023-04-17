/**
 * Executes a series of async callbacks sequentially and in parallel with configurable options.
 * @async
 * @param {Array<Object|Array<Object>>} callbacks - Array of callback objects or arrays of callback objects.
 *    If a callback is an array, its functions will be executed in parallel.
 * @param {Object} [options={}] - Optional configuration object.
 * @param {Function} [options.fnAfterEach] - Function to execute after each callback.
 * @param {Function} [options.fnOnError] - Function to execute when an error is encountered.
 * @param {Object} [options.logger=console] - Logger object to use for logging.
 * @param {Object} [options.ctx={}] - Context object passed to all callbacks.
 * @returns {Promise<{success: boolean, ctx: Object}>} - Object with success status and updated context.
 */
async function truePipe(callbacks, options = {}) {
  const { fnAfterEach, fnOnError, logger = console, ctx = {} } = options;
  let success = true;
  for await (const callback of callbacks) {
    const callbacksToExecute = Array.isArray(callback) ? callback : [callback];
    const executionPromises = callbacksToExecute.map((cb) => {
      const { fn, params, flags = {} } = cb;
      const {
        alwaysExecute = false,
        safeToFail = false,
        waitBefore = 0,
        waitAfter = 0,
        condition = null,
        retryCount = 0,
        timeout = 0,
      } = flags;

      if (success || alwaysExecute) {
        return executeFunction(fn, params, ctx, waitBefore, retryCount, timeout)
          .then(async (result) => {
            success = condition ? await condition(ctx) : true;
            logFunctionSuccess(logger, fn);
            await delay(waitAfter);
            return result;
          })
          .catch(async (err) => {
            success = !(await handleFunctionError(
              logger,
              fn,
              err,
              ctx,
              safeToFail,
              fnOnError
            ));
            await delay(waitAfter);
          });
      } else {
        logFunctionSkipped(logger, fn);
        return Promise.resolve();
      }
    });

    await Promise.all(executionPromises);

    if (fnAfterEach) {
      await fnAfterEach(ctx);
    }
  }

  return { success, ctx };
}

/**
 * Handles error occurred in the executed function.
 * @async
 * @param {Object} logger - Logger object for logging.
 * @param {Function} fn - The function that produced the error.
 * @param {Error} err - The error occurred.
 * @param {Object} ctx - Context object.
 * @param {boolean} safeToFail - Whether the function is allowed to fail without affecting the success status.
 * @param {Function} fnOnError - Function to execute when an error is encountered.
 * @returns {Promise<boolean>} - true if the error should affect the success status, false otherwise.
 */
async function handleFunctionError(
  logger,
  fn,
  err,
  ctx,
  safeToFail,
  fnOnError
) {
  logFunctionError(logger, fn, err);
  if (fnOnError) {
    await fnOnError(ctx);
  }
  return !safeToFail;
}

/**
 * Executes the given function with specified parameters and options.
 * @async
 * @param {Function} fn - Function to execute.
 * @param {Array} params - Parameters to pass to the function.
 * @param {Object} ctx - Context object.
 * @param {number} waitBefore - Time (ms) to wait before executing the function.
 * @param {number} retryCount - Number of retries before giving up on executing the function.
 * @param {number} timeout - Time (ms) before timing out the function execution.
 * @returns {Promise<*>} - Result of the executed function.
 */
async function executeFunction(
  fn,
  params,
  ctx,
  waitBefore,
  retryCount,
  timeout
) {
  await delay(waitBefore);
  const fnParams = params ? [...params, ctx] : [ctx];

  let executedFunction;
  try {
    if (timeout) {
      executedFunction = await Promise.race([
        fn(...fnParams),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), timeout)
        ),
      ]);
    } else {
      executedFunction = await fn(...fnParams);
    }
  } catch (err) {
    if (retryCount > 0) {
      executedFunction = await executeFunction(
        fn,
        params,
        ctx,
        waitBefore,
        retryCount - 1,
        timeout
      );
    } else {
      throw err;
    }
  }

  return executedFunction;
}

/**
 * Creates a promise that resolves after the specified number of milliseconds.
 * @param {number} ms - Time (ms) to wait.
 * @returns {Promise<void>} - A promise that resolves after the specified time.
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Logs a function success message to the logger.
 * @param {Object} logger - Logger object for logging.
 * @param {Function} fn - The function that succeeded.
 */
function logFunctionSuccess(logger, fn) {
  logger.log(`truePipe: ${fn.name}() ✅`);
}

/**
 * Logs a function skipped message to the logger.
 * @param {Object} logger - Logger object for logging.
 * @param {Function} fn - The function that was skipped.
 */
function logFunctionSkipped(logger, fn) {
  logger.log(`truePipe skipped: ${fn.name}() ❌`);
}

/**
 * Logs a function error message and error to the logger.
 * @param {Object} logger - Logger object for logging.
 * @param {Function} fn - The function that produced the error.
 * @param {Error} err - The error occurred.
 */
function logFunctionError(logger, fn, err) {
  logger.error(`truePipe error: ${fn.name}() ❌`, err);
}

module.exports = truePipe;
