const AfricasTalking = require("africastalking")

async function SendSms(recipient, message){
    const africastalking = AfricasTalking({
        apiKey: process.env.AFRICATALKING_API_KEY,
        username: process.env.AFRICASTALKING_USERNAME
    })

    try {
        const response = await africastalking.SMS.send({
            to: `[${recipient}]`,
            message: message,
            from: "Chop Money"
        })
        console.log(response)
    } catch (error) {
        console.error(error)
    }
}

module.exports = SendSms