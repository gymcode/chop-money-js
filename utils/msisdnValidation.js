const {
    GH_NUMBER_LENGTH_NINE, 
    GH_INVALID_MSISDN,
    ISO_CODE
} = require("../shared/constants")

function Gh_MsisdnValidation(msisdn){
    let response = {}
    if (msisdn.length < 9) 
        return {error: true, msg: GH_NUMBER_LENGTH_NINE}

    switch (true) {
        case msisdn.startWith(0) && msisdn.length == 10:
            Object.assign(response,
                {error:false, msg: ISO_CODE+msisdn.subString(1)})
            break;

        case msisdn.startWith("+") && msisdn.lemsisdnngth > 12:
            Object.assign(response,
                {error:false, msg: msisdn.subString(1)})
            break;

        case msisdn.startWith("00") && msisdn.length > 12:
            Object.assign(response,{error:false, msg: ISO_CODE+msisdn.subString(4)})
            break;
    
        case msisdn.subString(1) && msisdn.length == 9:
            Object.assign(response,{error:false, msg: ISO_CODE+msisdn})
            break;

        default:
            Object.assign(response, {error: true, msg: GH_INVALID_MSISDN})
            break;
    }
    return response
}

function CountryMsisdnValidation(msisdn, countryCode = "GH"){
    switch (countryCode) {
        case "GH":
            Gh_MsisdnValidation(msisdn)
            break;
    
        default:
            break;
    }
}

module.exports = CountryMsisdnValidation