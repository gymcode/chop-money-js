const Account = require("../models/Account");
const { CountryMsisdnValidation } = require("../utils/msisdnValidation");
const Transaction = require("../models/Transaction");
const Payment = require("../models/payment");
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
const resolveUrl = process.env.JUNI_RESOLVE_ENDPOINT;

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

      // name contact validation
      const beneficiaryCheckUrl = new URL(resolveUrl);
      beneficiaryCheckUrl.searchParams.set("channel", "mobile_money");
      beneficiaryCheckUrl.searchParams.set("provider", request.provider);
      beneficiaryCheckUrl.searchParams.set("phoneNumber", beneficiaryContact);

      console.log(beneficiaryCheckUrl.href)

      const response = await JuniPayPayment({}, beneficiaryCheckUrl.href, "GET");
      console.log(response)

      if (response.code != "00")
        throw new Error(response.response.message);
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
  try {
    const { user, token } = res.locals.user_info;

    if (user == null)
      return wrapFailureResponse(res, 404, "User not found", null);

    const request = req.body;
    const transactionId = Math.floor(
      1000000000000 + Math.random() * 9000000000000
    );

    const paymentRequest = {
      amount: request.totalPayAmount,
      tot_amnt: request.totalPayAmount,
      provider: request.provider,
      phoneNumber: user.msisdn,
      channel: "mobile_money",
      senderEmail: "kyleabs20@gmail.com",
      description: "test payment",
      foreignID: `${transactionId}`,
      callbackUrl:
        "https://chop-money.fly.dev/api/v1/account/callback/response",
    };

    const paymentResponse = await JuniPayPayment(paymentRequest, paymentUrl);
    console.log(paymentResponse);

    if (paymentResponse.code != "00")
      throw new Error(paymentResponse.response.message);

    const paymentAudit = new Payment({
      transactionId: transactionId,
      paymentRequest: JSON.stringify(paymentRequest),
      paymentResponse: JSON.stringify(paymentResponse.response.data),
      amount: request.totalPayAmount,
      user: user._id,
      transaction: request.transactionId,
    });
    paymentAudit.save(paymentAudit);

    return wrapSuccessResponse(
      res,
      200,
      paymentResponse.response.data,
      null,
      token
    );
  } catch (error) {
    return wrapFailureResponse(res, 500, error.message, error);
  }
};

exports.disburseMoney = async (req, res) => {
  try {
    const { user, token } = res.locals.user_info;

    if (user == null)
      return wrapFailureResponse(res, 404, "User not found", null);

    const request = req.body;

    // get the trasaction and check if it's active and has not been paid
    const transaction = await Transaction.findById({
      _id: request.transactionId,
    }).exec();

    // chech if the account is for a beneficiary or main user
    const account = await Account.findById({
      _id: transaction.account
    })

    if (account == null) throw new Error("Account does not exist")

    let receiver_phone = ""
    let receiver = ""
    if (account.isBeneficiary){
      receiver = account.beneficiaryName
      receiver_phone = account.beneficiaryContact
    }else{
      receiver = user.username
      receiver_phone =  user.msisdn
    }

    if (!transaction.isActive)
      throw new Error(
        "Transaction amount has already been paid to this number."
      );

    // check if the time for the user to redraw money has reached
    const currentDate = new Date();
    if (transaction.date > currentDate)
      throw new Error("it's not yet time to get your money!!!");

    const transactionId = Math.floor(
      1000000000000 + Math.random() * 9000000000000
    );

    const paymentRequest = {
      amount: transaction.transactionAmount,
      provider: request.provider,
      phoneNumber: process.env.JUNI_PAY_SENDER_MSISDN,
      receiver_phone: receiver_phone,
      channel: "mobile_money",
      sender: process.env.JUNI_PAY_SENDER_NAME,
      receiver: receiver,
      narration: "payment disbursement",
      foreignID: transactionId.toString(),
      callbackUrl:
        "https://chop-money.fly.dev/api/v1/account/callback/response",
    };

    console.log(paymentObject)

    const paymentResponse = await JuniPayPayment(
      paymentObject,
      disbursementUrl
    );

    if (paymentResponse.code != "00")
      throw new Error(paymentResponse.response.message);

    const paymentAudit = new Payment({
      transactionId: transactionId,
      paymentRequest: JSON.stringify(paymentRequest),
      paymentResponse: JSON.stringify(paymentResponse.response.data),
      amount: request.totalPayAmount,
      user: user._id,
      transaction: request.transactionId,
    });
    paymentAudit.save(paymentAudit);

    return wrapSuccessResponse(
      res,
      200,
      paymentResponse.response.data,
      null,
      token
    );
  } catch (error) {
    return wrapFailureResponse(res, 500, error.message, error);
  }
};

exports.paymentResponse = async (req, res) => {
  try {
    console.log(req.body);
    const request = req.body;

    // get the payment details
    // update the payment details and get the transactionId and update the transaction using the trasactionId
    const payment = await Payment.findOne({
      transactionId: request.foreignID,
    }).exec();

    if (payment == null)
      throw new Error(`No transaction found with the ${request.foreighID}`);

    // update the payment details
    const updatedPaymentDetails = await Payment.updateOne(
      { _id: payment._id },
      {
        update_at: new Date(),
        statusDescription: "SUCCESS",
        paymentResponse: JSON.stringify(req.body),
        isPaymentSuccessful: true,
      },
      {
        new: true,
        upsert: true,
        rawResult: true, // Return the raw result from the MongoDB driver
      }
    );

    if (!updatedPaymentDetails.value.isPaymentSuccessful)
      return wrapFailureResponse(
        res,
        200,
        "Could not update payment status",
        null
      );

    // update the transaction details
    const updateTransactionDetails = await Transaction.updateOne(
      { _id: payment.transaction },
      {
        update_at: new Date(),
        transactionStatus: "COMPLETED",
        isActive: false,
      },
      {
        new: true,
        upsert: true,
        rawResult: true, // Return the raw result from the MongoDB driver
      }
    );

    if (updateTransactionDetails.value.isActive)
      return wrapFailureResponse(
        res,
        200,
        "Could not update isActive status",
        null
      );

    return wrapSuccessResponse(res, 200, "success", null);
  } catch (error) {
    return wrapFailureResponse(res, 500, error.message, null);
  }
};


exports.getAccount = async (req, res) => {
  try{
    const params = req.params;

    const { user, token } = res.locals.user_info;
  
    if (user == null)
      return wrapFailureResponse(res, 404, "User not found", null);
  
    // getting the account details where the ID is equal to the ID of the account in the database
    const account = await Account.findById({ _id: params.accountId })
      .populate("transactions")
      .exec();
    console.log(account)

    if (account == null)
      return wrapFailureResponse(res, 404, "Account cannot be found");

    const transactions = account.transactions;
  
    wrapSuccessResponse(res, 200, transactions, null, token);
  }catch(error){
    return wrapFailureResponse(res, 500, error.message, null);
  }
};

exports.getAccountsPerUser = async (req, res) => {
  try {
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
  } catch (error) {
    return wrapFailureResponse(res, 500, error.message, null);
  }
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
