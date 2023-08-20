const util = require("util");

const axios = require("axios")
const Transaction = require("../models/Transaction");
const Payment = require("../models/Payment");
const {
  getCurrentDateTime,
  getMinutesFromNow,
} = require("../utils/dateTimeHelpers");
const Account = require("../models/Account");
const User = require("../models/User");

const AccountRepo = require("../repo/accountRepo");
const TransactionRepo = require("../repo/transactionRepo");

const UserRepo = require("../repo/userRepo");
const JuniPayPayment = require("../config/juniPay");

const sendPushNotification = require("../config/oneSignal");
const { wrapFailureResponse } = require("../shared/response");

async function CronNotificatioController() {
  try {
    const anHourFromNow = getMinutesFromNow(10);
    console.log(anHourFromNow);
    let transactions = await Transaction.find({
      isActive: true,
      createdAt: { $lte: anHourFromNow },
    })
      .populate("account")
      .exec();

    transactions.forEach(async (transaction) => {
      const date = new Date();
      const time = formattedTime(`${date.getHours()}`, `${date.getMinutes()}`);
      // console.log(time);
      // const time = `${date.getHours()}:${date.getMinutes()}`

      if (transaction.time == time) {
        console.log("here you are");
      }
      if (
        transaction.date.toLocaleDateString() ==
          new Date().toLocaleDateString() &&
        transaction.time == time
      ) {
        console.log(transaction.account);
        console.log(`running an update for transactions ${transaction._id}`);

        console.log(transaction.account);

        if (transaction.account == null) {
          console.log("Transaction available but account deleted!!!");
          return;
        }

        let currentAmountAvailable =
          transaction.account.availableAmountToCashOut;

        const transactionAmount = transaction.transactionAmount;
        currentAmountAvailable += transactionAmount;

        const updatedAccount = await Account.updateOne(
          { _id: transaction.account._id },
          {
            updateAt: new Date(),
            availableAmountToCashOut: currentAmountAvailable,
          },
          {
            new: true,
            upsert: true,
            rawResult: true,
          }
        );

        console.log(`here we go ${JSON.stringify(updatedAccount)}`);

        // if (updatedAccount.value == null) throw new Error("Could not update the user account")

        // update the user's transaction
        const updateTransaction = await Transaction.updateOne(
          { _id: transaction._id },
          {
            updateAt: new Date(),
            isActive: false,
          },
          {
            new: true,
            upsert: true,
            rawResult: true,
          }
        );
        console.log(`updating ${updateTransaction}`);

        const msisdn = transaction.account.ownerContact;
        console.log(`msisdn for user ${msisdn}`);

        const user = await UserRepo.getUserByMsisdn(msisdn);

        if (user != null) {
          const resp = await sendPushNotification(
            [user.playerId],
            "Money Ready",
            "Yaaayyyy!!!, it's pay time. Cash out big time and the Lord is in control",
            null
          );
          console.log(resp.response.data);
        }
      }
    });
  } catch (error) {
    console.log(error);
  }
}

async function CronStatusCheckController() {
  try {
    // console.log("running transaction check cron")
    // select all payments from db where isActive is true
    const twoMinFromNow = getMinutesFromNow(2);

    let payments = await Payment.find({
      isActive: true,
      statusDescription: "PENDING",
      createdAt: { $lte: twoMinFromNow },
    })
      .populate("account")
      .exec();

    if (payments.length == 0) return;

    // console.log("payment data :: " + payments);

    payments.forEach(async (payment) => {
      if (payment.externalRefId == "") return;

      const payload = {
        transID: payment.externalRefId,
      };

      const transactionStatusCheck = await JuniPayPayment(
        payload,
        "https://api.junipayments.com/checktranstatus"
      );
      // console.log(
      //   `response from juni pay status check ${util.inspect(
      //     transactionStatusCheck
      //   )}`
      // ); 

      if (transactionStatusCheck.code != "00") {
        console.log("status check failed for :: " + payment.externalRefId);
        return;
      }

      if (
        transactionStatusCheck.response.data.status == "success" ||
        transactionStatusCheck.response.data.status == "failed"
      ) {
        const status =
          transactionStatusCheck.response.data.status == "success"
            ? "SUCCESS"
            : "FAILED";
        // update that payment active status to false
        const updatePayment = await Payment.updateOne(
          { _id: payment._id },
          {
            updateAt: new Date(),
            isActive: false,
          },
          {
            new: true,
            upsert: true,
            rawResult: true,
          }
        );

        // in case of live deployment, use a token

        const payload = {
          status: transactionStatusCheck.response.data.info.status,
          trans_id: transactionStatusCheck.response.data.info.foreignID,
          foreignID: payment.transactionId,
        };
        try {
          const response = await axios.post("https://chop-money.fly.dev/api/v1/account/callback/response", payload  ); 
          // console.log("response from making the call back :: ", response)
        } catch (error) {
          console.log(error)
        }
        //trigger a post request

        console.log(`updating ${util.inspect(updatePayment)}`);
      }
    });
  } catch (error) {
    console.log(error);
  }
}

