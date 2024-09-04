export const PATCHES: Record<string, (content: string) => string> = {
  "package.json": (content: string) => {
    if (process.platform === "win32") {
      const json = JSON.parse(content);
      json.scripts["start"] = json.scripts["start"].replace(
        "NODE_ENV=production",
        "cross-env NODE_ENV=production",
      );
      json.dependencies["cross-env"] = "^7.0.3";
      return JSON.stringify(json, null, 2);
    } else {
      return content;
    }
  },
};
