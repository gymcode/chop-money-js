const axios = require("axios")
const jwt = require("jsonwebtoken")
const path = require('path')
const fs = require("fs")

function tokenGeneration(){
    // get private key from file 
    const privateKeyFileName = "junipay_privatekey.key"
    const currentPath = __dirname
    const privateKey = fs.readFileSync("/", 'utf8')
    console.log(privateKey)
}

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
