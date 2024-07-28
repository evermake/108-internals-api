import { Middlewares, RouterBuilder } from 'effect-http'
import { Config, Effect } from 'effect'
import { api } from './api'
import { MembersRepo } from './services/MembersRepo'
import { BlogRepo } from './services/BlogRepo'
import { paginatedArray } from './utils'
import { cors } from './middlewares'

export const makeApp = Effect.gen(function *() {
  const corsAllowOrigin = yield* Config.withDefault(Config.string('CORS_ALLOW_ORIGIN'), '*')

  return RouterBuilder
    .make(api)
    .pipe(
      RouterBuilder.handle('members', () => Effect.gen(function* () {
        const membersRepo = yield* MembersRepo
        return yield* membersRepo.allMembers
      })),
      RouterBuilder.handle('posts', ({ query }) => Effect.gen(function* () {
        const {
          pageNo = 1,
          pageSize = 10,
        } = query

        const blogRepo = yield* BlogRepo
        const postsPaginated = yield* paginatedArray(blogRepo.allPosts)({ pageNo, pageSize })

        return {
          total: postsPaginated.total,
          posts: postsPaginated.page,
        }
      })),
      RouterBuilder.build,
      Middlewares.errorLog,
      cors({
        allowOrigin: corsAllowOrigin,
        allowMethods: '*',
        allowHeaders: '*',
      }),
    )
})
