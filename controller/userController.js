
// register a new user 
exports.userRegistration = (req, res)=>{
    res.send('Hello World!')
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

 
