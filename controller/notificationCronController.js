const Transaction = require("../models/Transaction");
const { getCurrentDateTime } = require("../utils/dateTimeHelpers");
const Account = require("../models/Account");

async function CronNotificatioController() {
  try {
    const anHourFromNow = getCurrentDateTime(24);
    // console.log(anHourFromNow)
    let transactions = await Transaction.find({
      isActive: true,
      createdAt: { $lte: anHourFromNow },
    })
      .populate("account")
      .exec();

    transactions.forEach(async(transaction) => {
      // console.log(transaction);
      if (transaction.createdAt == new Date()) {
        // we need to make this money available to the user and set the isActive to false
        //  we need to get the
        let currentAmountAvailable =
          transaction.account.availableAmountToCashOut;
        const transactionAmount = transaction.transactionAmount;
        currentAmountAvailable += currentAmountAvailable + transactionAmount;

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

        if (updatedAccount.value == null) throw new Error("Could not update the user account")

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

        if (updateTransaction.value == null) throw new Error("Could not update the user account")

        // sending push notifications to the users 
      }
    });
  } catch (error) {}
}

  // function removeDuplicates(array){
  //   const filteredArray = array.filter((item, index)=>{
  //       return array.indexOf(item) == index
  //   })
  //   return filteredArray
  // }

  // function climbingLeaderboard(ranked, player) {
  //   // Write your code here
  //   ranked = removeDuplicates(ranked)
  //   player = player.reverse()
  //   console.log(player)
  //   let j =0;
    
  //   let playerRanks = []
  //   for (let i = 0; i<player.length; i++){
  //       for(j; j<ranked.length; j++){
  //           if(player[i] < ranked[j]){
  //               j += 1 
  //               console.log(j)     
  //           }
  //       }
  //   }
  //   console.log(j)
  // }
module.exports = CronNotificatioController;
