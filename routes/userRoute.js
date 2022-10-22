const express = require("express")
const router = express.Router()

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

router.get("/:userID", isUserAuthenticated(), userController.getUser)

router.get("/logout", userController.logOut)


module.exports = router
