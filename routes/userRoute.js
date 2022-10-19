const express = require("express")
const router = express.Router()

const userController = require("../controller/userController")

// register a new user 
router.post('/register', userController.userRegistration)

router.post('/login', userController.userLogin)

router.put("/:userID", userController.updateUserDetails)

router.get("/:userID", userController.getUser)

module.exports = router
