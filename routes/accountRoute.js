const express = require("express")
const router = express.Router()
const client = require("../config/redis")
const accountController = require("../controller/accountController")

const {isUserAuthenticated} = require("../middleware/userMiddleware")

router.post("/activate-account",  isUserAuthenticated(client), accountController.createAccount)

router.get("/withdraw", isUserAuthenticated(client), accountController.withdrawCash)

router.get("/user/:accountId", isUserAuthenticated(client), accountController.getAccount)

router.get("/user-accounts", isUserAuthenticated(client), accountController.getAccountsPerUser)

// router.put("/:accountId", isUserAuthenticated(client), accountController.updateAccount)

// router.delete("/:accountId", isUserAuthenticated(client), accountController.deleteUserAccount)

module.exports = router