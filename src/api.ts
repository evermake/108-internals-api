import { Schema } from '@effect/schema'
import { Api, QuerySchema } from 'effect-http'
import { BlogPost, MemberInfo } from './schemas'

export const api = Api
  .make({ title: '108 Internals API' })
  .pipe(
    Api.addEndpoint(
      Api.get('members', '/members').pipe(
        Api.setEndpointOptions({
          summary: 'Get members info',
          description: 'Returns a list of all members.',
        }),
        Api.setResponseBody(Schema.Array(MemberInfo)),
      ),
    ),
    Api.addEndpoint(
      Api.get('posts', '/posts').pipe(
        Api.setEndpointOptions({
          summary: 'Get blog posts',
          description: 'Returns a paginated list of blog posts.',
        }),
        Api.setRequestQuery(Schema.Struct({
          pageSize: Schema.optional(QuerySchema.Int.pipe(Schema.between(1, 100))),
          pageNo: Schema.optional(QuerySchema.Int.pipe(Schema.greaterThanOrEqualTo(1))),
        })),
        Api.setResponseBody(Schema.Struct({
          total: Schema.Int.pipe(Schema.nonNegative()),
          posts: Schema.Array(BlogPost),
        })),
      ),
    ),
  )
