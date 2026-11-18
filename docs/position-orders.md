# Purchase orders

A stock remains one holding per watchlist. Use **Add order** on its row, or add the same ticker again with a share quantity, to record another purchase. The expandable orders section shows each purchase below the holding. Order numbers start at 1 independently for each stock in each watchlist.

Total shares are the sum of order quantities. Average cost is total purchase cost divided by total shares. Holding value and unrealized gain/loss use the current quote and all orders. Historical portfolio values include each order from its own purchase date. Original tracking prices remain unchanged.

## Rollout

Apply `supabase/migrations/202611180001_position_orders.sql` to the hosted database before releasing the application. It backfills every existing holding with a quantity as order 1, preserving price, date, and notes. Stocks without a quantity remain unquantified until their first order. Local account databases apply this migration automatically on restart. Guest holdings are normalized when read from browser storage.

The original database purchase columns preserve the first purchase; `orders` contains all purchases. Application reads calculate aggregate fields from `orders`. Existing orders cannot be edited through the application; removing a stock removes all its orders. Guest-to-account imports preserve each order.
