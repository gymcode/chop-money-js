const Transaction = require("../models/Transaction");
const { getCurrentDateTime } = require("../utils/dateTimeHelpers");
const Account = require("../models/Account");

async function CronNotificatioController() {
  const anHourFromNow = getCurrentDateTime(24);
  // console.log(anHourFromNow)
  let transactions = await Transaction.find({
    isActive: true,
    createdAt: { $lte: anHourFromNow },
  })
    .populate("account")
    .exec();

  transactions.forEach((transaction) => {
    console.log(transaction);
    if (transaction.createdAt == new Date()) {
      // we need to make this money available to the user and set the isActive to false
      //  we need to get the
      let currentAmountAvailable = transaction.account.availableAmountToCashOut;
      const transactionAmount = transaction.transactionAmount;
      currentAmountAvailable += currentAmountAvailable + transactionAmount;

      // updating the user's account with the new amount
      const updatedAccount = Account.updateOne(
        { _id: transaction.account._id },
        {
          update_at: new Date(),
          availableAmountToCashOut: currentAmountAvailable,
        },
        {
          new: true,
          upsert: true,
          rawResult: true, // Return the raw result from the MongoDB driver
        }
      );

      // update the user's transaction
      const updateTransaction = Transaction.updateOne(
        { _id: transaction._id },
        {
          update_at: new Date(),
          isActive: false,
        },
        {
          new: true,
          upsert: true,
          rawResult: true, // Return the raw result from the MongoDB driver
        }
      );

      console.log(transaction.createdAt);
    }
  });
}

module.exports = CronNotificatioController;
