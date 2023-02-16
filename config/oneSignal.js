

async function sendPushNotification(playerIds, header, message, data) {
    try {
      // get token
      const appId = process.env.ONE_SIGNAL_APP_ID;
      const Key = process.env.ONE_SIGNAL_API_KEY;
      const url = process.env.ONE_SIGNAL_URL;
  
      const headers = {
        "content-type": "application/json",
        "Authorization": `Basic ${Key}`
      };

      const data = {
        app_id: appId,
        contents: {"en": message},
        headings: {"en": header},
        data: data,
        include_player_ids: playerIds
      }
  
      
    const response = await axios.post(url, data, {
        headers: headers,
    });
  
      return { code: "00", response: response };
    } catch (error) {
      // console.error(error.response.data.info);
      return { code: "01", response: error.response.data.info };
    }
  }
  
  module.exports = JuniPayPayment;
  