create or replace function public.get_leaderboard_paginated
(
    p_metric text,
    p_period text,
    p_limit integer,
    p_offset integer
)
returns table
(
    username text,
    metric_value numeric,
    total_count bigint
)
language plpgsql
security definer
as $$
begin
    return query
    with
        user_metrics
        as
        (
            select
                p.username as user_name,
                case p_metric
                when 'distance' then cast(sum(r.distance) as numeric)
                when 'duration' then cast(sum(extract(epoch from (r.end_time - r.start_time))) as numeric)
                when 'elevation' then cast(sum(r.elevation_gain) as numeric)
                when 'max_speed' then cast(max(r.max_speed) as numeric)
                when 'average_speed' then cast(avg(r.average_speed) as numeric)
            end as value,
                count(*) over() as total
            from rides r
                join profiles p on r.user_id = p.id
            where 
            case p_period
                when 'this_week' then r.start_time >= date_trunc('week', now())
        
                when 'this_month' then r.start_time >= date_trunc
    ('month', now
    ())
                else true
end
and r.is_live = false -- Only include completed rides
        group by p.username
    )
select
    user_name,
    coalesce(value, 0
::numeric) as metric_value,
        coalesce
(total, 0::bigint) as total_count
    from user_metrics
    where value is not null
    order by value desc nulls last
    limit p_limit
    offset p_offset;
end;
$$;
