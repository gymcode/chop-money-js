const axios = require("axios");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");

function tokenGeneration(payload) {
  // get private key from file

  const directoryName = "properties";
  const privateKeyFileName = "junipay_privatekey.key";
  const filePath = path.resolve(directoryName, privateKeyFileName);
  const privateKey = fs.readFileSync(filePath, "utf8");

  var token;
  try {
    token = jwt.sign({ payload: "payload_example" }, privateKey, {
        algorithm: "RS256",
    });
  } catch (err) {
    throw err;
  }
  return token
}

async function JuniPayPayment(data) {
  try {
    // get token 
    const token = tokenGeneration(data)
    const clientID = process.env.JUNI_PAY_CLIENT_ID;
    const paymentUri = process.env.JUNI_PAY_PAYMENT_ENDPOINT;

    const headers = {
      authorization: `Bearer ${token}`,
      clientid: clientID,
      "content-type": "application/json",
    };

    const response = await axios.post(paymentUri, data, {
      headers: headers,
    });
    console.log(response.data);
  } catch (error) {
    console.error(error);
  }
}
