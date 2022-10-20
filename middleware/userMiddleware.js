const Joi = require("joi")
const {CODE_FAILURE} =  require("../shared/constants")

function userValidationMiddleware (schema){
    return (req,res, next)=>{
        try {
            const {error, value} =  schema.validate(req.body)
            console.log(value)
            console.log(error)
            if (error == undefined) return next()
            res.status(422).json({
                code: CODE_FAILURE,
                msg: error.details[0].message,
                data: null,
                error: error
            })
        } catch (error) {
            console.error(error)
        }
    }
}

module.exports = {
    userValidationMiddleware
}