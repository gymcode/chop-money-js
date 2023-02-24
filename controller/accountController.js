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
const bcrypt = require("bcryptjs");
const AccountRepo = require("../repo/accountRepo");
const UserRepo = require("../repo/userRepo");
const PaymentRepo = require("../repo/paymentRepo");
const TransactionHistoryRepo = require("../repo/transactionHistoryRepo");
const TransactionRepo = require("../repo/transactionRepo");

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

    if (user == null) throw new Error("User not found");

    if (request.isBeneficiary) {
      const { error, msg } = CountryMsisdnValidation(
        request.beneficiaryContact,
        request.countryCode
      );
      if (error) throw new Error(msg);
      request.beneficiaryContact = msg;

      // name contact validation
      const beneficiaryCheckUrl = new URL(resolveUrl);
      beneficiaryCheckUrl.searchParams.set("channel", "mobile_money");
      beneficiaryCheckUrl.searchParams.set("provider", request.provider);
      beneficiaryCheckUrl.searchParams.set(
        "phoneNumber",
        request.beneficiaryContact
      );

      console.log(beneficiaryCheckUrl.href);

      const response = await JuniPayPayment(
        {},
        beneficiaryCheckUrl.href,
        "GET"
      );

      if (response.code != "00") throw new Error(response.response.message);
    }

    const numberOfDays = 31;
    const totalHours = numberOfDays * 24;
    let endDate =
      request.endDate == "" ? getCurrentDateTime(totalHours) : request.endDate;

    // const { isValid, isBeneficiary } = accountCreationValidation(user);

    // if (request.isBeneficiary && isBeneficiary)
    //   throw new Error(
    //     "You have reached your limit for creating an account for a beneficiary"
    //   );

    // if (!request.isBeneficiary && !isValid)
    //   throw new Error(
    //     "You have reached your limiit for creating a personal account"
    //   );

    const createdAccount = await AccountRepo.addAccount(request, user, endDate);
    if (createdAccount == null) throw new Error("Could not insert");

    // update the user data with the account details
    UserRepo.addAccountsToUser(user, createdAccount);

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
          createdAccount._id
        );
        break;

      case "WEEKLY".toUpperCase():
        objectArr = transactionObject(
          request.customizedArray,
          request.payTime,
          weeks,
          request.payFrequencyAmount,
          7,
          createdAccount._id
        );
        break;

      case "BI-WEEKLY".toUpperCase():
        objectArr = transactionObject(
          request.customizedArray,
          request.payTime,
          biWeeks,
          request.payFrequencyAmount,
          14,
          createdAccount._id
        );
        break;

      default:
        throw new Error("This pay frequency does not exist");
    }

    const paymentResponse = await makePayment(
      request,
      user,
      createdAccount._id
    );

    if (paymentResponse.code != "00") throw new Error(paymentResponse.response);

    const createdTransaction = await TransactionRepo.addTransactions(objectArr);
    if (createdTransaction == null)
      throw new Error("Could not insert into the transaction table");

    const updatedAccount = AccountRepo.addTransactionsToAccounts(
      createdTransaction,
      createdAccount
    );
    if (updatedAccount == null)
      throw new Error("Could not update user's account");

    const responseObject = {
      payment: paymentResponse.response,
      account: createdAccount,
    };

    wrapSuccessResponse(res, 200, responseObject, null, token);
  } catch (error) {
    console.log(error);
    return wrapFailureResponse(res, 500, error.message, error);
  }
};

