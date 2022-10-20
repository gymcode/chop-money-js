const {wrapFailureResponse} = require("../shared/response")

function userValidationMiddleware (schema){
    return (req,res, next)=>{
        try {
            const {error} =  schema.validate(req.body)

            if (error == undefined) return next()
            wrapFailureResponse(res, 422,error.details[0].message, error)
        } catch (error) {
            console.error(error)
        }
    }
}

module.exports = {
    userValidationMiddleware
}