const TransactionHistory = require("../models/TransactionHistory");

async function addTransactionHistory(payment, status, foreignId) {
  const transactionHistoryRequest = new TransactionHistory({
    transactionAmount: payment.amount,
    account: payment.account,
    status: status,
    foreignId: foreignId
  });

  return await transactionHistoryRequest.save();
}

async function getTransactionHistoryByAccId(accountId, date) {
  return await TransactionHistory.find({
    account: accountId,
    status: "SUCCESS",
    createdAt: { $eq: date },
  }).exec();
}

async function listTransactionPerAccount(accountId) {
  return await TransactionHistory.find({
    account: accountId,
  }).exec();
}

async function getTransationHistoryByForeignId(foreignId) {
  return await TransactionHistory.findOne({
    foreignId: foreignId,
  }).exec();
}

async function updateTransactionHistoryStatus(status, foreignId) {
  return await TransactionHistory.updateOne(
    { foreignId: foreignId, },
    {
      updateAt: new Date(),
      status: status
    },
    {
      new: true,
      upsert: true,
      rawResult: true, // Return the raw result from the MongoDB driver
    }
  );
}


module.exports = {
  addTransactionHistory,
  listTransactionPerAccount,
  getTransactionHistoryByAccId,
  getTransationHistoryByForeignId,
  updateTransactionHistoryStatus
};