async function CronStatusCheckControllerForSinglePayment() {
  try {

    let payment = await Payment.find({
      isActive: true,
      statusDescription: "PENDING"
    })
      .populate("account")
      .exec();

    if (payments.length == 0) return;

    console.log("payment data :: " + payments);


    if (payment.externalRefId == "") return;

    const payload = {
      transID: payment.externalRefId,
    };

    const transactionStatusCheck = await JuniPayPayment(
      payload,
      "https://api.junipayments.com/checktranstatus"
    );
    // console.log(
    //   `response from juni pay status check ${util.inspect(
    //     transactionStatusCheck
    //   )}`
    // ); 

    if (transactionStatusCheck.code != "00") {
      console.log("status check failed for :: " + payment.externalRefId);
      return;
    }

    if (
      transactionStatusCheck.response.data.status == "success" ||
      transactionStatusCheck.response.data.status == "failed"
    ) {
      const status =
        transactionStatusCheck.response.data.status == "success"
          ? "SUCCESS"
          : "FAILED";
      // update that payment active status to false
      const updatePayment = await Payment.updateOne(
        { _id: payment._id },
        {
          updateAt: new Date(),
          isActive: false,
        },
        {
          new: true,
          upsert: true,
          rawResult: true,
        }
      );

      // in case of live deployment, use a token

      const payload = {
        status: transactionStatusCheck.response.data.info.status,
        trans_id: transactionStatusCheck.response.data.info.foreignID,
        foreignID: payment.transactionId,
      };
      try {
        const response = await axios.post("https://chop-money.fly.dev/api/v1/account/callback/response", payload  ); 
        console.log("response from making the call back :: ", response)
      } catch (error) {
        console.log(error)
      }
      //trigger a post request

      console.log(`updating ${util.inspect(updatePayment)}`);
    }
  } catch (error) {
    console.log(error);
  }
}

async function CronAccountDeletion() {
  try {
    console.log("running account deletion cron");

    // get all accounts set for deletion
    const accounts = await Account.find({
      isDelete: true,
    }).exec();
    console.log(`Accounts set for deletion:: ${accounts}`);

    if (accounts.length == 0) return;

    accounts.forEach(async (account) => {
      if (account.deleteDayCount < 2) {
        const deleteAccountCount = account.deleteDayCount + 1;
        const updateAccountDeleteCount =
          await AccountRepo.updateAccountDeleteCount(
            account._id,
            deleteAccountCount
          );

        if (updateAccountDeleteCount.ok != 1) {
          console.log(`Could not update delete count for :: ${account._id}`);
          return;
        }

        console.log(
          `Successfully updated the delete account count for account :: ${account._id}`
        );
        return;
      } else {
        const remainder = account.remainder - account.remainder;
        const availableAmountToCashOut =
          account.availableAmountToCashOut + account.remainder;

        if (account.remainder < 1) return;

        const updateAccountDeletionInformation =
          await AccountRepo.updateAccountDeleteInformation(
            account._id,
            remainder,
            availableAmountToCashOut
          );

        if (updateAccountDeletionInformation.ok != 1) {
          console.log(
            "Something went wrong trying to move money to available amount to cashout..."
          );
          return;
        }

        // close all the active transactions for that particular account
        const closeTransactions =
          await TransactionRepo.closeAllTransactionByAccountId(account._id);
        if (closeTransactions.ok != 1) {
          console.log("Could not close transactions ");
          return;
        }

        console.log(
          "successsfully transfered everything to available amount to cash out..."
        );
      }
    });
  } catch (error) {
    console.log(error);
  }
}

async function CronUserDeletion() {
  try {
    console.log("running user account deletion cron");

    // get all accounts set for deletion
    const users = await User.find({
      isDelete: true,
    })
      .populate("account")
      .exec();
    console.log(`User accounts set for deletion:: ${users}`);

    if (users.length == 0) return;

    users.forEach(async (user) => {
      if (user.deleteDayCount < 7) {
        const deleteUserCount = user.deleteDayCount + 1;
        const updateAccountDeleteCount =
          await UserRepo.updateUserAccountDeleteCount(
            user._id,
            deleteUserCount
          );

        if (updateAccountDeleteCount.ok != 1) {
          console.log(`Could not update delete count for :: ${user._id}`);
          return;
        }

        console.log(
          `Successfully updated the delete account count for account :: ${user._id}`
        );
        return;
      } else {
        user.forEach(async (account) => {
          const remainder = account.remainder - account.remainder;
          const availableAmountToCashOut =
            account.availableAmountToCashOut + account.remainder;

          if (account.remainder < 1) return;

          const updateAccountDeletionInformation =
            await AccountRepo.updateAccountDeleteInformation(
              user._id,
              remainder,
              availableAmountToCashOut
            );

          if (updateAccountDeletionInformation.ok != 1) {
            console.log(
              "Something went wrong trying to move money to available amount to cashout..."
            );
            return;
          }

          // close all the active transactions for that particular account
          const closeTransactions =
            await TransactionRepo.closeAllTransactionByAccountId(user._id);
          if (closeTransactions.ok != 1) {
            console.log("Could not close transactions ");
            return;
          }

          console.log(
            "successsfully transfered everything to available amount to cash out..."
          );
        });
      }
    });
  } catch (error) {
    console.log(error);
  }
}

function formattedTime(hour, minute) {
  let hourStr = hour;
  let minuteStr = minute;

  if (hour.length == 1) {
    hourStr = "0" + hour;
  }
  if (minute.length < 2) {
    minuteStr = "0" + minute;
  }

  return `${hourStr}:${minuteStr}`;
}

module.exports = {
  CronNotificatioController,
  CronStatusCheckController,
  CronAccountDeletion,
  CronUserDeletion,
};
