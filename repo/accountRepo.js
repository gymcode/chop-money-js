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
    remainder: request.totalPayAmount,  
    payFrequencyAmount: request.payFrequencyAmount,
    startDate: request.startDate,
    endDate: endDate,
    payTime: request.payTime,
    totalPayAmount: request.totalPayAmount,
    provider: request.provider,
    user: user._id,
  });

  return await accountRequest.save({ populate: { path: 'user' } });
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

async function getAccounts(pageNumber, pageSize, type, startDate, endDate, activeBudgets, inactiveBudgets, search) {
  const skip = (pageNumber - 1) * pageSize;

  const query = type ? { chopMoneyOwner: type } : {};

  // Add additional filters based on parameters
  if (startDate && endDate) {
    query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  } else if (startDate) {
    query.createdAt = { $gte: new Date(startDate) };
  } else if (endDate) {
    query.createdAt = { $lte: new Date(endDate) };
  }

  console.log("value for active ", activeBudgets)
  if (activeBudgets) {
    console.log("here")
    query.isDelete = false;
    query.availableAmountToCashOut = { $gt: 0 };
    query.remainder = { $gt: 0 };
  }

  if (inactiveBudgets) {
    query.isDelete = true;
    query.availableAmountToCashOut = 0;
    query.remainder = 0;
  }

  if (search) {
    // Add conditions for search by phone, user id, device id
    query.$or = [
      { ownerContact: new RegExp(search, 'i') },
      { 'user._id': new RegExp(search, 'i') }, // Assuming 'userId' is the field in the 'user' document
      { 'user.playerId': new RegExp(search, 'i') }, // Assuming 'userId' is the field in the 'user' document
      // Add more conditions for other fields if needed
    ];
  }

  return await Account.find(query).skip(skip).limit(pageSize).exec();
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
  accountId,
  remainder
) {
  return await Account.updateOne(
    { _id: accountId },
    {
      updateAt: new Date(),
      availableAmountToCashOut: currentAmountAvailable,
      amountCashedOut: amountCashedOut,
      remainder: remainder
    },
    {
      new: true,
      upsert: true,
      rawResult: true,
    }
  );
}

async function updateAccountDeleteStatus(accountId) {
  return await Account.updateOne(
    { _id: accountId },
    {
      updateAt: new Date(),
      isDelete: true
    },
    {
      new: true,
      upsert: true,
      rawResult: true,
    }
  );
}

async function updateAccountDeleteCount(accountId, deleteCount) {
  return await Account.updateOne(
    { _id: accountId },
    {
      updateAt: new Date(),
      isDeleteDayCount: deleteCount
    },
    {
      new: true,
      upsert: true,
      rawResult: true,
    }
  );
}

async function updateAccountBeneficiary(accountId, status) {
  return await Account.updateOne(
    { _id: accountId },
    {
      updateAt: new Date(),
      isBeneficiary: status
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

async function updateAccountDeleteInformation(accountId, remainder, availableAmountToCashOut) {
  return await Account.updateOne(
    { _id: accountId },
    {
      remainder: remainder,
      availableAmountToCashOut: availableAmountToCashOut,
      updateAt: new Date(),
    },
    {
      new: true,
      upsert: true,
      rawResult: true,
    }
  );
}

async function deleteAccount(accountId) {
  return await Account.deleteOne(
    { _id: accountId },
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
  getAccounts,
  getPopulatedTransactionAccountByUserId,
  getPopulatedTransactionsAccount,
  updateAccountDeleteCount,
  updateAccountDeleteStatus,
  updateAccountBeneficiary,
  updateAccountDeleteInformation,
  deleteAccount
};
