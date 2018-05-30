const dotenv = require("dotenv");
dotenv.config();

import { zip, pipe, from, pairs, interval, merge, of, timer } from "rxjs";
import { timeout, retry, map, switchMap, delay, startWith, take, mergeMap, repeat, retryWhen, tap, delayWhen, scan, concatMap } from "rxjs/operators";
import R from "ramda";
import { floor, ceil, remove } from "lodash"

const Binance = require("./utils/binanceAPI");
const Bittrex = require("./utils/bittrexAPI")
const calc = require("./utils/calc")

const baseMarket = `BTC`;
const intervalInMiliseconds = 110;

zip(
  Binance.getMarkets(baseMarket),
  Bittrex.getMarkets(baseMarket)
)
  .pipe(
    map(([binancePairs, bittrexPairs]) => R.intersection(binancePairs, bittrexPairs)),
    map(pairs => R.remove(R.indexOf(`TUSD/${baseMarket}`, pairs), 1, pairs)),
    switchMap(pairsArray => {
      return zip(
        interval(intervalInMiliseconds).pipe(
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
      // const resultOne = calc.rateAndQuantityToBuy(binanceBids, bittrexAsks, 0.0085, market, `binance`, `bittrex`)

      const resultTwo = calc.rateAndQuantityToBuy(bittrexBids, binanceAsks, 0.0058, market, `bittrex`, `binance`)
      if (resultTwo.BTCValue >= 0.0015) {
        let buyingQuantity = calc.buyingQuantity(resultTwo.buyingRate, resultTwo.buyingQuantity);
        console.log(` Binance M: ${market} P: ${resultTwo.buyingRate} Q: ${buyingQuantity} T: ${resultTwo.BTCValue} `);
        return Binance.buyLimit(market, buyingQuantity, resultTwo.buyingRate)
        // } else if (resultOne.BTCValue >= 0.0006) {
        //   let buyingQuantity = calc.buyingQuantity(resultOne.buyingRate, resultOne.buyingQuantity);
        //   console.log(` Bittrex M: ${market} P: ${resultOne.buyingRate} Q: ${buyingQuantity} T: ${resultOne.BTCValue} `);
        //   return Bittrex.buyLimit(market, buyingQuantity, resultOne.buyingRate)
      } else {
        // if (resultOne.BTCValue !== 0) {
        //   return of(resultOne);
        // } else {
        return of(resultTwo);
        // }
      }
    }),
    mergeMap(orderOrResult => {
      if (orderOrResult.orderId) {
        console.log(orderOrResult);
        let { symbol, executedQty, price, exchange, origQty, orderId } = orderOrResult;
        let priceLength = calc.priceLength(price);

        if (exchange === `binance`) {

          if (floor(+executedQty, 8) === 0) {

            return Binance.cancel(orderId, symbol).pipe(
              switchMap(cancelObj => {
                if (cancelObj.code === -2011 || cancelObj.msg === `UNKNOWN_ORDER`) {
                  return Binance.sellLimit(symbol, +origQty, ceil(+price * 1.003, priceLength))
                } else {
                  return of(cancelObj)
                }
              })
            )

          } else if (floor(+origQty - +executedQty, 8) > 0) {
            return Binance.cancel(orderId, symbol)
              .pipe(
                switchMap(cancelObj => Binance.sellLimit(symbol, +executedQty, ceil(+price * 1.003, priceLength)))
              )
          } else {
            return Binance.sellLimit(symbol, +executedQty, ceil(+price * 1.003, priceLength))
          }
          // } else if (exchange === `bittrex`) {
          //   console.log(`Bittrex Sell ${+executedQty}`);
          //   return Bittrex.sellLimit(symbol, +executedQty, ceil(+price * 1.007, priceLength))
        } else {
          throw Error(`Something is Wrong in sellLimit`);
        }
      } else {
        return of(orderOrResult);
      }
    }),
    map(orderOrResult => {
      if (orderOrResult.msg && orderOrResult.msg.includes(`insufficient balance`)) {
        throw Error(`insufficient balance ${orderOrResult.exchange}`);
      } else {
        return orderOrResult;
      }
    }),
    repeat(),
    retryWhen(error$ => {
      return error$.pipe(
        tap(err => console.log(err)),
        delayWhen(val => timer(5000)),
        scan((accum, num) => {
          if (accum > 3) {
            throw Error(`Errored more than 2 times`);
          }
          return accum + 1;
        }, 0)
      )
    })
  )
  .subscribe(
    (orderResult) => {
      if (orderResult.BTCValue !== 0) {
        if (orderResult.BTCValue && orderResult.BTCValue <= 0.0015) {
          // don't log smaller than 0.0015
        } else {
          console.log(orderResult)
        }
      }
    },
    err => console.log(`ERROR:::: ${err}`),
    complete => console.log(`complete`)
  )


// if sudden change in volumn in bittrex
// // if sudden positive price change in bittrex
// // // if the price difference is > 0.004 compared to binance price 