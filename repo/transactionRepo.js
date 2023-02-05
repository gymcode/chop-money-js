const Transaction = require("../models/Transaction");

async function addTransactions(objectArr) {
  return await Transaction.insertMany(objectArr);
}


