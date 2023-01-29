const { wrapFailureResponse } = require("../shared/response");
const { verifySignedJwtWebToken } = require("../utils/jwt_helpers");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

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

      // getting from the headers
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
        return wrapFailureResponse(res, 400, "Un-authorized access", null);

      let payload = data.payload;

      // use the id in the payload to get the user data
      const user = await User.findOne({ _id: payload._id })
        .populate({
          path: "accounts",
          populate: { path: "transactions" },
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
