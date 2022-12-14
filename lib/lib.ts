import colors from "picocolors";

export function info(msg: string) {
  const timestamp = new Date().toLocaleString("en-US").split(",")[1].trim();
  console.log(
    `${colors.dim(timestamp)} ${colors.bold(
      colors.cyan("[vite-express]"),
    )} ${colors.green(msg)}`,
  );
}
