const Transaction = require("../models/Transaction");

async function addTransactions(objectArr) {
  return await Transaction.insertMany(objectArr);
}

async function closeAllTransactionByAccountId(accountId){
  return await Transaction.updateMany(
    { account: accountId },
    {
      updateAt: new Date(),
      isActive: false,
    },
    {
      new: true,
      upsert: true,
      rawResult: true,
    }
  )
}

module.exports = {
  addTransactions,
  closeAllTransactionByAccountId
}
