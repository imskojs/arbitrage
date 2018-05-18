import { config as dotEnvConfig } from "dotenv";
dotEnvConfig();

import * as Bittrex from "./utils/bittrexAPI";

const { BITTREX_API_KEY, BITTREX_API_SECRET } = process.env;

// getMarkets()
//   .subscribe(body => console.log(body));

// Bittrex.getMarketHistory(`BTC-LTC`)
//   .subscribe(
//     body => console.log(body),
//     err => console.log('aaaa', err)
//   );



