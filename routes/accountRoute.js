const express = require("express")
const router = express.Router()
const client = require("../config/redis")
const accountController = require("../controller/accountController")

const {isUserAuthenticated} = require("../middleware/userMiddleware")

router.post("/activate-account",  isUserAuthenticated(client), accountController.createAccount)


router.get("/user/:accountId", isUserAuthenticated(client), accountController.getAccount)

router.get("/user-accounts", isUserAuthenticated(client), accountController.getAccountsPerUser)

router.post("/make-payment", isUserAuthenticated(client), accountController.makePayment)

router.post("/disburse-payment", isUserAuthenticated(client), accountController.disburseMoney)

router.post("/callback/response", accountController.paymentResponse)


module.exports = router