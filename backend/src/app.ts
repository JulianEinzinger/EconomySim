import express from "express";
import cors from "cors";
import { userRouter } from "./router/userRouter.js";
import { loginRouter } from "./router/loginRouter.js";


const PORT = 3000;

const app = express();

app.use(express.json());
app.use(cors());

app.use("/users", userRouter);
app.use("/login", loginRouter);

app.listen(PORT, () => console.log(`Server listening on: http://localhost:${PORT}`)
);