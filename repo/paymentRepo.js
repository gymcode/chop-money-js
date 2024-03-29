const Payment = require("../models/Payment");

async function addPayment(
  transactionId,
  externalRefId,
  user,
  paymentRequest,
  isDisbursementStatus,
  paymentResponse,
  accountId,
  amount
) {
  const paymentAuditRequest = new Payment({
    transactionId: transactionId,
    externalRefId: externalRefId,
    paymentRequest: JSON.stringify(paymentRequest),
    paymentResponse: JSON.stringify(paymentResponse),
    amount: amount,
    user: user._id,
    isDisbursement: isDisbursementStatus,
    account: accountId,
  });
  return await paymentAuditRequest.save();
}

async function getPaymentByAccountId(accountId) {
  return await Payment.findOne({
    account: accountId,
    isActive: true
  }).exec()
}

async function getPaymentByTransactionId(foreignID) {
  return await Payment.findOne({
    transactionId: foreignID,
  }).exec();
}

async function updatePayment(status, paymentId, req, paymentStatus) {
  return await Payment.updateOne(
    { _id: paymentId },
    {
      updateAt: new Date(),
      statusDescription: status,
      paymentResponse: JSON.stringify(req),
      isPaymentSuccessful: paymentStatus,
    },
    {
      new: true,
      upsert: true,
      rawResult: true, // Return the raw result from the MongoDB driver
    }
  );
}

module.exports = {
  addPayment,
  getPaymentByTransactionId,
  updatePayment,
  getPaymentByAccountId
};
