import { config as dotEnvConfig } from "dotenv";

import request from "request";

dotEnvConfig();

const {
  BITTREX_API_KEY,
  BITTREX_API_SECRET
} = process.env

function getMarkets() {
  // return observable
  request({
    method: 'GET',
    uri: 'https://bittrex.com/api/v1.1/public/getmarkets'
  }, function (err, res, body) {
    console.log(body)
  })
}

getMarkets()


