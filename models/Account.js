const mongoose = require("mongoose")
const {Schema} = mongoose

const accountSchema = new Schema({
    chopMoneyOwner: {type: String, enum: ["MYSELF", "OTHERS"]},
    isBeneficiary: {type: Boolean, default: false},
    beneficiaryContact: {type: String},
    beneficiaryName: String,
    ownerContact: String,
    ownerName: String,
    payFrequency: {type: String, enum: ["DAILY", "WEEKLY", "BI-WEEKLY"]},
    payFrequencyAmount: Number,
    startDate: {type: Date, default: new Date()},
    endDate: {type: Date},
    payTime: {type: String},
    totalPayAmount: Number,
    remainder: {type:Number, default: 0.0},
    user: {type: Schema.Types.ObjectId, ref: 'users'},
    transactions: [{type: Schema.Types.ObjectId, ref: 'transactions'}],
    availableAmountToCashOut: {type:Number, default: 0.0},
    amountCashedOut: {type:Number, default: 0.0}, 
    isPaymentMade: {type: Boolean, default: false},
    version: {type: Number, default: 1}
}, {timestamps: true})

const model = mongoose.model("accounts", accountSchema)

module.exports = model