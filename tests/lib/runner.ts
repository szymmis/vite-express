import { execSync, spawn } from "child_process";
import pc from "picocolors";

import { getExecutionTimeSeconds, log, wait } from "../lib/utils";

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
          `Given value is not equal to the expected one\n\tgiven: ${pc.red(
            JSON.stringify(value)
          )}\n\texpected: ${pc.green(JSON.stringify(expected))}`
        );
    },
    toMatch: (regex: RegExp) => {
      if (!regex.test(String(value)))
        throw new TestError(
          `Given value does not match regex\n\tgiven: ${pc.red(
            String(value).trim()
          )}\n\texpected to match: ${pc.green(String(regex))}`
        );
    },
  };
}

export async function expectCommandOutput(
  cmd: string,
  matchOutputRegex?: RegExp[]
) {
  const [command, ...args] = cmd.split(" ");

  const child = spawn(command, args, { detached: true });

  await new Promise<void>((resolve, reject) => {
    child.stdout?.on("data", (msg) => {
      process.stdout.write(msg);
      if (matchOutputRegex?.every((regex) => regex.test(msg))) {
        if (child.pid) process.kill(-child.pid);
        resolve();
      }
    });

    child.stderr?.on("data", (msg) => {
      process.stdout.write(msg);
      reject(
        `Process failed with error:\n${String(msg)
          .trim()
          .split("\n")
          .map((line) => `\t${pc.red(line)}`)}`
      );
    });

    child.on("close", () => {
      if (matchOutputRegex) {
        reject("Process closed without expected output");
      } else resolve();
    });
  });

  await wait(100);
}

let time: [number, number];
let passedTestCount = 0;
const tests: Test[] = [];

export async function run() {
  time = process.hrtime();

  for (const test of tests) {
    try {
      log.test(test.name);
      const time = await getExecutionTimeSeconds(
        () =>
          new Promise<void>((resolve, reject) => test.fn(resolve).catch(reject))
      );
      passedTestCount++;
      log.pass(`Done in ${pc.gray(`${time}s`)}`);
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

export function runTestFile(
  fileName: string,
  options?: { mode: "production" | "development" }
) {
  execSync(`ts-node tests/${fileName}`, {
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: options?.mode ?? "development" },
  });
}

function printSummary() {
  log.summary(
    process.hrtime(time),
    passedTestCount,
    tests.length - passedTestCount,
    tests.length
  );
}
