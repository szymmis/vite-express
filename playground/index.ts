import express from "express";
import ViteExpress from "../dist/main";

const app = express();

ViteExpress.listen(app, 3000, () =>
  console.log("Playground is listening on port 3000...")
);
