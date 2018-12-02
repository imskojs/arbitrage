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
const intervalInMiliseconds = 500;
const VARIABLE_LIMIT = 0.19; // 19% variance coins (24hours) excluded

const IN_DEV = false;

of(1).pipe(
  delay(intervalInMiliseconds),
  mergeMap(_ => {
    return zip(
      Binance.getMarkets(baseMarket),
      Bittrex.getMarkets(baseMarket),
      Bittrex.getCurrencies(),
      Bittrex.getMarketSummaries()
    )
  }),
  map(([binancePairs, bittrexPairs, bittrexCurrencies, bittrexSummaries]) => {
    // Remove Inactive Currencies
    const inactiveBittrex = bittrexCurrencies
      .filter((obj) => obj.IsActive === false)
      .map(obj => obj.Currency);

    inactiveBittrex.forEach(sym => {
      const index = bittrexPairs.indexOf(`${sym}/${baseMarket}`)
      bittrexPairs.splice(index, 1)
    })

    // Remove Too vairalbe currencies
    const tooVariable = bittrexSummaries
      .filter(obj => obj.MarketName.includes(`${baseMarket}-`))
      .filter(obj => {
        return ((obj.High - obj.Low) / obj.Low) > VARIABLE_LIMIT
      })
      .map(obj => {
        const marketName = obj.MarketName.split(`-`);
        const altSym = marketName[1];
        return altSym
      })

    console.log(`too variable coins count:`, tooVariable.length)
    tooVariable.forEach(sym => {
      const index = bittrexPairs.indexOf(`${sym}/${baseMarket}`)
      bittrexPairs.splice(index, 1)
    })

    if (IN_DEV) { return [] }
    return R.intersection(binancePairs, bittrexPairs)
  }),
  // Remove TUSD
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

    const resultTwo = calc.rateAndQuantityToBuy(bittrexBids, binanceAsks, 0.0059, market, `bittrex`, `binance`)
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
      delayWhen(val => timer(600000)),
      scan((accum, num) => {
        if (accum > 15) {
          throw Error(`Errored more than 9 times`);
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


// No internet connection (ERROR)
// code: 'ENOTFOUND'

//{ code: -2010,
//msg: 'Account has insufficient balance for requested action.' }


//{
//  code: -1021,
    // msg: 'Timestamp for this request was 1000ms ahead of the server\'s time.'
// }


// {
//   code: -1013,
//     msg: 'Filter failure: MIN_NOTIONAL',
//       exchange: 'binance'
// }
