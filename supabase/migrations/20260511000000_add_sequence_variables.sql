alter table sequences add column if not exists subject_variable text;
alter table sequences add column if not exists body_variable text;

update sequences
set subject_variable = subject
where subject_variable is null
  and subject is not null;

update sequences
set body_variable = body
where body_variable is null
  and body is not null;
