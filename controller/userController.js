const {CountryMsisdnValidation} = require("../utils/msisdnValidation")
const {CODE_FAILURE} = require("../shared/constants")

// register a new user 
exports.userRegistration = (req, res)=>{
    // validating the msisdn based on the country code
    const request = req.body
    const {error, msg} = CountryMsisdnValidation(request.msisdn, request.countryCode)
    if(error){
        res.status(422).json({
            code: CODE_FAILURE,
            msg: "failue",
            data: null,
            error: {
                error: true,
                errMsg: msg, 
                detailedError: null
            }
        })
    }

    // checking in the database if the user already exists
    


    res.send(phoneNumber)
    
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

 