exports.disburseMoney = async (req, res) => {
  try {
    const { user, token } = res.locals.user_info;
    if (user == null) throw new Error("User not found");

    const request = req.body;

    // chech if the account is for a beneficiary or main user
    const account = await AccountRepo.getAccount(request.accountId);

    if (account == null) throw new Error("Account does not exist");

    // check if the user can withdraw that amount of money or not
    if (request.amount > account.availableAmountToCashOut)
      throw new Error(
        "Oops amount entered it more than the amount available for cash out"
      );

    const pinConfirmationStatus = bcrypt.compareSync(
      request.pin,
      user.password
    );

    if (!pinConfirmationStatus)
      throw new Error("Wrong password. Please try again.");

    let receiver_phone = "";
    let receiver = "";
    if (account.isBeneficiary) {
      receiver = account.beneficiaryName;
      receiver_phone = account.beneficiaryContact;
    } else {
      receiver = user.username;
      receiver_phone = user.msisdn;
    }

    const transactionId = Math.floor(
      1000000000000 + Math.random() * 9000000000000
    );

    const paymentRequest = {
      amount: request.amount,
      provider: user.provider,
      phoneNumber: receiver_phone,
      receiver_phone: process.env.JUNI_PAY_SENDER_MSISDN,
      channel: "mobile_money",
      sender: process.env.JUNI_PAY_SENDER_NAME,
      receiver: receiver,
      narration: "payment disbursement",
      foreignID: transactionId.toString(),
      callbackUrl:
        "https://chop-money.fly.dev/api/v1/account/callback/response",
    };

    const paymentAuditResponse = await PaymentRepo.addPayment(
      transactionId,
      user,
      paymentRequest,
      true,
      "",
      request.accountId,
      request.amount
    );

    if (paymentAuditResponse == null)
      throw new Error("Could not save payment audit");

    const paymentResponse = await JuniPayPayment(
      paymentRequest,
      disbursementUrl
    );

    if (paymentResponse.code != "00")
      throw new Error(paymentResponse.response.message);

    return wrapSuccessResponse(
      res,
      200,
      paymentResponse.response.data,
      null,
      token
    );
  } catch (error) {
    console.error(error);
    return wrapFailureResponse(res, 500, error.message, error);
  }
};

exports.paymentResponse = async (req, res) => {
  try {
    console.log(`response from the call back ${JSON.stringify(req.body)}`);
    console.log(`response from the call back ${req.body.foreignID}`);
    const request = req.body;

    // update the payment details and get the transactionId and update the transaction using the trasactionId
    const payment = await PaymentRepo.getPaymentByTransactionId(
      request.foreignID
    );
    console.log(`payment details from the database ${payment}`);

    if (payment == null)
      throw new Error(`No transaction found with the ${request.foreignID}`);

    const status = request.status == "success" ? "SUCCESS" : "FAILURE";
    const paymentStatus = request.status == "success" ? true : false;

    // update the payment details
    const updatedPayment = await PaymentRepo.updatePayment(
      status,
      payment._id,
      request,
      paymentStatus
    );
    console.log(`updated payment responpse ${updatedPayment}`);

    if (payment.isDisbursement) {
      const createdTransactionHistory =
        await TransactionHistoryRepo.addTransactionHistory(payment, status);
      console.log(
        "******** cre" + createdTransactionHistory + "his **********"
      );

      if (createdTransactionHistory != null && request.status == "success") {
        const account = await AccountRepo.getAccount(payment.account);

        console.log("******** acc" + account + "amt *********");

        let amountCashedOut = account.amountCashedOut;
        amountCashedOut += payment.amount;

        let currentAmountAvailable =
          account.availableAmountToCashOut - payment.amount;

        let remainder = account.remainder - payment.amount;

        const updateAccountAmount = await AccountRepo.updateAccountAmounts(
          currentAmountAvailable,
          amountCashedOut,
          account._id,
          remainder
        );
        console.log(
          "******** up" + JSON.stringify(updateAccountAmount) + "amt *********"
        );

        console.log(
          "********" +
            currentAmountAvailable +
            " " +
            amountCashedOut +
            "**********"
        );
      }
    }

    if (request.status == "success" && !payment.isDisbursement) {
      // update the account details
      const updateAccountPayment = await AccountRepo.updateAccountPayment(
        payment.account
      );
      console.log("********" + updateAccountPayment + "**********");
    }

    return wrapSuccessResponse(res, 200, "success", null);
  } catch (error) {
    console.error(error);
    return wrapFailureResponse(res, 500, error.message, null);
  }
};

