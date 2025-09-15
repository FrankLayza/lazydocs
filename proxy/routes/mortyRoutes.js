import express from  "express"

import { mortySummarize } from "../controller/mortyController.js"
const route = express.Router()

route.post("/summary", mortySummarize)
export default route