import express from "express";
import routes from "./src/routes.ts";

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.disable("x-powered-by");
app.use(express.json({ limit: "10kb" }));
app.use("/api", routes);

app.use((_request, response) => {
  response.status(404).json({ error: "Route not found" });
});

app.use(
  (
    error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(error);
    response.status(500).json({ error: "Internal server error" });
  },
);

app.listen(port, () => {
  console.log(`Authentication API listening on http://localhost:${port}`);
});