exports.topUp = async (req, res) => {
  try {
    const { user, token } = res.locals.user_info;

    if (user == null) throw new Error("User not found");

    const request = req.body;

    const account = await AccountRepo.getAccount(request.accountId);
    console.log(account);
    if (account == null) throw new Error("Account does not exist");

    if (account.startDate > new Date())
      throw new Error(
        "Oops sorry your the time to start receiving money has started yet there's no cash!!!. Your account will be terminated soon"
      );

    const paymentResponse = await makePayment(request, user, account._id);
    console.log(paymentResponse);
    if (paymentResponse.code != "00") throw new Error(paymentResponse.response);

    const responseObject = {
      payment: paymentResponse.response,
      account: account,
    };

    return wrapSuccessResponse(res, 200, responseObject, null, token);
  } catch (error) {
    return wrapFailureResponse(res, 500, error.message, error);
  }
};

exports.getAccount = async (req, res) => {
  try {
    const params = req.params;

    const { user, token } = res.locals.user_info;

    if (user == null)
      return wrapFailureResponse(res, 404, "User not found", null);

    const account = await AccountRepo.getPopulatedTransactionsAccount(
      params.accountId
    );

    if (account == null)
      return wrapFailureResponse(res, 404, "Account cannot be found");

    const transactions = account.transactions;

    wrapSuccessResponse(res, 200, transactions, null, token);
  } catch (error) {
    return wrapFailureResponse(res, 500, error.message, null);
  }
};

exports.getAccountsPerUser = async (req, res) => {
  try {
    const { user, token } = res.locals.user_info;

    if (user == null)
      return wrapFailureResponse(res, 404, "User not found", null);

    const account = await AccountRepo.getPopulatedTransactionAccountByUserId(
      user._id
    );
    if (account == null)
      return wrapFailureResponse(res, 404, "Account cannot be found");

    wrapSuccessResponse(res, 200, account, null, token);
  } catch (error) {
    return wrapFailureResponse(res, 500, error.message, null);
  }
};

exports.listAccounthistory = async (req, res) => {
  try {
    const params = req.params;
    const { user, token } = res.locals.user_info;

    if (user == null)
      return wrapFailureResponse(res, 404, "User not found", null);

    const transactionHistory = await TransactionHistoryRepo.listTransactionPerAccount(
      params.accountId
    );
    if (transactionHistory == null)
      return wrapFailureResponse(res, 404, "Account cannot be found");

    wrapSuccessResponse(res, 200, transactionHistory, null, token);
  } catch (error) {
    return wrapFailureResponse(res, 500, error.message, null);
  }
}

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

async function makePayment(request, user, userAccountId) {
  try {
    const transactionId = Math.floor(
      1000000000000 + Math.random() * 9000000000000
    );

    // adding 1 percent to user payment
    const amountPercentage = 0.01 * request.totalPayAmount;
    const amount = request.totalPayAmount +  amountPercentage;

    const paymentRequest = {
      amount: amount,
      tot_amnt: amount,
      provider: user.provider,
      phoneNumber: user.msisdn,
      channel: "mobile_money",
      senderEmail: request.email,
      description: "test payment",
      foreignID: `${transactionId}`,
      callbackUrl:
        "https://chop-money.fly.dev/api/v1/account/callback/response",
    };

    const paymentResponse = await JuniPayPayment(paymentRequest, paymentUrl);

    if (paymentResponse.code != "00")
      throw new Error(paymentResponse.response.message);

    const paymentAuditResponse = await PaymentRepo.addPayment(
      transactionId,
      user,
      paymentRequest,
      false,
      paymentResponse.response.data,
      userAccountId,
      request.totalPayAmount
    );

    if (paymentAuditResponse == null)
      throw new Error("Could not save payment audit");

    return { code: "00", response: paymentResponse.response.data };
  } catch (error) {
    return { code: "01", response: error.message };
  }
}

function accountCreationValidation(user) {
  let response = { isValid: true, isBeneficiary: false };

  const filteredBeneficiaryAccounts = user.account.filter(
    (account) => account.isBeneficiary == true
  );

  const filteredSelfAccounts = user.account.filter(
    (account) => account.isBeneficiary == false
  );

  if (filteredBeneficiaryAccounts.length > 2) {
    response = { isValid: false, isBeneficiary: true };
  }

  if (filteredSelfAccounts.length > 2) {
    response = { isValid: false, isBeneficiary: false };
  }

  return response;
}
