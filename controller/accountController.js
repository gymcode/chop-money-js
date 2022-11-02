const Account = require("../models/Account")
const Transaction = require("../models/Transaction")
const SendSms = require("../config/sms")
const { wrapFailureResponse, wrapSuccessResponse } = require("../shared/response")
const {
    diff_Days_Weeks, 
    getCurrentDateTime, 
    getDate,
} = require("../utils/dateTimeHelpers")
const Generate = require("../utils/generateRandomID")

/*
creating an account
*/
exports.createAccount = async(req, res)=>{

    const request = req.body
    const {user, token} = res.locals.user_info   

    if (user == null)
        return wrapFailureResponse(res, 404, "User not found", null)

    let beneficiaryContact = ""
    // check the status of is beneficiary 
    if (request.isBeneficiary) {
        const { error, msg } = CountryMsisdnValidation(request.msisdn, request.countryCode)
        if (error) return wrapFailureResponse(res, 422, msg, null)
        beneficiaryContact = msg
    }
    const numberOfDays = 31
    const totalHours = numberOfDays * 24 
    let endDate = request.endDate == "" ? getCurrentDateTime(totalHours) : request.endDate

    // create account for user
    const accountInput = new Account({
        chopMoneyOwner: request.chopMoneyOwner,
        isBeneficiary: request.isBeneficiary,
        beneficiaryContact: beneficiaryContact,
        beneficiaryName: request.beneficiaryName,
        ownerContact: user.msisdn,
        ownerName: user.username,
        payFrequency: request.payFrequency,
        payFrequencyAmount: request.payFrequencyAmount,
        startDate: request.startDate,
        endDate: endDate,
        payTime: request.payTime,
        totalPayAmount: request.totalPayAmount,
    })

    accountInput.save(function (err){
        if (err) return wrapFailureResponse(res, 500, "Could not insert", null)

        // get the difference between the dates  
        const days = diff_Days_Weeks(request.startDate, endDate)
        const weeks = diff_Days_Weeks(request.startDate, endDate, 7)
        const biWeeks = diff_Days_Weeks(request.startDate, endDate, 14)

        let objectArr = [];
        switch (request.payFrequency) {
            case 'DAILY'.toUpperCase():
                objectArr = transactionObject(
                    request.customizedArray,
                    request.payTime, 
                    days, 
                    request.payFrequencyAmount, 
                    1, accountInput._id)
                break;
        
            case 'WEEKLY'.toUpperCase(): 
                objectArr = transactionObject(
                    request.customizedArray,
                    request.payTime, 
                    weeks, 
                    request.payFrequencyAmount, 
                    7, accountInput._id)
                break;

            case 'BI-WEEKLY'.toUpperCase(): 
                objectArr = transactionObject(
                    request.customizedArray,
                    request.payTime, 
                    biWeeks, 
                    request.payFrequencyAmount, 
                    14, accountInput._id)
                break;

            default:
                console.log("it got here")
                break;
        }

        Transaction.insertMany(objectArr)
            .then(function(){
                console.log("inserted")
                wrapSuccessResponse(res, 200, user, null, token)
            })
            .catch(function(err){
                console.error("an error occured", err)
            })
    })

}

exports.withdrawCash = async (req, res)=>{
    const {user, token} = res.locals.user_info

    if (user == null)
        return wrapFailureResponse(res, 404, "User not found", null)

    // generate code  hash code 
    const code = GenerateOTP()
    console.log(code)
    const codeHash = bcrypt.hashSync(`${code}`, bcrypt.genSaltSync(10))
    const storageKey = `${user._id}_OTP`


    const expiryDate = getMinutes(5)
    const otpStorageObject = {
        code: codeHash,
        expire_at: expiryDate
    }

    await client.set(storageKey, JSON.stringify(otpStorageObject))

    // TODO(send SMS to user with the otp)
    SendSms(`+${msisdn}`, `Your one time password for chop money is ${code}. This is to confirm that you want to make a withdrawal.`)

    wrapSuccessResponse(res, 200, null, null, token)
}

exports.confirmCashWithdrawalOTP = async(req, res)=>{
    const {user, token} = res.locals.user_info

    if (user == null)
        return wrapFailureResponse(res, 404, "User not found", null)
    
    const request = req.body

    // get the otp from the cached data
    const storageKey = `${user._id}_OTP`
    const value = await client.get(storageKey)
    const data = JSON.parse(value)
    if (data == null && user.isOtpConfirmed)
        return wrapSuccessResponse(res, 200, "You have already confirmed the OTP", null)

    if (data == null && !user.isOtpConfirmed)
        return wrapFailureResponse(res, 500, "Please try signing up first", null)

    // checking for the expire by comparison
    const currentDateTime = new Date()
    if (currentDateTime > new Date(data.expire_at))
        return wrapFailureResponse(res, 500, "The OTP has expired, please resend OTP")

    // comparing the hashed OTP and the code
    const otpCodeComparison = bcrypt.compareSync(request.code, data.code)
    if (!otpCodeComparison)
        return wrapFailureResponse(res, 500, "OTPs do not match, please try again")

    // deleting the cached data
    client.del(storageKey)

    // get the amount to be removed from the transaction table based on the transaction ID
    const transaction = await Transaction.findById({_id: request.id}).exec()

    // this should trigger the money removal 

    // if successful it should update the user's transaction with a success status else a failure

}

function transactionObject(arr, payTime, duration, transAmount, extra, accID){
    const transactionAccountArray = []    

    for (let index = 1; index < duration; index++) {
        const transactionDate = getCurrentDateTime(24 * index * extra);
        let simplifiedDate = getDate(transactionDate)
        let amount = transAmount

        for (let j = 0; j < arr.length; j++) {
            if (arr[j].date == getDate(transactionDate)) {
                simplifiedDate = arr[j].date
                amount = arr[j].transactionAmount
            }
        }
        const transactionObject = {
            date: simplifiedDate,
            time: payTime,
            transactionID: `#TRAN_${Generate()}`,
            transactionAmount: amount,
            account: accID
        }
        transactionAccountArray.push(transactionObject)
    }   
    return transactionAccountArray
}