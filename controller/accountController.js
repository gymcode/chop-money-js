const Account = require("../models/Account");
const { CountryMsisdnValidation } = require("../utils/msisdnValidation");
const Transaction = require("../models/Transaction");
const {
  wrapFailureResponse,
  wrapSuccessResponse,
} = require("../shared/response");
const {
  diff_Days_Weeks,
  getCurrentDateTime,
  getDate,
} = require("../utils/dateTimeHelpers");
const Generate = require("../utils/generateRandomID");
const JuniPayPayment = require("../config/juniPay");

const paymentUrl = process.env.JUNI_PAY_PAYMENT_ENDPOINT;
const disbursementUrl = process.env.JUNI_PAY_DISBURSEMENT_ENDPOINT;

/*
creating an account
*/
exports.createAccount = async (req, res) => {
  try {
    const request = req.body;
    const { user, token } = res.locals.user_info;

    if (user == null)
      return wrapFailureResponse(res, 404, "User not found", null);

    let beneficiaryContact = "";
    // check the status of is beneficiary
    if (request.isBeneficiary) {
      console.log(request.beneficiaryContact);
      const { error, msg } = CountryMsisdnValidation(
        request.beneficiaryContact,
        request.countryCode
      );
      if (error) return wrapFailureResponse(res, 422, msg, null);
      beneficiaryContact = msg;
    }
    const numberOfDays = 31;
    const totalHours = numberOfDays * 24;
    let endDate =
      request.endDate == "" ? getCurrentDateTime(totalHours) : request.endDate;

    // create account for user
    const accountInput = new Account({
      chopMoneyOwner: request.chopMoneyOwner,
      isBeneficiary: request.isBeneficiary,
      beneficiaryContact: beneficiaryContact,
      beneficiaryName: request.beneficiaryName,
      ownerContact: user.msisdn,
      ownerName: user.username,
      payFrequency: request.payFrequency,
      payFrequencyAmount: request.payFrequencyAmount,
      startDate: request.startDate,
      endDate: endDate,
      payTime: request.payTime,
      totalPayAmount: request.totalPayAmount,
      user: user._id,
    });

    const accountResponse = await accountInput.save();

    if (accountResponse == null)
      return wrapFailureResponse(res, 500, "Could not insert", null);

    // update the user data with the account details
    user.accounts.push(accountResponse._id);
    user.save();

    // get the difference between the dates
    const days = diff_Days_Weeks(request.startDate, endDate);
    const weeks = diff_Days_Weeks(request.startDate, endDate, 7);
    const biWeeks = diff_Days_Weeks(request.startDate, endDate, 14);

    let objectArr = [];
    switch (request.payFrequency) {
      case "DAILY".toUpperCase():
        objectArr = transactionObject(
          request.customizedArray,
          request.payTime,
          days,
          request.payFrequencyAmount,
          1,
          accountInput._id
        );
        break;

      case "WEEKLY".toUpperCase():
        objectArr = transactionObject(
          request.customizedArray,
          request.payTime,
          weeks,
          request.payFrequencyAmount,
          7,
          accountInput._id
        );
        break;

      case "BI-WEEKLY".toUpperCase():
        objectArr = transactionObject(
          request.customizedArray,
          request.payTime,
          biWeeks,
          request.payFrequencyAmount,
          14,
          accountInput._id
        );
        break;

      default:
        console.log("it got here");
        break;
    }

    Transaction.insertMany(objectArr)
      .then(async function (data) {
        data.map(({ _id }) => {
          accountResponse.transactions.push(_id);
        });
        accountResponse.save();
        wrapSuccessResponse(res, 200, accountResponse, null, token);
      })
      .catch(function (err) {
        console.error("an error occured", err);
      });
  } catch (error) {
    return wrapFailureResponse(res, 500, error.message, error);
  }
};

