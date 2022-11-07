const AfricasTalking = require("africastalking")
const axios = require("axios")

async function SendSms(msisdn, message){
    const africastalking = AfricasTalking({
        apiKey: process.env.AFRICATALKING_API_KEY,
        username: process.env.AFRICASTALKING_USERNAME
    })

    try {
        const response = await africastalking.SMS.send({
            to: `+233268211334`,
            message: message,
            from: 'axlxyt'
        })
        console.log(response)
    } catch (error) {
        console.error(error)
    }
}

async function NaloSendSms(msisdn, message){
    try {
        const username = process.env.NALO_SMS_USERNAME
        const password = process.env.NALO_SMS_PASSWORD
        const authKey = process.env.NALO_SMS_AUTH_KEY
        const anotherOne = `https://sms.nalosolutions.com/smsbackend/clientapi/Resl_Nalo/send-message/?key=&type=0&destination=233268211334&dlr=1&source=NALO&message=This+is+a+test+from+Mars`
        const critical = `https://sms.nalosolutions.com/smsbackend/clientapi/Resl_Nalo/send-message/?key=${authKey}&type=0&destination=233268211334&dlr=1&source=NALO&message=This+is+a+test+from+Mars`
        const smsUri = `https://sms.nalosolutions.com/smsbackend/clientapi/Resl_Nalo/send-message/?username=${username}&password=${password}&type=0&destination=233268211334&dlr=1&source=NALO&message=${message}`
        const response = await axios.get(critical)
        console.log(response.data)
    } catch (error) {
        console.error(error)
    }
}

module.exports = {SendSms, NaloSendSms}