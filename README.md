# truePipe

`truePipe` is a utility function designed to simplify and streamline the execution of multiple functions in a sequence or in parallel, making it easier to manage complex logic in your code. With support for various execution controls and options, `truePipe` enables you to write clean, maintainable, and error-resilient code.

## Features

- Execute functions sequentially or in parallel
- Conditional execution based on previous function results
- Control execution flow with waitBefore and waitAfter delays
- Define functions with safeToFail flag to continue execution even after failure
- Retry failed functions with retryCount flag
- Execute functions with alwaysExecute flag regardless of previous functions' success
- Use fnAfterEach to perform cleanup or logging after each function
- Pass a custom logger to truePipe for granular logging control

## Installation

```sh
npm install truePipe
```

## Usage
```javascript
const truePipe = require('truePipe');

async function main() {
  const result = await truePipe(
    [
      {
        fn: function1,
        options: { waitBefore: 1000 },
      },
      {
        fn: function2,
        options: { parallel: true },
      },
      {
        fn: function3,
        options: { condition: () => true, safeToFail: true },
      },
      {
        fn: function4,
        options: { retryCount: 2 },
      },
      {
        fn: function5,
        options: { alwaysExecute: true },
      },
      {
        fn: function6,
        options: { waitAfter: 500 },
      },
    ],
    {
      logger: customLogger, // Optional custom logger
      fnAfterEach: afterEachFunction, // Optional function to run after each function
    }
  );
}
```
### Example
In this example, we'll use `truePipe` to execute a series of functions representing the steps of a simple game. The `flags` property is used to provide additional control over the execution flow.

```javascript
await truePipe(
  [
    { fn: startGame },
    // Execute createPlayer if the condition is met (ctx.players < 4)
    {
      fn: createPlayer,
      flags: { condition: (ctx) => ctx.players < 4 },
    },
    // Execute addCoins with a delay of 2 seconds
    { fn: addCoins, flags: { delay: 2000 } },
    // Execute movePlayer with a custom timeout of 5 seconds
    { fn: movePlayer, flags: { timeout: 5000 } },
    { fn: endGame },
  ],
  {
    fnAfterEach: () => console.log("Step finished."), // Log a message after each step
    fnOnError: () => console.log("An error occurred."), // Log a message when an error occurs
    logger: console, // Use the console as the logger
    ctx, // Pass the context to truePipe
  }
);
```

In the example:

- `startGame` function is executed first.
- `createPlayer` function is executed only if the condition flag's criteria are met, which is when ctx.players is less than 4.
- `addCoins` function is executed with a delay of 2 seconds.
- `movePlayer` function is executed with a custom timeout of 5 seconds.
- `endGame` function is executed at the end.

The provided options include:
- `fnAfterEach` logs a message after each step is executed.
- `fnOnError` logs a message when an error occurs during the execution of any function.
- `logger` specifies the console as the logger.
- `ctx` is the context object passed to truePipe.