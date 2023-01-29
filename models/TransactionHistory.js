const mongoose = require("mongoose")
const {Schema} = mongoose

const transactionHistorySchema = new Schema({
    transactionAmount: Number,
    account: {type: Schema.Types.ObjectId, ref: "accounts"},    
    status: String,
    version: {type: Number, default: 1}
}, {timestamps: true})

const model = mongoose.model("transactionHistories", transactionHistorySchema)

module.exports = model