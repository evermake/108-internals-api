import type { Client } from '@notionhq/client'
import { Context } from 'effect'

export class NotionClient extends Context.Tag('NotionClient')<
  NotionClient,
  Client
>() {}
