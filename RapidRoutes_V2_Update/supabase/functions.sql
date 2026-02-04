-- Supabase PostGIS helper for geospatial city search
-- Usage: select * from find_cities_within_radius(lat_param, lng_param, radius_meters)
create or replace function find_cities_within_radius(lat_param double precision, lng_param double precision, radius_meters double precision)
returns setof cities as $$
  select * from cities
  where earth_distance(ll_to_earth(latitude, longitude), ll_to_earth(lat_param, lng_param)) <= radius_meters
    and latitude is not null and longitude is not null;
$$ language sql stable;
