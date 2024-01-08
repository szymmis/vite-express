import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { expect } from "vitest";

export function cmd(command: string, options?: { verbose?: boolean }) {
  return new CommandRunBuilder(command, options?.verbose);
}

type Action = (process: ChildProcessWithoutNullStreams) => Promise<void>;

class CommandActionsQueue {
  private index = 0;
  private queue: Action[] = [];

  push(fn: (process: ChildProcessWithoutNullStreams) => Promise<void>) {
    this.queue.push(fn);
  }

  async run(process: ChildProcessWithoutNullStreams, onFinish: () => void) {
    const fn = this.queue[this.index++];
    if (fn) {
      await fn(process);
      await this.run(process, onFinish);
    } else {
      process.stdin?.end();
      onFinish();
    }
  }
}

type CommandAssertion = (proc: ChildProcessWithoutNullStreams) => void;

class CommandStream {
  private stream: string = "";

  value() {
    return this.stream;
  }

  write(msg: string) {
    this.stream += msg;
  }
}

class CommandRunBuilder {
  private options = { cwd: process.cwd() };

  private command: string;
  private args: string[];

  private stdout = new CommandStream();
  private stderr = new CommandStream();

  private assertions: CommandAssertion[] = [];
  private queue = new CommandActionsQueue();

  constructor(
    command: string,
    private quiet?: boolean,
  ) {
    const [bin, ...args] = command.split(" ");
    this.command = bin;
    this.args = args;
  }

  code(code: number) {
    this.assertions.push((proc) => {
      expect(proc.exitCode).toBe(code);
    });

    return this;
  }

  cwd(path: string) {
    this.options.cwd = path;

    return this;
  }

  tmpdir() {
    return this.cwd(fs.mkdtempSync(path.join(os.tmpdir(), "/")));
  }

  success() {
    return this.code(0);
  }

  error() {
    this.assertions.push((proc) => {
      expect(proc.exitCode).toBeGreaterThan(0);
    });

    return this;
  }

  private streamEqual(stream: CommandStream, input: string) {
    this.assertions.push(() => {
      expect(stream.value()).toEqual(input);
    });

    return this;
  }

  private streamMatches(stream: CommandStream, pattern: string | RegExp) {
    this.assertions.push(() => {
      expect(stream.value()).toMatch(pattern);
    });

    return this;
  }

  stdoutEqual(input: string) {
    return this.streamEqual(this.stdout, input);
  }

  stdoutMatches(pattern: string | RegExp) {
    return this.streamMatches(this.stdout, pattern);
  }

  stderrEqual(input: string) {
    return this.streamEqual(this.stderr, input);
  }

  stderrMatches(pattern: string | RegExp) {
    return this.streamMatches(this.stderr, pattern);
  }

  awaitOutput(msg: string | RegExp | (string | RegExp)[]) {
    this.queue.push(async (proc) => {
      return new Promise((resolve) => {
        proc.stdout?.on("data", (data: object) => {
          if (Array.isArray(msg)) {
            if (msg.every((pattern) => data.toString().match(pattern)))
              resolve();
          } else {
            if (data.toString().match(msg)) resolve();
          }
        });
      });
    });

    return this;
  }

  wait(ms: number) {
    this.queue.push(async () => {
      return new Promise((resolve) => {
        setTimeout(resolve, ms);
      });
    });

    return this;
  }

  close() {
    this.queue.push(async (proc) => {
      return new Promise((resolve, reject) => {
        if (proc.exitCode !== null) return resolve();

        if (proc.pid) {
          process.kill(-proc.pid);
          resolve();
        } else {
          reject("Cannot close child process: Missing PID");
        }
      });
    });

    return this;
  }

  write(msg: string) {
    this.queue.push(async (proc) => {
      proc.stdin?.write(msg + "\n");
    });

    return this;
  }

  key(key: "enter" | "space" | "esc" | "left" | "up" | "right" | "down") {
    const keyCode = () => {
      switch (key) {
        case "up":
          return "\u001b[A";
        case "down":
          return "\u001b[B";
        case "right":
          return "\u001b[C";
        case "left":
          return "\u001b[D";
        default:
          throw new Error(`Unsupported key ${key}`);
      }
    };

    this.queue.push(async (proc) => {
      proc.stdin?.write(keyCode());
    });

    return this;
  }

  enter() {
    return this.write("");
  }

  assert() {
    return new Promise<void>((resolve, reject) => {
      const proc = spawn(this.command, this.args, {
        ...this.options,
        detached: true,
      });

      process.on("exit", () => {
        if (proc.pid) process.kill(-proc.pid);
      });

      proc.stdout?.on("data", (data) => {
        this.stdout.write(data.toString());
        if (!this.quiet) console.log(data.toString());
      });
      proc.stderr?.on("data", (err) => {
        this.stderr.write(err.toString());
        if (!this.quiet) console.error(err.toString());
      });

      const running = new Promise<void>((resolve) =>
        proc.on("close", () => resolve()).on("exit", () => resolve()),
      );

      proc.on("spawn", () => {
        this.queue.run(proc, () => {
          running.then(() => {
            this.assertions.forEach((assertion) => {
              try {
                assertion(proc);
              } catch (err) {
                reject(err);
              }
            });

            resolve();
          });
        });
      });
    });
  }

  run(): Promise<{
    process: ChildProcessWithoutNullStreams;
    close: () => Promise<void>;
  }> {
    return new Promise((resolve, reject) => {
      const proc = spawn(this.command, this.args, {
        ...this.options,
        detached: true,
      });

      process.on("exit", () => {
        if (proc.pid) process.kill(-proc.pid);
      });

      proc.stdout?.on("data", (data) => {
        this.stdout.write(data.toString());
        if (!this.quiet) console.log(data.toString());
      });
      proc.stderr?.on("data", (err) => {
        this.stderr.write(err.toString());
        if (!this.quiet) console.error(err.toString());
      });

      new Promise<void>(() => proc.on("close", () => reject()));

      proc.on("spawn", () => {
        this.queue.run(proc, () => {
          resolve({
            process: proc,
            close() {
              return new Promise((resolve) => {
                process.kill(-proc.pid!);
                proc.on("exit", () => {
                  resolve();
                });
              });
            },
          });
        });
      });
    });
  }
}

export function replaceStringInFile(
  path: string,
  searchValue: string | RegExp | null,
  replaceValue: string,
) {
  fs.writeFileSync(
    path,
    searchValue !== null
      ? fs.readFileSync(path, "utf-8").replace(searchValue, replaceValue)
      : replaceValue,
    "utf-8",
  );
}

export async function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
