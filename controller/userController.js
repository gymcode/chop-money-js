const {CountryMsisdnValidation} = require("../utils/msisdnValidation")
const {wrapFailureResponse} = require("../shared/response")
// user model
const User = require("../models/User")

// register a new user 
exports.userRegistration = async (req, res)=>{
    // validating the msisdn based on the country code
    const request = req.body
    const {error, msg} = CountryMsisdnValidation(request.msisdn, request.countryCode)
    if(error){
        wrapFailureResponse(res, 422, msg, null)
    }
    const msisdn = msg

    // checking in the database if the user already exists
    const user = await User.findOne({msisdn: msisdn}).exec()
    if (user != null) {
        wrapFailureResponse(res, 404, "User already exists", null)
    }

    // add user and send sms 
    const userInput = new User({
        username: request.username,
        msisdn: msisdn,
        countryCode: request.countryCode,
        isoCode: request.isoCode,
    })
    userInput.save()

    console.log(user)


    res.send("phoneNumber")
    
}

// it should confirm otp
exports.confirmOTP = (req, res) =>{
    res.send("confirming otp")
}

// it should resend otp
exports.resendOTP = (req, res)=>{
    res.send("final count down")
}

// it shoudld handle logging in a new user and storing auth token
exports.userLogin = (req, res) => {
    res.send('user login')
}

// it should handle getting a single user 
exports.getUser = (req, res) => {
    res.send("get a user")
}

// it should update user details 
exports.updateUserDetails = (req, res)=>{
    res.send("bambi and the rest")
}

// it should sign out user 
exports.logOut = (req, res)=>{
    res.send("log me out please")
}

 
