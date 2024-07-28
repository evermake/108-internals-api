import { Effect, Layer, Redacted } from 'effect'
import { Client } from '@notionhq/client'
import * as Notion from './Notion'
import { MembersRepo } from './services/MembersRepo'
import { BlogRepo } from './services/BlogRepo'
import { NotionClient } from './services/NotionClient'

const NotionClientLive = Layer.effect(NotionClient, Effect.gen(function * () {
  const config = yield* Notion.config
  return new Client({
    auth: Redacted.value(config.apiKey),
    notionVersion: '2022-06-28',
  })
}))

const MembersRepoLive = Layer.effect(MembersRepo, Effect.gen(function * () {
  const membersCached = yield* Effect.cachedWithTTL(Notion.allMembers, '1 minute')
  return { allMembers: membersCached }
}))

const BlogRepoLive = Layer.effect(BlogRepo, Effect.gen(function * () {
  const postsCached = yield* Effect.cachedWithTTL(Notion.allBlogPosts, '1 minute')
  return { allPosts: postsCached }
}))

export const MainLive = Layer.merge(
  Layer.provide(BlogRepoLive, NotionClientLive),
  Layer.provide(MembersRepoLive, NotionClientLive),
)
