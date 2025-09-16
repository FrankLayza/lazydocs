import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mortyRoutes from "./routes/mortyRoutes.js";

dotenv.config();
const app = express();
const PORT = 4500;

app.use(express.json());
app.use(cors());

// Disable X-Powered-By header for security
app.disable("x-powered-by");


app.use("/api/v1", mortyRoutes);
app.listen(PORT, () => {
  console.log(`server started on  localhost:${PORT}`);
});
