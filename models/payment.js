const mongoose = require("mongoose")
const {Schema} = mongoose

const paymentSchema = new Schema({
    transaction
    user: {type: Schema.Types.ObjectId, ref: 'users'},
    transaction: {type: Schema.Types.ObjectId, ref: 'transactions'},
    version: {type: Number, default: 1}
}, {timestamps: true})

// const model = mongoose.model("payments", paymentSchema)

// module.exports = model