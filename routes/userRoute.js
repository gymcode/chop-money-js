const express = require("express")
const router = express.Router()

const userController = require("../controller/userController")

// route to register a new user 
router.post('/register', userController.userRegistration)

router.put("/confirm-otp", userController.confirmOTP)

router.get("/resend", userController.resendOTP)

router.post('/login', userController.userLogin)

router.put("/:userID", userController.updateUserDetails)

router.get("/:userID", userController.getUser)

router.get("/logout", userController.logOut)


module.exports = router
