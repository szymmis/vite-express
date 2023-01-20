import express from "express";
import ViteExpress from "vite-express";

const app = express();

ViteExpress.listen(app, 3000, () =>
  console.log("Server is listening on port 3000..."),
);

app.get("/hello", (_, res) => {
  res.send("Hello world!");
});
