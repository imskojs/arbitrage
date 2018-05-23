import { floor } from "lodash";

export function rateAndQuantityToBuy(bids, asks, ratio, market, bidsExchangeName, asksExchangeName) {
  let askIndex = 0;
  let bidIndex = 0;
  let currentAskQuantity = false;
  let currentBidQuantity = false;
  let buyingRate = 0;
  let buyingQuantity = 0;
  while (askIndex < 100 && asks[askIndex] != null) {
    while (bidIndex < 100 && bids[bidIndex] != null) {
      if (buyCondition(asks, bids, askIndex, bidIndex, ratio)) {
        buyingRate = asks[askIndex].Rate;
        if (firstTimeRunning(currentAskQuantity, currentBidQuantity)) {
          currentAskQuantity = asks[askIndex].Quantity
          currentBidQuantity = bids[bidIndex].Quantity
        }
        if (moreAskQuantity(currentAskQuantity, currentBidQuantity)) {
          buyingQuantity = floor(buyingQuantity + currentBidQuantity, 8);
          currentAskQuantity = floor(currentAskQuantity - currentBidQuantity, 8);
          currentBidQuantity = 0;
          bidIndex = bidIndex + 1;
        } else if (moreBidQuantity(currentAskQuantity, currentBidQuantity)) {
          buyingQuantity = floor(buyingQuantity + currentAskQuantity, 8);
          currentBidQuantity = floor(currentBidQuantity - currentAskQuantity, 8);
          currentAskQuantity = 0;
          askIndex = askIndex + 1;
          break;
        }
      } else {
        // total BTC
        return {
          market: `${market}`,
          buyingRate,
          buyingQuantity,
          BTCValue: floor(buyingRate * buyingQuantity, 8),
          buyFrom: `${asksExchangeName}`,
          sellTo: `${bidsExchangeName}`,
          message: `good`
        };
      } // if buyCondition
    } // while bidIndex
    // This line should not be executed unless we run out of bids.
    if (bidIndex >= 99) {
      return {
        market: `${market}`,
        buyingRate,
        buyingQuantity,
        BTCValue: floor(buyingRate * buyingQuantity, 8),
        buyFrom: `${asksExchangeName}`,
        sellTo: `${bidsExchangeName}`,
        message: 'bids out of bounds'
      };
    }
  } // while askIndex
} // buying func


function firstTimeRunning(currentAskQuantity, currentBidQuantity) {
  return (currentAskQuantity === false && currentBidQuantity === false)
}

function buyCondition(asks, bids, i, j, ratio) {
  return (floor(floor(bids[j].Rate - asks[i].Rate, 10) / asks[i].Rate, 10) >= ratio) === true;
}

function moreAskQuantity(currentAskQuantity, currentBidQuantity) {
  return (currentAskQuantity >= currentBidQuantity);

}

function moreBidQuantity(currentAskQuantity, currentBidQuantity) {
  return (currentAskQuantity < currentBidQuantity);
}








