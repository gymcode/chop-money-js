const {CODE_FAILURE, CODE_SUCCESS} = require("../shared/constants")

function wrapFailureResponse(res, statusCode, errorMsg, detailedError = null){
    res.status(statusCode).json({
        code: CODE_FAILURE,
        msg: "failure",
        data: null,
        error: {
            error: true,
            errMsg: errorMsg, 
            detailedError: detailedError
        }
    })
}

function wrapSuccessResponse(res, statusCode, errorMsg, detailedError = null){
    res.status(statusCode).json({
        code: CODE_SUCCESS,
        msg: "success",
        data: null,
        error: {
            error: true,
            errMsg: errorMsg, 
            detailedError: detailedError
        }
    })
}

module.exports = {
    wrapFailureResponse,
    wrapSuccessResponse
}

    
