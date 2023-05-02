const TransactionHistory = require("../models/TransactionHistory");

async function addTransactionHistory(payment, status) {
  const transactionHistoryRequest = new TransactionHistory({
    transactionAmount: payment.amount,
    account: payment.account,
    status: status,
  });

  return await transactionHistoryRequest.save();
}

async function getTransactionHistoryByAccId(accountId, date){
  return await TransactionHistory.find({
    account: accountId,
    status: "SUCCESS",
    createdAt: { $eq: date }
  }).exec();
}

async function listTransactionPerAccount(accountId) {
  return await TransactionHistory.find({
    account: accountId,
  }).exec();
}

module.exports = {
  addTransactionHistory,
  listTransactionPerAccount,
  getTransactionHistoryByAccId
}