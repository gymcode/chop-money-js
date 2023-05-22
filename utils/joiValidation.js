const Joi = require("joi")

const RegistrationSchema = Joi.object({
    username:  Joi.string().required(),
    provider: Joi.string().required(),
    msisdn: Joi.string().min(9).max(14),
    countryCode: Joi.string(),
    isoCode: Joi.string(),
})

const UpdateUserSchema = Joi.object({
    username:  Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email({ minDomainSegments: 2, tlds: { allow: ['com', 'net'] } }).optional().allow(""),
    gender: Joi.string()
})



module.exports = {RegistrationSchema, UpdateUserSchema}

