const Account = require("../models/Account")
const Transaction = require("../models/Transaction")
const User = require("../models/User")
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
        const { error, msg } = CountryMsisdnValidation(request.beneficiaryContact, request.countryCode)
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

    const accountResponse = await accountInput.save()
    
    if (accountResponse == null) return wrapFailureResponse(res, 500, "Could not insert", null)

    // update the user data with the account details
    user.accounts.push(accountResponse._id)
    user.save()

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
        .then(function(data){
            // data.map(({_id})=>{
            //     accountResponse.transactions.push(_id)
            // })
            wrapSuccessResponse(res, 200, accountResponse, null, token)
        })
        .catch(function(err){
            console.error("an error occured", err)
        })

}

exports.withdrawCash = async (req, res)=>{
    const {user, token} = res.locals.user_info

    if (user == null)
        return wrapFailureResponse(res, 404, "User not found", null)
    
    // accepting the user's password to confirm withdrawal


    wrapSuccessResponse(res, 200, null, null, token)
}

exports.getAccount = async (req, res) =>{
    const params = req.params

    const {user, token} = res.locals.user_info

    if (user == null)
        return wrapFailureResponse(res, 404, "User not found", null)

    // getting the account details where the ID is equal to the ID of the account in the database
    const account = await Account.findById({_id: params.accountId}).exec()
    if (account == null) return wrapFailureResponse(res, 404, "Account cannot be found")

    wrapSuccessResponse(res, 200, account, null, token)

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