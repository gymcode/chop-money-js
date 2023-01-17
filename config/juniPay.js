const axios = require("axios");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
const { wrapFailureResponse } = require("../shared/response");

function tokenGeneration(payload) {
  // get private key from file

  const directoryName = "properties";
  const privateKeyFileName = "junipay_privatekey.key";
  const filePath = path.resolve(directoryName, privateKeyFileName);
  const privateKey = fs.readFileSync(filePath, "utf8");

  var token;
  try {
    token = jwt.sign({ payload: payload }, privateKey, {
      algorithm: "RS256",
    });
  } catch (err) {
    throw err;
  }
  return token;
}

async function JuniPayPayment(data, uri, method = "POST") {
  try {
    // get token
    const token = tokenGeneration(data);
    const clientID = process.env.JUNI_PAY_CLIENT_ID;

    const headers = {
      authorization: `Bearer ${token.trim()}`,
      clientid: clientID,
      "content-type": "application/json",
    };

    console.log(data, uri);

    let response;

    if (method === "POST") {
      response = await axios.post(uri, data, {
        headers: headers,
      });
    } else {
      response = await axios.get(uri, {
        headers: headers,
      });
    }

    return { code: "00", response: response };
  } catch (error) {
    console.error(error.response.data.info);
    return { code: "01", response: error.response.data.info };
  }
}

module.exports = JuniPayPayment;
