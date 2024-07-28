import { NodeRuntime } from '@effect/platform-node'
import { NodeServer } from 'effect-http-node'
import { Config, Effect } from 'effect'
import { makeApp } from './app'
import { MainLive } from './layers'

const main = Effect.gen(function* () {
  const port = yield* Config.withDefault(Config.number('PORT'), 3000)
  const app = yield* makeApp
  yield* app.pipe(NodeServer.listen({ port }))
})

NodeRuntime.runMain(Effect.provide(main, MainLive))
