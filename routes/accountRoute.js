const express = require("express")
const router = express.Router()
const client = require("../config/redis")
const accountController = require("../controller/accountController")

const {isUserAuthenticated} = require("../middleware/userMiddleware")

router.post("/activate-account",  isUserAuthenticated(client), accountController.createAccount)

router.get("/user/:accountId", isUserAuthenticated(client), accountController.getAccount)

router.get("/user-accounts", isUserAuthenticated(client), accountController.getAccountsPerUser)

router.get("/transaction-history/:accountId", isUserAuthenticated(client), accountController.listAccounthistory)

router.get("/accounts", isUserAuthenticated(client), accountController.listAccounts)

router.post("/top-up", isUserAuthenticated(client), accountController.topUp)

router.post("/disburse-payment", isUserAuthenticated(client), accountController.disburseMoney)

router.put("/transaction/status/:accountId", isUserAuthenticated(client), accountController.transactionStatus)

router.delete("/delete/:accountId", isUserAuthenticated(client), accountController.deleteAccount)

router.delete("/delete/account/:accountId", isUserAuthenticated(client), accountController.hardDeleteAccount)

// router.delete("/cancel/:accountId", isUserAuthenticated(client), accountController.cancelDeleteAccount)

router.post("/callback/response", accountController.paymentResponse)


module.exports = router