const express = require("express")
const router = express.Router()
const client = require("../config/redis")

// schemas 
const {RegistrationSchema} = require("../utils/joiValidation")

// middlewares 
const {userValidationMiddleware, isUserAuthenticated} = require("../middleware/userMiddleware")

const userController = require("../controller/userController")

// route to register a new user 
router.post('/register', userValidationMiddleware(RegistrationSchema), userController.userRegistration)

router.put("/confirm-otp", userController.confirmOTP)

router.get("/resend", userController.resendOTP)

router.put("/set-pin", userController.setPin)

router.post('/login', userController.userLogin)

router.put("/:userID", userController.updateUserDetails)

router.get("/user", isUserAuthenticated(client), userController.getUser)

router.delete("/logout",isUserAuthenticated(client), userController.logOut)

router.delete("/delete", isUserAuthenticated(client), userController.delete)


module.exports = router
