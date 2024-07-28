import { HttpMiddleware, HttpServerRequest, HttpServerResponse } from '@effect/platform'
import { Effect } from 'effect'

export const cors = ({
  allowOrigin,
  allowMethods,
  allowHeaders,
}: {
  allowOrigin: string
  allowMethods: string
  allowHeaders: string
}) => {
  return HttpMiddleware.make(app =>
    Effect.gen(function* () {
      const req = yield* HttpServerRequest.HttpServerRequest

      let res
      if (req.method === 'OPTIONS') {
        res = HttpServerResponse.empty()
      }
      else {
        res = yield* app
      }

      res = yield* HttpServerResponse.setHeader('Access-Control-Allow-Origin', allowOrigin)(res)
      res = yield* HttpServerResponse.setHeader('Access-Control-Allow-Methods', allowMethods)(res)
      res = yield* HttpServerResponse.setHeader('Access-Control-Allow-Headers', allowHeaders)(res)

      return res
    }),
  )
}
