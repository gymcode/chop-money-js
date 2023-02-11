const Transaction = require("../models/Transaction");
const { getCurrentDateTime } = require("../utils/dateTimeHelpers");
const Account = require("../models/Account");

async function CronNotificatioController() {
  try {
    const anHourFromNow = getCurrentDateTime(20);
    // console.log(anHourFromNow)
    let transactions = await Transaction.find({
      isActive: true,
      createdAt: { $lte: anHourFromNow },
    })
      .populate("account")
      .exec();
    // console.log(transactions)
    transactions.forEach(async(transaction) => {
      // console.log(transaction._id);
      if (transaction.date.toLocaleDateString() == new Date().toLocaleDateString()) {
        console.log(`running an update for transactions ${transaction._id}`)
        // we need to make this money available to the user and set the isActive to false
        //  we need to get the
        let currentAmountAvailable =
          transaction.account.availableAmountToCashOut;
        const transactionAmount = transaction.transactionAmount;
        currentAmountAvailable += transactionAmount;

        // console.log(`here we go ${currentAmountAvailable}`)
        // updating the user's account with the new amount
        const updatedAccount = await Account.updateOne(
          { _id: transaction.account._id },
          {
            updateAt: new Date(),
            availableAmountToCashOut: currentAmountAvailable,
          },
          {
            new: true,
            upsert: true,
            rawResult: true, // Return the raw result from the MongoDB driver
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
            rawResult: true, // Return the raw result from the MongoDB driver
          }
        );
        console.log(`updating ${updateTransaction}`)

        // if (updateTransaction.value == null) throw new Error("Could not update the user account")

        // sending push notifications to the users 
      }
    });
  } catch (error) {
    console.log(error)
  }
}

module.exports = CronNotificatioController;
