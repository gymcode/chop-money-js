const Account = require("../models/Account")
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

    // create an object for the 
    for (let index = 0; index < array.length; index++) {
        const element = array[index];
        
    }d

}