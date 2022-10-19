function Gh_MsisdnValidation(msisdn){
    let response = {}
    if (msisdn.length == 9) 
        return Object.assign(response, {error: true, msg: "Phone N"})
}

function CountryValidation(msisdn, countryCode = "GH"){
    switch (countryCode) {
        case "GH":
            Gh_MsisdnValidation(msisdn)
            break;
    
        default:
            break;
    }
}