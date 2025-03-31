create or replace function public.handle_new_user
()
returns trigger as $$
begin
    insert into profiles
        (id, username, created_at, updated_at, full_name, total_distance, total_elevation, ride_count, avatar_url)
    values
        (new.id, split_part(new.email, '@', 1), now(), now(), '', 0, 0, 0, '');
    return new;
end;
$$ language plpgsql;

create trigger on_auth_user_created
after
insert on
auth.users
for each row
execute
function public.handle_new_user
();
