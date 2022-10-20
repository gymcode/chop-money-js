const Joi = require("joi")

const RegistrationSchema = Joi.object({
    username:  Joi.string().alphanum().min(3).max(30).required,
    msisdn: Joi.string().number().min(9).max(14),
})

module.exports = {RegistrationSchema}

