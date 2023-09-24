const { wrapFailureResponse } = require("../shared/response");
const { verifySignedJwtWebToken } = require("../utils/jwt_helpers");
const User = require("../models/User");

function userValidationMiddleware(schema) {
  return (req, res, next) => {
    try {
      const { error } = schema.validate(req.body);

      if (error == undefined) return next();
      wrapFailureResponse(res, 422, error.details[0].message, error);
    } catch (error) {
      console.error(error);
    }
  };
}

function isUserAuthenticated() {
  return async (req, res, next) => {
    try {

      const authHeader = req.headers["authorization"];

      if (authHeader == undefined)
        return wrapFailureResponse(
          res,
          400,
          "Authorization header not found",
          null
        );

      if (!authHeader.startsWith("Bearer"))
        return wrapFailureResponse(
          res,
          400,
          "Authorization header must start with /Bearer /",
          null
        );

      const token = authHeader.split(" ")

      let accessToken = token[1];

      const data = verifySignedJwtWebToken(
        accessToken,
        process.env.ACCESS_TOKEN_SECRET
      );

      if (data.expired)
        return res.status(401).json({
          code: "03",
          msg: "failure",
          data: null,
          error: {
              error: true,
              errMsg: "Un-authorized access", 
              detailedError: null
          }
      })
      

      let payload = data.payload;

      const user = await User.findOne({ _id: payload._id })
        .populate({
          path: "accounts",
          match: { isPaymentMade: true }
          // populate: { path: "transactions" },
        })
        .exec();
      const user_info = { user: user, token: accessToken };
      res.locals.user_info = user_info;

      return next();
    } catch (error) {
      console.error(error);
    }
  };
}

module.exports = {
  userValidationMiddleware,
  isUserAuthenticated,
};
