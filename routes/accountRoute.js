const express = require("express")
const router = express.Router()
const client = require("../config/redis")

const {isUserAuthenticated} = require("../middleware/userMiddleware")

router.post("/activate-account", )