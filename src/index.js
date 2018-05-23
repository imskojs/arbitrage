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
        let buyingQuantity = 0
        if (resultTwo.buyingRate < 0.001) {
          buyingQuantity = floor(resultTwo.buyingQuantity);
        } else if (resultTwo.buyingRate < 0.01) {
          buyingQuantity = floor(resultTwo.buyingQuantity, 1);
        } else if (resultTwo.buyingRate < 0.1) {
          buyingQuantity = floor(resultTwo.buyingQuantity, 2);
        } else if (resultTwo.buyingRate < 1) {
          buyingQuantity = floor(resultTwo.buyingQuantity, 3);
        }
        return Binance.buyLimit(market, buyingQuantity, resultTwo.buyingRate)
      } else {
        return of(resultTwo);
      }
    }),
    mergeMap(orderOrResult => {
      if (orderOrResult.orderId) {
        let { symbol, executedQty, price } = orderOrResult;
        let priceString = '' + floor(+price, 8);
        let priceLength = priceString.split('.')[1].length
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