exports.makePayment = async (req, res) => {
    const {user, token} = res.locals.user_info

    if (user == null)
    return wrapFailureResponse(res, 404, "User not found", null);

    const request = req.body

    const paymentObject = {
      amount: request.totalPayAmount,
      tot_amnt: request.totalPayAmount,
      provider: request.provider,
      phoneNumber: user.msisdn,
      channel: "mobile_money",
      senderEmail: "",
      description: "test payment",
      foreignID: `${Math.floor(1000000000000 + Math.random() * 9000000000000)}`,
      callbackUrl: "http://localhost:5000/api/v1/account/callback/response"
    };
    
    const paymentResponse = await JuniPayPayment(paymentObject, paymentUrl)

    return wrapSuccessResponse(res, 200, paymentResponse.data, null, token);
}

exports.disburseMoney = async (req, res) => {
  const {user, token} = res.locals.user_info

  if (user == null)
  return wrapFailureResponse(res, 404, "User not found", null);

  const request = req.body

  const paymentObject = {
    amount: request.totalPayAmount,
    provider: request.provider,
    phoneNumber: process.env.JUNI_PAY_SENDER_MSISDN,
    receiver_phone: "0268211334",
    channel: "mobile_money",
    sender: process.env.JUNI_PAY_SENDER_NAME,
    receiver: user.firstName,
    narration: "payment disbursement",
    foreignID: `${Math.floor(1000000000000 + Math.random() * 9000000000000)}`,
    callbackUrl: "http://localhost:5000/api/v1/account/callback/response"
  };
  
  const paymentResponse = await JuniPayPayment(paymentObject, disbursementUrl)

  return wrapSuccessResponse(res, 200, paymentResponse.data, null, token);
}


exports.paymentResponse = async (req, res) => {
    
    console.log(req.body)
    res.status(200).end()
}

// trail
exports.withdrawCash = async (req, res) => {
  const { user, token } = res.locals.user_info;

  if (user == null)
    return wrapFailureResponse(res, 404, "User not found", null);

  // accepting the user's password to confirm withdrawal

  wrapSuccessResponse(res, 200, null, null, token);
};

exports.getAccount = async (req, res) => {
  const params = req.params;

  const { user, token } = res.locals.user_info;

  if (user == null)
    return wrapFailureResponse(res, 404, "User not found", null);

  // getting the account details where the ID is equal to the ID of the account in the database
  const account = await Account.findById({ _id: params.accountId })
    .populate("transactions")
    .exec();
  const transactions = account.transactions;
  if (account == null)
    return wrapFailureResponse(res, 404, "Account cannot be found");

  wrapSuccessResponse(res, 200, transactions, null, token);
};

exports.getAccountsPerUser = async (req, res) => {
  const { user, token } = res.locals.user_info;
  console.log(`here we have the user details ${user}`);

  if (user == null)
    return wrapFailureResponse(res, 404, "User not found", null);

  // getting the account details where the ID is equal to the ID of the account in the database
  const account = await Account.find({ user: user._id })
    .populate("transactions")
    .exec();
  if (account == null)
    return wrapFailureResponse(res, 404, "Account cannot be found");

  wrapSuccessResponse(res, 200, account, null, token);
};

// function
function transactionObject(arr, payTime, duration, transAmount, extra, accID) {
  const transactionAccountArray = [];

  for (let index = 1; index < duration; index++) {
    const transactionDate = getCurrentDateTime(24 * index * extra);
    let simplifiedDate = getDate(transactionDate);
    let amount = transAmount;

    for (let j = 0; j < arr.length; j++) {
      if (arr[j].date == getDate(transactionDate)) {
        simplifiedDate = arr[j].date;
        amount = arr[j].transactionAmount;
      }
    }
    const transactionObject = {
      date: simplifiedDate,
      time: payTime,
      transactionID: `#TRAN_${Generate()}`,
      transactionAmount: amount,
      account: accID,
    };
    transactionAccountArray.push(transactionObject);
  }
  return transactionAccountArray;
}
