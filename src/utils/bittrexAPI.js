import { bindNodeCallback, pipe } from "rxjs";
import { map } from "rxjs/operators";
import R from "ramda";

import request from "request";
import hmacSHA512 from "crypto-js/hmac-sha512";
import nonce from "nonce";

const n = nonce();
const requestFactory = bindNodeCallback(request);

const API_KEY = process.env.BITTREX_API_KEY;
const API_SECRET = process.env.BITTREX_API_SECRET;

// Used to get the open and available trading markets at Bittrex along with other meta data.
// export function getmarkets() {
//   const getmarkets$ = requestfactory({
//     method: `get`,
//     uri: `https://bittrex.com/api/v1.1/public/getmarkets`,
//     json: true
//   });

//   return getmarkets$
//     .pipe(
//       map(([res, body]) => {
//         if (!body.success) {
//           throw new error(`getmarkets get: ${body.message}`);
//         } else {
//           return body.result;
//         }
//       }),
//       map(results => r.map(r.pick([`marketname`, `mintradesize`, `notice`, `isactive`]), results))
//     );
// }
export function getMarkets(baseCurrency = `BTC`) {
  const getMarkets$ = requestFactory({
    method: `GET`,
    uri: `https://bittrex.com/api/v1.1/public/getmarkets`,
    json: true
  });

  return getMarkets$
    .pipe(
      map(([res, body]) => {
        if (!body.success) {
          throw new Error(`getMarkets GET: ${body.message}`);
        } else {
          return body.result;
        }
      }),
      map(
        R.filter(R.whereEq({ BaseCurrency: baseCurrency, IsActive: true }))
      ),
      map(
        R.map(symbolObj => `${symbolObj.MarketCurrency}/${symbolObj.BaseCurrency}`)
      )
    );
}


// map(
//   R.filter(R.whereEq({ quoteAsset: `BTC`, status: `TRADING` }))
// ),
//   map(
//     R.map((symbolObj) => `${symbolObj.baseAsset}/${symbolObj.quoteAsset}`)
//   )


// Used to get all supported currencies at Bittrex along with other meta data.
export function getCurrencies() {
  const getCurrencies$ = requestFactory({
    method: `GET`,
    uri: `https://bittrex.com/api/v1.1/public/getcurrencies`,
    json: true
  });

  return getCurrencies$
    .pipe(
      map(([res, body]) => {
        if (!body.success) {
          throw new Error(`getCurrencies GET: ${body.message}`);
        } else {
          return body.result;
        }
      })
    )
}


//Used to get the current tick values for a market.
export function getTicker(market/*BTC-LTC*/) {
  const getTicker$ = requestFactory({
    method: `GET`,
    uri: `https://bittrex.com/api/v1.1/public/getticker?market=${market}`,
    json: true
  });

  // Bid Ask Last
  return getTicker$
    .pipe(
      map(([res, body]) => {
        if (!body.success) {
          throw new Error(`getTicker GET: ${body.message}`);
        } else {
          return body.result;
        }
      })
    )

}


// Used to get the last 24 hour summary of all active markets.
export function getMarketSummaries() {
  const getTicker$ = requestFactory({
    method: `GET`,
    uri: `https://bittrex.com/api/v1.1/public/getmarketsummaries`,
    json: true
  });

  // Bid Ask Last
  return getTicker$
    .pipe(
      map(([res, body]) => {
        if (!body.success) {
          throw new Error(`getMarketSummaries GET: ${body.message}`);
        } else {
          return body.result;
        }
      })
    )
}


// Used to get the last 24 hour summary of a specific market.
export function getMarketSummary(market) {
  const getMarketSummary$ = requestFactory({
    method: `GET`,
    uri: `https://bittrex.com/api/v1.1/public/getmarketsummary?market=${market}`,
    json: true
  });

  return getMarketSummary$
    .pipe(
      map(([res, body]) => {
        if (!body.success) {
          throw new Error(`getMarketSummary GET: ${body.message}`);
        } else {
          return body.result[0];  // array with length 1
        }
      })
    )

}



