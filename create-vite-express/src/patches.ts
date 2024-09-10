type Variables = {
  projectName?: string
}

export const PATCHES: Record<string, (content: string, variables: Variables) => string> = {
  "package.json": (content: string, variables: Variables) => {
    const json = JSON.parse(content);

    json["name"] = variables.projectName

    if (process.platform === "win32") {
      json.scripts["start"] = json.scripts["start"].replace(
        "NODE_ENV=production",
        "cross-env NODE_ENV=production",
      );
      json.dependencies["cross-env"] = "^7.0.3";
    } 
    
    return JSON.stringify(json, null, 2);
  },
};
