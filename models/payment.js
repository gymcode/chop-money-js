const mongoose = require("mongoose")
const {Schema} = mongoose

const paymentSchema = new Schema({
    transactionId: String,
    accountType: {type: String, default: "MOMO_WALLET"},
    paymentRequest: String,
    paymentResponse: String,
    amount: Number,
    user: {type: Schema.Types.ObjectId, ref: 'users'},
    transaction: {type: Schema.Types.ObjectId, ref: 'transactions'},
    statusDescription: {type: String, default: "PENDING"},
    isPaymentSuccessful: {type: Boolean},
    version: {type: Number, default: 1}
}, {timestamps: true})

const model = mongoose.model("payments", paymentSchema)

module.exports = model