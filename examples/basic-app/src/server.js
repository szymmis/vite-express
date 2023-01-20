const express = require("express");
const ViteExpress = require("vite-express");

const app = express();

ViteExpress.listen(app, 3000, () =>
  console.log("Server is listening on port 3000...")
);

app.get("/hello", (_, res) => {
  res.send("Hello world!");
});