// Used to get retrieve the orderbook for a given market.
// market = LTC/BTC
export function getOrderbook(market, exchange) {
  const newMarket = market.split('/').reverse().join('-');
  if (newMarket.length < 1) {
    throw Error('Market symbol wrong');
  }
  const getMarketSummary$ = requestFactory({
    method: `GET`,
    uri: `https://bittrex.com/api/v1.1/public/getorderbook?market=${newMarket}&type=both`,
    json: true
  });

  return getMarketSummary$
    .pipe(
      map(([res, body]) => {
        return body.result;
      }),
      map(result => {
        let buy = []
        let sell = []
        if (result && result.buy) {
          buy = result.buy
        }
        if (result && result.sell) {
          sell = result.sell
        }
        return { bids: buy, asks: sell, market, exchange }
      })
    )
}


// Used to retrieve the latest trades that have occured for a specific market.

export function getMarketHistory(market) {
  const getMarketSummary$ = requestFactory({
    method: `GET`,
    uri: `https://bittrex.com/api/v1.1/public/getmarkethistory?market=${market}`,
    json: true
  });

  return getMarketSummary$
    .pipe(
      map(([res, body]) => {
        if (!body.success) {
          throw new Error(`getMarketHistory GET: ${body.message}`);
        } else {
          return body.result;
        }
      })
    );
}


// Used to place a buy order in a specific market. Use buylimit to place limit orders. Make sure you have the proper permissions set on your API keys for this call to work.
export function buyLimit(market, quantity, rate) {
  const uri = `https://bittrex.com/api/v1.1/market/buylimit?apikey=${API_KEY}&nonce=${n()}&market=${market}&quantity=${quantity}&rate=${rate}`;
  const apisign = hmacSHA512(uri, API_SECRET);
  const buyLimit$ = requestFactory({
    method: `GET`,
    uri,
    json: true,
    headers: { apisign }
  });

  return buyLimit$
    .pipe(
      //TODO::
    );
}



// Used to place an sell order in a specific market. Use selllimit to place limit orders. Make sure you have the proper permissions set on your API keys for this call to work.
export function sellLimit(market, quantity, rate) {
  const uri = `https://bittrex.com/api/v1.1/market/sellLimit?apikey=${API_KEY}&nonce=${n()}&market=${market}&quantity=${quantity}&rate=${rate}`;
  const apisign = hmacSHA512(uri, API_SECRET);
  const sellLimit$ = requestFactory({
    method: `GET`,
    uri,
    json: true,
    headers: { apisign }
  });

  return sellLimit$
    .pipe(
      //TODO::
    );
}

// Used to cancel a buy or sell order.
export function cancel(uuid) {
  const uri = `https://bittrex.com/api/v1.1/market/cancel?apikey=${API_KEY}&nonce=${n()}&uuid=${uuid}`;
  const apisign = hmacSHA512(uri, API_SECRET);
  const cancel$ = requestFactory({
    method: `GET`,
    uri,
    json: true,
    headers: { apisign }
  });

  return cancel$
    .pipe(
      //TODO::
    );
}


//Get all orders that you currently have opened. A specific market can be requested.
export function getOpenOrders(market) {
  let uri;
  if (market) {
    uri = `https://bittrex.com/api/v1.1/market/getOpenOrders?apikey=${API_KEY}&nonce=${n()}&market=${market}`;
  } else {
    uri = `https://bittrex.com/api/v1.1/market/getOpenOrders?apikey=${API_KEY}&nonce=${n()}`;
  }
  const apisign = hmacSHA512(uri, API_SECRET);
  const getOpenOrders$ = requestFactory({
    method: `GET`,
    uri,
    json: true,
    headers: { apisign }
  });

  return getOpenOrders$
    .pipe(
      //TODO::
    );
}


// Used to retrieve all balances from your account.
export function getBalances() {
  const uri = `https://bittrex.com/api/v1.1/account/getbalances?apikey=${API_KEY}&nonce=${n()}`;
  const apisign = hmacSHA512(uri, API_SECRET);
  const getBalances$ = requestFactory({
    method: `GET`,
    uri,
    json: true,
    headers: { apisign }
  });

  return getBalances$
    .pipe(
      //TODO::
    );
}


