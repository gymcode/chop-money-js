const Account = require("../models/Account")
const {
    diffDays, 
    getCurrentDateTime, 
    getDate,
    getWeeksDiff,
    getBiWeeksDiff
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

    const account = await accountInput.save()

    if (account == null)
        return wrapFailureResponse(res, 500, "Could not insert in the database", null)

    // get the difference between the dates  
    const days = diffDays(request.startDate, endDate)
    const weeks = getWeeksDiff(request.startDate, endDate)
    const biWeeks = getBiWeeksDiff(request.startDate, endDate)

    let object;
    switch (request.payFrequency) {
        case 'DAILY'.toUpperCase():
            object = transactionObject(request.payTime, days, request.transactionAmount, 1)
            break;
    
        case 'WEEKLY'.toUpperCase(): 
            object = transactionObject(request.payTime, weeks, request.transactionAmount, 7)
            break;

        case 'BI-WEEKLY'.toUpperCase(): 
            object = transactionObject(request.payTime, biWeeks, request.transactionAmount, 14)
            break;

        default:
            break;
    }

    // create an object for the 
    if (request.isCustomized){
        const arr = request.customizedArray
        // remove the dates and append the new dates and time
        isCustomizableTransactionObject(arr, request.payTime, days, request.transactionAmount, 1)
    }

}




function transactionObject(payTime, duration, transAmount, extra){
    const transactionAccountArray = []    

    for (let index = 0; index < duration; index++) {
        const transactionDate = getCurrentDateTime(24 * index * extra);
        const simplifiedDate = getDate(transactionDate)
        let amount = transAmount

        const transactionObject = {
            date: simplifiedDate,
            time: payTime,
            transactionID: "dasdasddadada",
            transactionAmount: amount
        }
        transactionAccountArray.push(transactionObject)
    }

    return transactionAccountArray;
}

function isCustomizableTransactionObject(arr, payTime, duration, transAmount, extra){
    const transactionAccountArray = []    

    for (let index = 0; index < duration; index++) {
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
            transactionID: "dasdasddadada",
            transactionAmount: amount
        }
        transactionAccountArray.push(transactionObject)
    }   
    return transactionAccountArray
}