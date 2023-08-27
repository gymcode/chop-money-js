const util = require('util')
const { CountryMsisdnValidation } = require("../utils/msisdnValidation");
const {
  wrapFailureResponse,
  wrapSuccessResponse,
} = require("../shared/response");
const { BENEFICIARY_SMS, ACCOUNT_OWNER_SMS } = require("../shared/constants");
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
const { SendSms } = require("../config/sms");
const sendPushNotification = require("../config/oneSignal");
const {CronStatusCheckControllerForSinglePayment} = require("./cronController");
const cron = require("node-cron");

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

    const numberOfDays = request.numberOfDays == "" || request.numberOfDays == undefined ? 31 : request.numberOfDays;

    console.log(`number of days for receiving money :: ${numberOfDays}`)

    const totalHours = numberOfDays * 24;
    let endDate =
      request.endDate == "" ? getCurrentDateTime(totalHours) : request.endDate;

    const { isBeneficiary } = accountCreationValidation(user);

    if (request.isBeneficiary && isBeneficiary)
      throw new Error(
        "You have reached your limit for creating an account for a beneficiary"
      );

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

    console.log("number of days to work :: ", days)


    const paymentResponse = await makePayment(
      request,
      user,
      createdAccount._id
    );
    // console.log(
    //   "response from the payment to be made :: " +
    //     util.inspect(paymentResponse)
    // );

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

    if (createdAccount.isBeneficiary) {
      const beneficiarySms = BENEFICIARY_SMS.replace(
        "{BENE_NAME}",
        createdAccount.beneficiaryName
      )
        .replace("{OWNER_NAME}", createdAccount.ownerName)
        .replace("{AMOUNT}", createdAccount.payFrequencyAmount)
        .replace("{TIME}", createdAccount.payTime)
        .replace("{FREQUENCY}", createdAccount.payFrequency);

      console.log("Message for beneficiary :: " + beneficiarySms);

      const ownerSms = ACCOUNT_OWNER_SMS.replace(
        "{BENE_NAME}",
        createdAccount.beneficiaryName
      )
        .replace("{AMOUNT}", createdAccount.payFrequencyAmount)
        .replace("{TIME}", createdAccount.payTime)
        .replace("{FREQUENCY}", createdAccount.payFrequency);
      SendSms(`+${createdAccount.beneficiaryContact}`, beneficiarySms);

      await sendPushNotification(
        [createdAccount.user.playerId],
        "Account creation",
        ownerSms,
        null
      );
    }

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
    console.log("user data :: " + user);

    const request = req.body;
    console.log("request received :: " + util.inspect(request));

    // chech if the account is for a beneficiary or main user
    const account = await AccountRepo.getAccount(request.accountId);
    console.log("Account using the accountId :: " + account);

    if (account == null) throw new Error("Account does not exist");

    // check if the user can withdraw that amount of money or not
    if (request.amount > account.availableAmountToCashOut)
      throw new Error(
        "Oops amount entered is more than the amount available for cash out"
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

    // temp fix 
    const provider = account.provider == "" ? user.provider: account.provider

    const paymentRequest = {
      amount: request.amount,
      provider: provider,
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

    console.log(
      "payment response from disbursement :: " + util.inspect(paymentRequest)
    );

    const paymentResponse = await JuniPayPayment(
      paymentRequest,
      disbursementUrl
    );
    console.log("response from disbursement endpoint" + util.inspect(paymentResponse));

    if (paymentResponse.code != "00" || paymentResponse.response.data.code == "401")
      throw new Error(paymentResponse.response.message);

    const paymentAuditResponse = await PaymentRepo.addPayment(
      transactionId,
      paymentResponse.response.data.info.transID,
      user,
      paymentRequest,
      true,
      "",
      request.accountId,
      request.amount
    );

    if (paymentAuditResponse == null)
      throw new Error("Could not save payment audit");

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
    console.log(`response from the call back ${util.inspect(req.body)}`);

    const request = req.body;

    // update the payment details and get the transactionId and update the transaction using the trasactionId
    const payment = await PaymentRepo.getPaymentByTransactionId(
      request.foreignID
    );
    console.log(`payment details from the database ${payment}`);

    if (payment == null)
      throw new Error(`No transaction found with the ${request.foreignID}`);

    // check if payment status is success
    if (
      payment.statusDescription == "SUCCESS" ||
      payment.statusDescription == "FAILURE"
    )
      throw new Error(
        `Payment with foreign id :: ${request.foreignID} has already been completed.`
      );

    let status = "PENDING";

    switch (request.status) {
      case "success":
        status = "SUCCESS";
        break;
      case "pending":
        status = "PENDING";
        break;

      default:
        status = "FAILURE";
        break;
    }

    const paymentStatus = request.status == "success" ? true : false;

    // update the payment details
    const updatedPayment = await PaymentRepo.updatePayment(
      status,
      payment._id,
      request,
      paymentStatus
    );
    console.log(`updated payment response ${updatedPayment}`);

    if (payment.isDisbursement) {
      // get the transaction history using the foreign id

      let transactionHistory =
        await TransactionHistoryRepo.getTransationHistoryByForeignId(
          request.foreignID
        );

      console.log("transaction history :: " + transactionHistory)

      if (transactionHistory == null) {
        transactionHistory =
          await TransactionHistoryRepo.addTransactionHistory(
            payment,
            status,
            request.foreignID
          );
      }else{
        if (paymentStatus) {
          transactionHistory = await TransactionHistoryRepo.updateTransactionHistoryStatus("SUCCESS", request.foreignID)
        }else{
          transactionHistory = await TransactionHistoryRepo.updateTransactionHistoryStatus("FAILURE", request.foreignID)
        }
      }

      console.log(
        "******** cre" + transactionHistory + "his **********"
      );

      if (transactionHistory != null && request.status == "success") {
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
          "******** up" + util.inspect(updateAccountAmount) + "amt *********"
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

    if (account.isPaymentMade)
      throw new Error("Payment has already been made on this account.");

    if (account.startDate.toLocaleDateString() < new Date().toLocaleDateString())
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

exports.transactionStatus = async (req, res) => {
  try {
    const params = req.params;
    const { user, token } = res.locals.user_info;

    if (user == null) throw new Error("User not found");

    const account = await AccountRepo.getAccount(params.accountId);
    console.log(account);
    if (account == null) throw new Error("Account does not exist");


    if (account.isPaymentMade){
      const response = {
        status: "PAID",
        account: account
      }
      return wrapSuccessResponse(res, 200, response, null, token)
    }

    const payment = await PaymentRepo.getPaymentByAccountId(account._id)

    console.log("payment response :: ", payment)

    if (payment == null) throw new Error (`Payment for account ${account._id} does not exist.`)

    if (payment.externalRefId == "") throw new Error (`External reference id cannot be found for your payment. Kindly contact suppport.`);

    const payload = {
      transID: payment.externalRefId,
    };

    console.log("transaction id :: ", payment.externalRefId)

    const transactionStatusCheck = await JuniPayPayment(
      payload,
      "https://api.junipayments.com/checktranstatus"
    );
    console.log(
      `response from juni pay status check ${util.inspect(
        transactionStatusCheck
      )}`
    ); 

    if (transactionStatusCheck.code != "00") {
      console.log("status check failed for :: " + payment.externalRefId);

      const response = {
        status: "NOT_PAID",
        account: account
      }
      return wrapSuccessResponse(res, 200, response, null, token)
    }


    let response;
    switch (transactionStatusCheck.response.data.status) {
      case "success":

        const updatedPayment = await PaymentRepo.updatePayment(
          "SUCCESS",
          payment._id,
          transactionStatusCheck.response.data,
          true
        );
        console.log(`updated payment response ${updatedPayment}`);

        const updateAccountPayment = await AccountRepo.updateAccountPayment(
          account._id
        );
        console.log("********" + updateAccountPayment + "**********");

        const successAccount = await AccountRepo.getAccount(request.accountId)
        const successResponse = {
          status: "PAID",
          account: successAccount
        }

        response = wrapSuccessResponse(res, 200, successResponse, null, token)

        break;

      case "pending":
        const pendingResponse = {
          status: "PENDING",
          account: account
        }

        response = wrapSuccessResponse(res, 200, pendingResponse, null, token)
        break;
    
      default:

        const updatedFailedPayment = await PaymentRepo.updatePayment(
          "FAILED",
          payment._id,
          transactionStatusCheck.response.data,
          false
        );
        console.log(`updated payment response ${updatedFailedPayment}`);

        const failedResponse = {
          status: "NOT_PAID",
          account: account
        }

        response = wrapSuccessResponse(res, 200, failedResponse, null, token)
        break;
    }

    

    return response
  } catch (error) {
    return wrapFailureResponse(res, 500, error.message, error);
  }
};


exports.deleteAccount = async (req, res) => {
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

    if (account.isBeneficiary) {
      const updateAccountBeneficiary =
        await AccountRepo.updateAccountBeneficiary(params.accountId, false);

      if (!updateAccountBeneficiary.acknowledged)
        throw new Error(
          `Could not remove beneficiary from account :: ${params.accountId}.`
        );

      // send sms to beneficiary and also send push notification to user for disabling the account
      SendSms(
        `+${account.beneficiaryContact}`,
        `Hi there, ${account.ownerName} has deleted your budget on Chopmoney. You will no longer receive money through Chopmoney. You can easily create a budget by downloading the Chopmoney App today! www.chopmoney.co.`
      );
      await sendPushNotification(
        [user.playerId],
        "Beneficiary Removed",
        "Hi there, your beneficiary has been removed from the account, The account is now in your name...",
        null
      );
    }

    // set the account for deletion
    const updateAccountDelete = await AccountRepo.updateAccountDeleteStatus(
      params.accountId
    );

    if (!updateAccountDelete.acknowledged)
      throw new Error("Could not set account for deletion. Please try again.");

    await sendPushNotification(
      [user.playerId],
      "Account deletion",
      "Hi there, your account remainder budget will be transfered to your available amount to cash out after 48 hours",
      null
    );

    const noOfDays = 2 - account.deleteDayCount

    wrapSuccessResponse(res, 200, `Hi there, you will be able to delete your accout after ${noOfDays} days`, null, token);
  } catch (error) {
    return wrapFailureResponse(res, 500, error.message, null);
  }
};

exports.hardDeleteAccount = async (req, res) => {
  try {
    const params = req.params;

    const { user, token } = res.locals.user_info;

    if (user == null)
      return wrapFailureResponse(res, 404, "User not found", null);

    const account = await AccountRepo.getAccount(
      params.accountId
    );

    if (account == null)
      return wrapFailureResponse(res, 404, "Account cannot be found");

    if (!account.isPaymentMade) {
      const deleteAccountResponse =
        await AccountRepo.deleteAccount(params.accountId);

      if (!deleteAccountResponse.acknowledged)
        throw new Error(
          `Could not delete account :: ${params.accountId}.`
        );

        wrapSuccessResponse(res, 200, `Account has successfully been deleted.`, null, token);
    }else{
      wrapSuccessResponse(res, 200, `Account delete account since payment has already been made on it`, null, token);
    }

  } catch (error) {
    return wrapFailureResponse(res, 500, error.message, null);
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

    const transactionHistory =
      await TransactionHistoryRepo.listTransactionPerAccount(params.accountId);
    if (transactionHistory == null)
      return wrapFailureResponse(res, 404, "Account cannot be found");

    wrapSuccessResponse(res, 200, transactionHistory, null, token);
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

async function makePayment(request, user, userAccountId) {
  try {
    const transactionId = Math.floor(
      1000000000000 + Math.random() * 9000000000000
    );

    // adding 1 percent to user payment
    const amountPercentage = 0.01 * request.totalPayAmount;
    const amount = request.totalPayAmount + amountPercentage;

    const paymentRequest = {
      amount: amount,
      tot_amnt: amount,
      provider: user.provider,
      phoneNumber: user.msisdn,
      channel: "mobile_money",
      senderEmail: request.email,
      description: "Budget",
      foreignID: `${transactionId}`,
      callbackUrl:
        "https://chop-money.fly.dev/api/v1/account/callback/response",
    };

    console.log(`request sent to Juni pay :: ${util.inspect(paymentRequest)}`)
    console.log("initiating request to juni pay for payment");
    const paymentResponse = await JuniPayPayment(paymentRequest, paymentUrl);
    console.log("response from juni pay :: " + util.inspect(paymentResponse));

    if (paymentResponse.code != "00")
      throw new Error(paymentResponse.response.message);

    const paymentAuditResponse = await PaymentRepo.addPayment(
      transactionId,
      paymentResponse.response.data.transID,
      user,
      paymentRequest,
      false,
      paymentResponse.response.data,
      userAccountId,
      request.totalPayAmount
    );

    if (paymentAuditResponse == null)
      throw new Error("Could not save payment audit");

    // startDynamicCron(paymentAuditResponse._id) 

    return { code: "00", response: paymentResponse.response.data };
  } catch (error) {
    return { code: "01", response: error.message };
  }
}

function accountCreationValidation(user) {
  let response = { isValid: true, isBeneficiary: false };

  if (user.accounts.length == 0) return response;

  const filteredBeneficiaryAccounts = user.accounts.filter(
    (account) => account.isBeneficiary == true
  );

  if (filteredBeneficiaryAccounts.length > 2) {
    response = { isValid: false, isBeneficiary: true };
  }

  return response;
}


// Function to start the dynamic cron job
// function startDynamicCron(paymentId) {
//   console.log("initial interval for 30 seconds")
//   let interval = 30 * 1000; // Initial interval is 30 seconds
//   console.log(`interval :: ${interval}`)

//   const cronTask = cron.schedule(`*/${interval / 1000} * * * * *`, () => {
//     console.log(`Running status check for payment ${paymentId} at ${interval / 1000} seconds interval.`);
//     CronStatusCheckControllerForSinglePayment(paymentId);

//     // Increase the interval for the next run
//     interval += 60 * 1000; // Add 30 seconds for the next run

//     if (interval > 180000) {
//       console.log(`Payment ${paymentId} status check completed.`);
//       cronTask.stop()
//     }
//   });

//   // Stop the cron job if it exceeds 3 minutes (180,000 milliseconds)
//   console.log(`Starting cron task for interval ${interval / 1000}`)

// }