export function getBalance(currency) {
  const uri = `https://bittrex.com/api/v1.1/account/getbalance?apikey=${API_KEY}&nonce=${n()}&currency=${currency}`;
  const apisign = hmacSHA512(uri, API_SECRET);
  const getBalance$ = requestFactory({
    method: `GET`,
    uri,
    json: true,
    headers: { apisign }
  });

  return getBalance$
    .pipe(
      //TODO::
    );
}


// Used to retrieve or generate an address for a specific currency.If one does not exist,
//the call will fail and return ADDRESS_GENERATING until one is available.
export function getDepositAddress(currency) {
  const uri = `https://bittrex.com/api/v1.1/account/getdepositaddress?apikey=${API_KEY}&nonce=${n()}&currency=${currency}`;
  const apisign = hmacSHA512(uri, API_SECRET);
  const getDepositAddress$ = requestFactory({
    method: `GET`,
    uri,
    json: true,
    headers: { apisign }
  });

  return getDepositAddress$
    .pipe(
      //TODO::
    );
}


// Used to withdraw funds from your account. Note: please account for txfee.
export function withdraw(currency, quantity, address, paymentid) {
  let uri;
  if (paymentid) {
    uri = `https://bittrex.com/api/v1.1/account/withdraw?apikey=${API_KEY}&nonce=${n()}&currency=${currency}&quantity=${quantity}&address=${address}&paymentid=${paymentid}`;
  } else {
    uri = `https://bittrex.com/api/v1.1/account/withdraw?apikey=${API_KEY}&nonce=${n()}&currency=${currency}&quantity=${quantity}&address=${address}`;

  }
  const apisign = hmacSHA512(uri, API_SECRET);
  const withdraw$ = requestFactory({
    method: `GET`,
    uri,
    json: true,
    headers: { apisign }
  });

  return withdraw$
    .pipe(
      //TODO::

    );
}

// Used to retrieve a single order by uuid.

export function getOrder(uuid) {
  const uri = `https://bittrex.com/api/v1.1/account/getorder?apikey=${API_KEY}&nonce=${n()}&uuid=${uuid}`;
  const apisign = hmacSHA512(uri, API_SECRET);
  const getOrder$ = requestFactory({
    method: `GET`,
    uri,
    json: true,
    headers: { apisign }
  });

  return getOrder$
    .pipe(
      //TODO::
    );

}


// Used to retrieve your order history.
export function getOrderHistory(market) {
  let uri;
  if (market) {
    uri = `https://bittrex.com/api/v1.1/account/getorderhistory?apikey=${API_KEY}&nonce=${n()}&market=${market}`;
  } else {
    uri = `https://bittrex.com/api/v1.1/account/getorderhistory?apikey=${API_KEY}&nonce=${n()}`;

  }
  const apisign = hmacSHA512(uri, API_SECRET);
  const getOrder$ = requestFactory({
    method: `GET`,
    uri,
    json: true,
    headers: { apisign }
  });

  return getOrder$
    .pipe(
      //TODO::
    );
}


// Used to retrieve your withdrawal history.
export function getWithdrawalHistory(currency) {
  let uri;
  if (currency) {
    uri = `https://bittrex.com/api/v1.1/account/getwithdrawalhistory?apikey=${API_KEY}&nonce=${n()}&currency=${currency}`;
  } else {
    uri = `https://bittrex.com/api/v1.1/account/getwithdrawalhistory?apikey=${API_KEY}&nonce=${n()}`;

  }
  const apisign = hmacSHA512(uri, API_SECRET);
  const getWithdrawalHistory$ = requestFactory({
    method: `GET`,
    uri,
    json: true,
    headers: { apisign }
  });

  return getWithdrawalHistory$
    .pipe(
      //TODO::
    );
}


// Used to retrieve your deposit history.
export function getDepositHistory(currency) {
  let uri;
  if (currency) {
    uri = `https://bittrex.com/api/v1.1/account/getdiposithistory?apikey=${API_KEY}&nonce=${n()}&currency=${currency}`;
  } else {
    uri = `https://bittrex.com/api/v1.1/account/getdiposithistory?apikey=${API_KEY}&nonce=${n()}`;

  }
  const apisign = hmacSHA512(uri, API_SECRET);
  const getDipositHistory$ = requestFactory({
    method: `GET`,
    uri,
    json: true,
    headers: { apisign }
  });

  return getDipositHistory$
    .pipe(
      //TODO::
    );
}







