const axios = require("axios")

const toggleValue = false

async function NaloSendSms(msisdn, message){
    try {
        const authKey = process.env.NALO_SMS_AUTH_KEY
        const smsUri = `https://sms.nalosolutions.com/smsbackend/clientapi/Resl_Nalo/send-message/?key=${authKey}&type=0&destination=${msisdn}&dlr=1&source=Chopmoney&message=${message}`

        const response = await axios.get(smsUri)
        console.log(response.data)
    } catch (error) {
        console.error(error)
    }
}


async function NsanoSendSms(msisdn, message){
    try {
        const key = process.env.NSANO_SMS_KEY
        const smsUri = process.env.NSANO_SMS_URL

        const data = {
            sender: "Chop money",
            recipient: msisdn,
            message: message
        }

        const headers = {
            "X-SMS-Apikey": key,
            "content-type": "application/json",
          };

        const response = await axios.post(smsUri, data, {headers: headers})
        console.log(response.data)
    } catch (error) {
        console.error(error)
    }
}


async function SendSms(msisdn, message){
    try {
        if (toggleValue) {
            console.log("using nalo")
            NaloSendSms(msisdn, message)
        }else{
            console.log("using nsano")
            NsanoSendSms(msisdn, message)
        }
    } catch (error) {
        
    }
}

module.exports = {SendSms}