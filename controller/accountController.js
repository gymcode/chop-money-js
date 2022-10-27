const Account = require("../models/Account")
const {
    diffDays, 
    getCurrentDateTime, 
    getDate
} = require("../utils/dateTimeHelpers")
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
        endDate: request.endDate,
        payTime: request.payTime,
        totalPayAmount: request.totalPayAmount,
    })

    const account = await accountInput.save()

    if (account == null)
        return wrapFailureResponse(res, 500, "Could not insert in the database", null)

    // get the difference between the dates  
    const days = diffDays(request.startDate, request.endDate)

    const transactionAccountArray = []    

    for (let index = 0; index < days; index++) {
        const transactionDate = getCurrentDateTime(24 * index);
        const simplifiedDate = getDate(transactionDate)
        let amount = request.payTime

        const transactionObject = {
            date: simplifiedDate,
            time: request.payTime,
            transactionID: "dasdasddadada",
            transactionAmount: amount
        }
        transactionAccountArray.push(transactionObject)
    }

    // create an object for the 
    if (request.isCustomized){
        const arr = request.customizedArray
        // remove the dates and append the new dates and time
        for (let index = 0; index < days; index++) {
            const transactionDate = getCurrentDateTime(24 * index);
            let simplifiedDate = getDate(transactionDate)
            let amount = request.payTime
    
            for (let j = 0; j < arr.length; j++) {
                if (arr[j].date == getDate(transactionDate)) {
                    simplifiedDate = arr[j].date
                    amount = arr[j].transactionAmount
                }
            }
            const transactionObject = {
                date: simplifiedDate,
                time: request.payTime,
                transactionID: "dasdasddadada",
                transactionAmount: amount
            }
            transactionAccountArray.push(transactionObject)
        }   
    }

}