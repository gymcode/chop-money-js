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
    token = jwt.sign({ payload: payload }, privateKey, {
      algorithm: "RS256",
    });
  } catch (err) {
    throw err;
  }
  return token;
}


async function JuniPayPayment(data, uri, method = "POST") {
  const token = tokenGeneration(data);
  const clientID = process.env.JUNI_PAY_CLIENT_ID;

  const headers = {
    authorization: `Bearer ${token.trim()}`,
    clientid: clientID,
    "content-type": "application/json",
  };

  let response;

  try {
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
    if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
      // return custom error message or default value
      return { code: "01", response: "Request timed out" };
    } else {
      // return error message from upstream server
      return { code: "01", response: error.response.data };
    }
  }
}

module.exports = JuniPayPayment;
