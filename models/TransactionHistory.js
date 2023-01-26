const mongoose = require("mongoose")
const {Schema} = mongoose

const transactionHistorySchema = new Schema({
    time: String,
    transactionAmount: Number,
    account: {type: Schema.Types.ObjectId, ref: "accounts"},
    transaction: {type: Schema.Types.ObjectId, ref: "transaction"},
    user: {type: Schema.Types.ObjectId, ref: "user"},
    version: {type: Number, default: 1}
}, {timestamps: true})

const model = mongoose.model("transactionHistories", transactionHistorySchema)

module.exports = model