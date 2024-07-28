import { Schema } from '@effect/schema'

export const CalendarDate = Schema.String.pipe(Schema.pattern(/\d{4}-\d{2}-\d{2}/))

export const MemberInfo = Schema.Struct({
  fullname: Schema.String,
  color: Schema.Union(
    Schema.Literal('red'),
    Schema.Literal('green'),
    Schema.Literal('purple'),
  ),
  hometown: Schema.NullOr(Schema.String),
  telegram: Schema.NullOr(Schema.String),
  github: Schema.NullOr(Schema.String),
  bio: Schema.String,
})

export const BlogPost = Schema.Struct({
  title: Schema.String,
  date: CalendarDate,
  coverUrl: Schema.NullOr(Schema.String),
  contentMd: Schema.String,
})
