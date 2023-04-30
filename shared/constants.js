const CODE_SUCCESS = "00"
const CODE_FAILURE = "01"
const CODE_INTERNAL_SERVER_ERROR = "02"

const BASE_URL = "/api/v1"

// messages
const GH_NUMBER_LENGTH_NINE = "Phone number cannot be less than 9 digits"
const GH_INVALID_MSISDN = "You have entered an invalid phone number, Please try again"
const ISO_CODE = "233"
const BENEFICIARY_SMS = "Congratulations {BENE_NAME}, {OWNER_NAME} just created a budget for you on Chopmoney! You’ll receive GHS {AMOUNT} {FREQUENCY} at {TIME} for the next 30 days.Thank you! www.chopmoney.co"
const ACCOUNT_OWNER_SMS = "You do all! You just created a budget for {BENE_NAME} on Chopmoney. GHS {AMOUNT} will be sent to your beneficiary {FREQUENCY} at {TIME} for the next 30 days. Thank you! www.chopmoney.co"

module.exports = {
    CODE_FAILURE,
    CODE_SUCCESS,
    CODE_INTERNAL_SERVER_ERROR,
    BASE_URL,
    GH_NUMBER_LENGTH_NINE,
    GH_INVALID_MSISDN,
    ISO_CODE,
    BENEFICIARY_SMS,
    ACCOUNT_OWNER_SMS
}
