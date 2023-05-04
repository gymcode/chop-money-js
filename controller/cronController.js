const Transaction = require("../models/Transaction");
const Payment = require("../models/Payment");
const {
  getCurrentDateTime,
  getMinutesFromNow,
} = require("../utils/dateTimeHelpers");
const Account = require("../models/Account");
const UserRepo = require("../repo/userRepo");
const JuniPayPayment = require("../config/juniPay");

const sendPushNotification = require("../config/oneSignal");

const statusCheckUrl = process.env.JUNI_STATUS_CHECK_ENDPOINT;

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
    console.log("running transaction check cron")
    // select all payments from db where isActive is true
    const twoMinFromNow = getMinutesFromNow(2);

    let payments = await Payment.find({
      isActive: true,
      statusDescription: "PENDING",
      createdAt: { $lte: twoMinFromNow },
    })
      .populate("account")
      .exec();
    console.log("payment data :: " + payments)

    payments.forEach(async (payment) => {
      if (payment.externalRefId == "") return;

      const payload = {
        transID: payment.externalRefId,
      };

      const transactionStatusCheck = await JuniPayPayment(
        payload,
        "https://api.junipayments.com/checktranstatus"
      );
      console.log(
        `response from juni pay status check ${transactionStatusCheck}`
      );

      if (transactionStatusCheck.code != "00")
        throw new Error(transactionStatusCheck.response.mesaage);

      if (transactionStatusCheck.response.status == "success" || transactionStatusCheck.response.status == "failed") {
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

        console.log(`updating ${updatePayment}`);
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

module.exports = { CronNotificatioController, CronStatusCheckController };
