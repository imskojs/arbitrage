// ping, 
import { bindNodeCallback, pipe } from "rxjs";
import { map } from "rxjs/operators";
import R from "ramda";

import request from "request";
import hmacSHA256 from "crypto-js/hmac-sha256";

const requestFactory = bindNodeCallback(request);
const base = `https://api.binance.com`

const API_KEY = process.env.BINANCE_API_KEY;
const API_SECRET = process.env.BINANCE_API_SECRET;


// Test connectivity to the Rest API.
export function ping() {
  const ping$ = requestFactory({
    method: `GET`,
    uri: `${base}/api/v1/ping`,
    json: true
  });
  return ping$.pipe(
    map(res => res[1])
  );
}

// Test connectivity to the Rest API and get the current server time.
export function time() {
  const time$ = requestFactory({
    method: `GET`,
    uri: `${base}/api/v1/time`,
    json: true
  });
  return time$.pipe(
    map(res => res[1])
  );
}

//Current exchange trading rules and symbol information
export function getMarkets(baseCurrency = `BTC`) {
  const exchangeInfo$ = requestFactory({
    method: `GET`,
    uri: `${base}/api/v1/exchangeInfo`,
    json: true
  });
  return exchangeInfo$.pipe(
    map(
      R.path([1, `symbols`])
    ),
    map(
      R.filter(R.whereEq({ quoteAsset: baseCurrency, status: `TRADING` }))
    ),
    map(
      R.map(symbolObj => `${symbolObj.baseAsset}/${symbolObj.quoteAsset}`)
    )
  );
}

// Get currecy order book: symbol LTC/BTC, limit 5 10 20 50 100 500 1000
export function getOrderbook(symbol, exchange, limit = 100) {
  const newSymbol = symbol.split('/').join('');
  if (newSymbol.length < 1) { throw Error('Market symbol wrong'); }

  const depth$ = requestFactory({
    method: `GET`,
    uri: `${base}/api/v1/depth?symbol=${newSymbol}`,
    json: true
  });

  return depth$.pipe(
    map(res => res[1]),
    map(result => ({
      bids: R.map(array => ({ Quantity: +array[1], Rate: +array[0] }), result.bids),
      asks: R.map(array => ({ Quantity: +array[1], Rate: +array[0] }), result.asks),
      market: symbol,
      exchange
    })
    )
  );
}

// Get recent trades (up to last 500).
export function trades(symbol, limit = 500) {
  const trades$ = requestFactory({
    method: `GET`,
    uri: `${base}/api/v1/trades?symbol=${symbol}&limit=${limit}`,
    json: true
  });
  return trades$.pipe(
    map(res => res[1])
  );
}

// Latest price for a symbol or symbols
// If the symbol is not sent, prices for all symbols will be returned in an array.

export function price(symbol) {
  let uri = `${base}/api/v3/ticker/price`;
  uri = symbol ? uri + `?symbol=${symbol}` : uri;
  console.log(uri)

  const price$ = requestFactory({
    method: `GET`,
    uri,
    json: true
  });
  return price$.pipe(
    map(res => res[1])
  );
}

// order book
export function bookTicker(symbol) {
  let uri = `${base}/api/v3/ticker/bookTicker`;
  uri = symbol ? uri + `?symbol=${symbol}` : uri;

  const bookTicker$ = requestFactory({
    method: `GET`,
    uri,
    json: true
  });
  return bookTicker$.pipe(
    map(res => res[1])
  );
}

// Buy
export function buyLimit(symbol, quantity, rate) {
  const newSymbol = symbol.split('/').join('');
  if (newSymbol.length < 1) { throw Error('Market symbol wrong'); }

  const params = `symbol=${newSymbol}&side=BUY&type=LIMIT&quantity=${quantity}&price=${rate}&timeInForce=GTC&timestamp=${Date.now()}`;

  const signature = hmacSHA256(params, API_SECRET);

  const buyLimit$ = requestFactory({
    method: `POST`,
    uri: `${base}/api/v3/order?${params}&signature=${signature}`,
    headers: { "X-MBX-APIKEY": API_KEY },
    json: true
  });
  return buyLimit$.pipe(
    map(res => res[1])
  );
}

// Sell
export function sellLimit(market, quantity, rate) {
  const params = `symbol=${market}&side=SELL&type=LIMIT&quantity=${quantity}&price=${rate}&timeInForce=GTC&timestamp=${Date.now()}`;
  const signature = hmacSHA256(params, API_SECRET);

  const buyLimit$ = requestFactory({
    method: `POST`,
    uri: `${base}/api/v3/order?${params}&signature=${signature}`,
    headers: { "X-MBX-APIKEY": API_KEY },
    json: true
  });
  return buyLimit$.pipe(
    map(res => res[1])
  );
}

//Check an order's status.
export function getOrder(uuid, market) {
  const params = `symbol=${market}&orderId=${uuid}&timestamp=${Date.now()}`;
  const signature = hmacSHA256(params, API_SECRET);

  const getOrder$ = requestFactory({
    method: `GET`,
    uri: `${base}/api/v3/order?${params}&signature=${signature}`,
    headers: { "X-MBX-APIKEY": API_KEY },
    json: true
  })

  return getOrder$.pipe(
    map(res => res[1])
  );
}

// Cancel order
export function cancel(uuid, market) {
  const params = `symbol=${market}&orderId=${uuid}&timestamp=${Date.now()}`;
  const signature = hmacSHA256(params, API_SECRET);

  const cancel$ = requestFactory({
    method: `DELETE`,
    uri: `${base}/api/v3/order?${params}&signature=${signature}`,
    headers: { "X-MBX-APIKEY": API_KEY },
    json: true
  })

  return cancel$.pipe(
    map(res => res[1])
  );
}

// { asset: 'EOS', free: '666.42485001', locked: '0.00000000' }
// or [{asset, free, locked}, ...]
export function getBalances(currency) {
  const params = `timestamp=${Date.now()}`;
  const signature = hmacSHA256(params, API_SECRET);

  const account$ = requestFactory({
    method: `GET`,
    uri: `${base}/api/v3/account?${params}&signature=${signature}`,
    headers: { "X-MBX-APIKEY": API_KEY },
    json: true
  })

  return account$.pipe(
    map(res => res[1].balances),
    map(balances => currency ? R.find(R.propEq('asset', currency))(balances) : balances)
  );
}



// //Get all orders that you currently have opened. A specific market can be requested.
// // Not working
// export function getOpenOrders(market) {

//   const params = `symbol=${market}&timestamp=${Date.now()}`

//   const signature = hmacSHA256(params, API_SECRET);

//   const getOpenOrders$ = requestFactory({
//     method: `GET`,
//     uri: `${base}/api/v3/openOrders?{params}&signature=${signature}`,
//     headers: { "X-MBX-APIKEY": API_KEY },
//     json: true
//   });

//   return getOpenOrders$.pipe(
//     map(res => res[1])
//   );

// }


