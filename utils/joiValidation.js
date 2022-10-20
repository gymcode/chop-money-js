const Joi = require("joi")

const RegistrationSchema = Joi.object({
    username:  Joi.string().alphanum().min(3).max(30).required(),
    msisdn: Joi.string().min(9).max(14),
    countryCode: Joi.string(),
    isoCode: Joi.string()   
})

module.exports = {RegistrationSchema}

