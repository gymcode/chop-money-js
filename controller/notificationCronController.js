const Transaction = require("../models/Transaction");
const { getCurrentDateTime } = require("../utils/dateTimeHelpers");
const Account = require("../models/Account");
const UserRepo = require("../repo/userRepo");
const sendPushNotification = require("../config/oneSignal");

async function CronNotificatioController() {
  try {
    const anHourFromNow = getCurrentDateTime(10);
    console.log(anHourFromNow)
    let transactions = await Transaction.find({
      isActive: true,
      createdAt: { $lte: anHourFromNow },
    })
      .populate("account")
      .exec();

      transactions.forEach(async(transaction) => {
      // console.log(transaction._id);
      const date = new Date()
      const time = formattedTime(`${date.getHours()}`,`${date.getMinutes()}`)
      console.log(time)
      // const time = `${date.getHours()}:${date.getMinutes()}`
      
      console.log("this is the time :: " + time)
      if (transaction.time == time) {
        console.log("here you are")
      }
      if (transaction.date.toLocaleDateString() == new Date().toLocaleDateString() && transaction.time == time) {
        console.log(transaction.account)
        console.log(`running an update for transactions ${transaction._id}`)

        console.log(transaction.account)

        if (transaction.account == null) {
          console.log("Transaction available but account deleted!!!")
          return
        }

        let currentAmountAvailable = transaction.account.availableAmountToCashOut;

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

        console.log(`here we go ${JSON.stringify(updatedAccount)}`)

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
        console.log(`updating ${updateTransaction}`)
      

        const msisdn = transaction.account.isBeneficiary ? transaction.account.beneficiaryContact : transaction.account.ownerContact
        console.log(`msisdn for user ${msisdn}`)

        const user = await UserRepo.getUserByMsisdn(msisdn)

        const resp = await sendPushNotification(
            [user.playerId], 
            "Money Ready", 
            "Yaaayyyy!!!, it's pay time. Cash out big time and the Lord is in control", 
            null
        )
        console.log(resp.response.data)
      }
    });
  } catch (error) {
    console.log(error)
  }
}

function formattedTime(hour, minute){
  let hourStr = hour
  let minuteStr = minute

  if(hour.length == 1){
      hourStr = "0"+hour
  }
  if(minute.length < 2){
      minuteStr = "0"+minute
  }

  return `${hourStr}:${minuteStr}`
  
}

module.exports = CronNotificatioController;
