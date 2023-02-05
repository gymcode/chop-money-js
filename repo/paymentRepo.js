const Payment = require("../models/Payment");

async function addPayment(
  transactionId,
  user,
  paymentRequest,
  request,
  isDisbursementStatus
) {
  const paymentRequest = new Payment({
    transactionId: transactionId,
    paymentRequest: JSON.stringify(paymentRequest),
    paymentResponse: "",
    amount: request.totalPayAmount,
    user: user._id,
    isDisbursement: isDisbursementStatus,
    account: request.accountId,
  });
  return await paymentRequest.save();
}

async function getPaymentByTransactionId(request) {
  return await Payment.findOne({
    transactionId: request.foreignID,
  }).exec();
}

async function updatePayment(status, payment, req, paymentStatus){
  return await Payment.updateOne(
    { _id: payment._id },
    {
      updateAt: new Date(),
      statusDescription: status,
      paymentResponse: JSON.stringify(req.body),
      isPaymentSuccessful: paymentStatus,
    },
    {
      new: true,
      upsert: true,
      rawResult: true, // Return the raw result from the MongoDB driver
    }
  );
}
