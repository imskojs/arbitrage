// Test rollup, rxjs 6, and ramda by running npm start
import * as R from "ramda";
import { of, pipe } from "rxjs";
import { map } from "rxjs/operators";

of(1, 2, 3).pipe(
  map(x => x * 10),
  map(R.add(5))
)
  .subscribe(x => {
    console.log(x)
  });