const TransactionHistory = require("../models/TransactionHistory");

async function addTransactionHistory(payment, status) {
  const transactionHistoryRequest = new TransactionHistory({
    transactionAmount: payment.amount,
    account: payment.account,
    status: status,
  });

  return await transactionHistoryRequest.save();
}

