const {wrapFailureResponse} = require("../shared/response")
const {verifySignedJwtWebToken} = require("../utils/jwt_helpers")

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

function isUserAuthenticated(){
    return (req, res, next) =>{
        try {
            // getting from the headers 
            const authHeader = req.headers["authorization"]
            console.log(authHeader)

            if (authHeader == undefined) wrapFailureResponse(res, 400, "Authorization header not found", null)

            if (!authHeader.startsWith("Bearer")) wrapFailureResponse(res, 400, "Authorization header must start with /Bearer /", null)

            const token = authHeader.substring(7)
            const payload = verifySignedJwtWebToken(token)
            console.log(payload)
            
            if (payload == undefined) wrapFailureResponse(res, 400, "Authorized access get the user details", null)

            // check if the token has expired
            return next()
        } catch (error) {
            console.error(error)
        }
    }
}

module.exports = {
    userValidationMiddleware,
    isUserAuthenticated
}