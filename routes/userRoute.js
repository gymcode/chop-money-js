const express = require("express")
const router = express.Router()

// schemas 
const {RegistrationSchema} = require("../utils/joiValidation")

// middlewares 
const {userValidationMiddleware} = require("../middleware/userMiddleware")

const userController = require("../controller/userController")

// route to register a new user 
router.post('/register', userValidationMiddleware(RegistrationSchema), userController.userRegistration)

router.put("/confirm-otp", userController.confirmOTP)

router.get("/resend", userController.resendOTP)

router.post('/login', userController.userLogin)

router.put("/:userID", userController.updateUserDetails)

router.get("/:userID", userController.getUser)

router.get("/logout", userController.logOut)


module.exports = router
