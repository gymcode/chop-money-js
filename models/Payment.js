const mongoose = require("mongoose")
const {Schema} = mongoose

const paymentSchema = new Schema({
    transactionId: String,
    externalRefId: {type:String, default: ""},
    accountType: {type: String, default: "MOMO_WALLET"},
    paymentRequest: String,
    paymentResponse: String,
    amount: Number,
    user: {type: Schema.Types.ObjectId, ref: 'users'},
    statusDescription: {type: String, default: "PENDING"},
    account: {type: Schema.Types.ObjectId, ref: "accounts"},
    isDisbursement: Boolean,
    isPaymentSuccessful: {type: Boolean},
    isActive: {type: Boolean, default: true},
    version: {type: Number, default: 1}
}, {timestamps: true})

const model = mongoose.model("payments", paymentSchema)

module.exports = model