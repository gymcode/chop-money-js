const AfricasTalking = require("africastalking")

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

module.exports = {SendSms}