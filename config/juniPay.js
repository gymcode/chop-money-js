const axios = require("axios")

async function JuniPayPayment(data){
    try {
        const authKey = process.env.JUNI_PAY_TOKEN
        const clientID = process.env.JUNI_PAY_CLIENT_ID
        const paymentUri = process.env.JUNI_PAY_PAYMENT_ENDPOINT

        const headers = {
            "authorization": `Bearer ${authKey}`,
            "clientid": clientID,
            "content-type": "application/json"
        }
        
        const response = await axios.post(
            paymentUri, 
            data, 
            {
                headers: headers
            }
            )
        console.log(response.data)
    } catch (error) {
        console.error(error)
    }
}
