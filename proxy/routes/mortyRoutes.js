import express from  "express"

import { mortySummarize, mortyCommit } from "../controller/mortyController.js"
const route = express.Router()

route.post("/summary", mortySummarize)
route.post("/commit", mortyCommit)
export default route