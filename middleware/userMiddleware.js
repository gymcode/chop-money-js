const Joi = require("joi")
const {CODE_FAILURE} =  require("../shared/constants")

function userValidationMiddleware (schema){
    return (req,res, next)=>{
        try {
            const {error, valid} =  Joi.validate(req.body,schema)
            if (valid) return next()
            res.status(422).json({
                code: CODE_FAILURE,
                msg: "failure",
                data: null,
                errors: error
            })
        } catch (error) {
            console.error(error)
        }
    }
}

module.exports = {
    userValidationMiddleware
}