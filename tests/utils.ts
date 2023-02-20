import { execSync } from "child_process";
import fs from "fs";
import colors from "picocolors";
import { ElementHandle, Page } from "puppeteer";

export const log = {
  test: (msg: string) => {
    process.stdout.write(
      `${colors.bgYellow(colors.black(colors.bold(" TEST ")))} ${msg}\n`
    );
  },
  it: (msg: string) => {
    process.stdout.write(`\t${colors.green("✓")} ${msg}\n`);
  },
  fail: (msg: string) => {
    process.stdout.write(
      `${colors.bgRed(colors.black(colors.bold(" FAIL ")))} ${msg}\n`
    );
  },
  pass: (msg: string) => {
    process.stdout.write(
      `${colors.bgGreen(colors.black(colors.bold(" PASS ")))} ${msg}\n`
    );
  },
  summary: (
    hrtime: [number, number],
    passed: number,
    failed: number,
    total: number
  ) => {
    process.stdout.write("------------\n");
    if (passed === total) {
      log.pass(
        `${colors.green(`${passed} tests passed`)} in ${colors.gray(
          Number(hrtime[0] + hrtime[1] / 10 ** 9).toPrecision(5)
        )}s`
      );
    } else {
      log.fail(
        `${colors.red(`${failed} failed`)}, ${colors.green(
          `${passed} passed`
        )} in ${colors.gray(
          Number(hrtime[0] + hrtime[1] / 10 ** 9).toPrecision(5)
        )}s `
      );
    }
    process.stdout.write("------------\n");
  },
};

export async function getExecutionTimeSeconds(
  fn: () => unknown | Promise<unknown>
) {
  const t = process.hrtime();
  await fn();
  const t2 = process.hrtime(t);
  return Number(t2[0] + t2[1] / 10 ** 9).toPrecision(4);
}

export async function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function replaceStringInFile(
  path: string,
  searchValue: string | RegExp,
  replaceValue: string
) {
  fs.writeFileSync(
    path,
    fs.readFileSync(path, "utf-8").replace(searchValue, replaceValue),
    "utf-8"
  );
}

export async function getButton(page: Page) {
  await page.waitForSelector("button");
  return await page.$("button");
}

export async function getButtonText(
  button: ElementHandle<HTMLButtonElement> | null
) {
  return await button?.evaluate((p) => p.innerText);
}

export function installYarn() {
  execSync("yarn install", { stdio: isOutputVerbose() ? "inherit" : "ignore" });
}

export function isOutputVerbose() {
  return process.env.VERBOSE_TESTS === "true";
}
