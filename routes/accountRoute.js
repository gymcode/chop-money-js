const express = require("express")
const router = express.Router()
const client = require("../config/redis")
const accountController = require("../controller/accountController")

const {isUserAuthenticated} = require("../middleware/userMiddleware")

router.post("/activate-account",  isUserAuthenticated(client), accountController.createAccount)

router.get("/withdraw", isUserAuthenticated(client), accountController.withdrawCash)

router.get("/confirm-otp", isUserAuthenticated(client), accountController.confirmCashWithdrawalOTP)

module.exports = router