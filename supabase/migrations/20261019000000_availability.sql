-- Optional pickup window, e.g. "available from Apr 20, must be gone by Apr 30 when I move out".
alter table listings add column if not exists available_from date;
alter table listings add column if not exists available_until date;

alter table listings drop constraint if exists availability_order;
alter table listings add constraint availability_order check (
  available_from is null or available_until is null or available_until >= available_from
);

-- Same as before, plus the two dates. The return type changes, so the function must be dropped first.
drop function if exists nearby_listings(double precision, double precision, text, text, text, text, int, int);
create function nearby_listings(
  user_lat double precision,
  user_lng double precision,
  filter_campus text,
  filter_type text default null,
  filter_tag text default null,
  search text default null,
  page_size int default 50,
  page_offset int default 0
)
returns table (
  id uuid, seller_id uuid, type text, price numeric, title text, description text, tag text,
  condition text, condition_reason text, visible_defects text[], photos text[], trade_for text,
  available_from date, available_until date,
  pickup_point_id text, pickup_name text, lat double precision, lng double precision,
  created_at timestamptz, seller_name text, distance_m int
)
language sql stable as $$
  select l.id, l.seller_id, l.type, l.price, l.title, l.description, l.tag, l.condition, l.condition_reason,
         l.visible_defects, l.photos, l.trade_for, l.available_from, l.available_until,
         l.pickup_point_id, l.pickup_name, l.lat, l.lng, l.created_at,
         u.name as seller_name,
         -- haversine, in metres
         round(2 * 6371000 * asin(sqrt(
           power(sin(radians(l.lat - user_lat) / 2), 2) +
           cos(radians(user_lat)) * cos(radians(l.lat)) * power(sin(radians(l.lng - user_lng) / 2), 2)
         )))::int as distance_m
  from listings l
  left join users u on u.id = l.seller_id
  where l.campus_id = filter_campus
    and l.status = 'available'
    and (filter_type is null or l.type = filter_type)
    and (filter_tag is null or l.tag = filter_tag)
    and (search is null or position(lower(search) in lower(l.title || ' ' || l.description)) > 0)
  order by distance_m, l.created_at desc
  limit page_size offset page_offset;
$$;
