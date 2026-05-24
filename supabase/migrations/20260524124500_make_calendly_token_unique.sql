-- Drop the old unique index
drop index if exists calendly_tokens_org_email_token_idx;

-- Make calendly_token unique to prevent the same token from being associated with multiple emails or duplicated
create unique index if not exists calendly_tokens_token_key on calendly_tokens(calendly_token);
