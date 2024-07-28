import type { Effect } from 'effect'
import { Context } from 'effect'
import type { BlogPost } from '../schemas'

export class BlogRepo extends Context.Tag('BlogRepo')<
  BlogRepo,
  {
    readonly allPosts: Effect.Effect<(typeof BlogPost.Type)[], unknown>
  }
>() {}
