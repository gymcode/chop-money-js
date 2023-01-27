const {
  GH_NUMBER_LENGTH_NINE,
  GH_INVALID_MSISDN,
  ISO_CODE,
} = require("../shared/constants");

function Gh_MsisdnValidation(msisdn) {
  try {
    let response = {};
    if (msisdn.length < 9) return { error: true, msg: GH_NUMBER_LENGTH_NINE };

    switch (true) {
      case msisdn.startsWith("0") && msisdn.length == 10:
        Object.assign(response, {
          error: false,
          msg: ISO_CODE + msisdn.substring(1),
        });
        break;

      case msisdn.startsWith("+") && msisdn.length > 12:
        Object.assign(response, { error: false, msg: msisdn.substring(1) });
        break;

      case msisdn.startsWith("00") && msisdn.length > 12:
        Object.assign(response, {
          error: false,
          msg: ISO_CODE + msisdn.substring(4),
        });
        break;

      case msisdn.substring(1) && msisdn.length == 9:
        Object.assign(response, { error: false, msg: ISO_CODE + msisdn });
        break;

      default:
        Object.assign(response, { error: true, msg: GH_INVALID_MSISDN });
        break;
    }
    return response;
  } catch (error) {
    console.error(error);
  }
}

function CountryMsisdnValidation(msisdn, countryCode = "GH") {
  try {
    let response;
    switch (countryCode) {
      case "GH":
        response = Gh_MsisdnValidation(msisdn);
        break;

      default:
        break;
    }
    return response;
  } catch (error) {
    console.error(error)
  }
}

module.exports = { CountryMsisdnValidation };


// def climbingLeaderboard(ranked, player):
//     ranked = sorted(list(set(ranked)), reverse=True)
//     player = sorted(player, reverse=True)
//     print(f"don't take me there {ranked}")
//     print(f"we will make it {player}")
//     l=len(ranked)
//     j=0
    
//     ans=[]
//     for i in range(len(player)):
//         print(f"this is me {i}")
//         while j<l and player[i]<ranked[j]:
//             j+=1
//             print(f"oh no {j}")
//         print(f"printing till we get it {ans}")
//         ans.append(j+1)
//     print(f"hello {ans}")
//     return ans[::-1]
