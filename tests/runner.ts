import colors from "picocolors";

import { getExecutionTimeSeconds, log } from "./utils";

type Test = {
  name: string;
  fn: (done: () => void) => Promise<void>;
};
export class TestError extends Error {}

export function test(description: string, fn: Test["fn"]) {
  tests.push({
    name: description,
    fn: async (done) =>
      fn(done).catch((e) => {
        throw e;
      }),
  });
}

export function it(description: string) {
  log.it(description);
}

export function expect<T>(value: T) {
  return {
    toBe: (expected: T) => {
      if (value !== expected)
        throw new TestError(
          `Given value is not equal to the expected one\n\tgiven: ${colors.red(
            JSON.stringify(value)
          )}\n\texpected: ${colors.green(JSON.stringify(expected))}`
        );
    },
    toMatch: (regex: RegExp) => {
      if (!regex.test(String(value)))
        throw new TestError(
          `Given value does not match regex\n\tgiven: ${colors.red(
            String(value).trim()
          )}\n\texpected to match: ${colors.green(String(regex))}`
        );
    },
  };
}

let time: [number, number];
let passedTestCount = 0;
const tests: Test[] = [];

export async function run() {
  silenceConsole();

  time = process.hrtime();

  for (const test of tests) {
    try {
      log.test(test.name);
      const time = await getExecutionTimeSeconds(
        () =>
          new Promise<void>((resolve, reject) => test.fn(resolve).catch(reject))
      );
      passedTestCount++;
      log.pass(`Done in ${colors.gray(`${time}s`)}`);
    } catch (e) {
      if (e instanceof TestError) {
        log.fail(e.message);
        printSummary();
        process.exit(1);
      } else throw e;
    }
  }

  printSummary();
  process.exit(0);
}

process.on("unhandledRejection", (e) => {
  log.fail(e instanceof TestError ? e.message : String(e));
  printSummary();
  process.exit(1);
});

function printSummary() {
  log.summary(
    process.hrtime(time),
    passedTestCount,
    tests.length - passedTestCount,
    tests.length
  );
}

function silenceConsole() {
  console.log = () => 1;
}
