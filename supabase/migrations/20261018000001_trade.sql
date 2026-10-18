-- Add a third post type, "trade": no price, plus an optional note on what the seller wants in exchange.
alter table listings drop constraint if exists listings_type_check;
alter table listings add constraint listings_type_check check (type in ('free', 'sell', 'trade'));

alter table listings drop constraint if exists price_matches_type;
alter table listings add constraint price_matches_type check (
  (type = 'sell' and price is not null and price >= 0) or
  (type in ('free', 'trade') and price is null)
);

alter table listings add column if not exists trade_for text;
