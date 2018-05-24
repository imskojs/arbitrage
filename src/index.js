const dotenv = require("dotenv");
dotenv.config();

import { zip, pipe, from, pairs, interval, merge, of } from "rxjs";
import { timeout, retry, map, switchMap, delay, startWith, take, mergeMap, repeat } from "rxjs/operators";
import R from "ramda";
import { floor } from "lodash"

const Binance = require("./utils/binanceAPI");
const Bittrex = require("./utils/bittrexAPI")
const calc = require("./utils/calc")

zip(
  Binance.getMarkets(`BTC`),
  Bittrex.getMarkets(`BTC`)
)
  .pipe(
    map(([binancePairs, bittrexPairs]) => R.intersection(binancePairs, bittrexPairs)),
    switchMap(pairsArray => {
      return zip(
        interval(250).pipe(
          take(pairsArray.length)
        ),
        from(pairsArray)
      )
    }),
    map(R.path([1])),
    mergeMap(pair => {
      return zip(
        Binance.getOrderbook(pair, `binance`),
        Bittrex.getOrderbook(pair, `bittrex`)
      )
    }),
    mergeMap(([binance, bittrex]) => {
      const binanceAsks = binance.asks;
      const binanceBids = binance.bids;
      const bittrexAsks = bittrex.asks;
      const bittrexBids = bittrex.bids;
      const market = binance.market;
      const resultTwo = calc.rateAndQuantityToBuy(bittrexBids, binanceAsks, 0.005, market, `bittrex`, `binance`)
      if (resultTwo.BTCValue >= 0.002) {
        let buyingQuantity = calc.buyingQuantity(resultTwo.buyingRate, resultTwo.buyingQuantity);
        console.log(`Buying ${buyingQuantity} of ${market} @ ${resultTwo.buyingRate}
TotalBTCValue is ${resultTwo.BTCValue}`);
        return Binance.buyLimit(market, buyingQuantity, resultTwo.buyingRate)
      } else {
        return of(resultTwo);
      }
    }),
    mergeMap(orderOrResult => {
      if (orderOrResult.orderId) {
        let { symbol, executedQty, price } = orderOrResult;
        let priceLength = calc.priceLength(price);

        return Binance.sellLimit(symbol, +executedQty, floor(+price * 1.005, priceLength))
      } else {
        return of(orderOrResult);
      }
    }),


    repeat()
  )
  .subscribe(
    (orderResult) => {
      if (orderResult.BTCValue !== 0) {
        console.log(orderResult)
      }
    },
    err => console.log(`ERROR:::: ${err}`),
    complete => console.log(`complete`)
  )


    // if orderOrResult.orderId
    // get bittrex address for the coin (orderOrResult.symbol `split at BTC`)
    // wait for address generation
    // withdraw to bittrex.
    // wait for deposit into bittrex
    // sell at price of orderOrResult.price * 1.005 quantity of orderOrResult.executedQty

