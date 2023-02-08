const Account = require("../models/Account");

async function addAccount(request, user, endDate) {
  const accountRequest = new Account({
    chopMoneyOwner: request.chopMoneyOwner,
    isBeneficiary: request.isBeneficiary,
    beneficiaryContact: request.beneficiaryContact,
    beneficiaryName: request.beneficiaryName,
    ownerContact: user.msisdn,
    ownerName: user.username,
    payFrequency: request.payFrequency,
    payFrequencyAmount: request.payFrequencyAmount,
    startDate: request.startDate,
    endDate: endDate,
    payTime: request.payTime,
    totalPayAmount: request.totalPayAmount,
    user: user._id,
  });

  return await accountRequest.save();
}

async function getAccount(accountId) {
  return await Account.findById({
    _id: accountId,
  }).exec();
}

async function getPopulatedTransactionsAccount(accountId) {
    return await Account.findById({
      _id: accountId,
    }).populate("transactions").exec();
  }

async function getPopulatedTransactionAccountByUserId(userId) {
  return await Account.find({ user: userId }).populate("transactions").exec();
}

function addTransactionsToAccounts(savedTransactions, account) {
  savedTransactions.map(({ _id }) => {
    account .transactions.push(_id);
  });
  return account.save();
}

async function updateAccountAmounts(
  currentAmountAvailable,
  amountCashedOut,
  accountId
) {
  return await Account.updateOne(
    { _id: accountId },
    {
      updateAt: new Date(),
      availableAmountToCashOut: currentAmountAvailable,
      amountCashedOut: amountCashedOut,
    },
    {
      new: true,
      upsert: true,
      rawResult: true,
    }
  );
}

async function updateAccountPayment(accountId) {
  return await Account.updateOne(
    { _id: accountId },
    {
      updateAt: new Date(),
      isPaymentMade: true,
    },
    {
      new: true,
      upsert: true,
      rawResult: true,
    }
  );
}

module.exports = {
  addAccount,
  addTransactionsToAccounts,
  updateAccountAmounts,
  updateAccountPayment,
  getAccount,
  getPopulatedTransactionAccountByUserId,
  getPopulatedTransactionsAccount
};
