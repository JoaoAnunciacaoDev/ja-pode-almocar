-- Allow authenticated users to update their own push subscriptions (required by upsert / ON CONFLICT DO UPDATE)
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'push_subscriptions' 
      and policyname = 'users update own push subscriptions'
  ) then
    create policy "users update own push subscriptions"
    on public.push_subscriptions for update to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
  end if;
end $$;

grant update on table public.push_subscriptions to authenticated;
