import { Config, Data, Effect } from 'effect'
import { collectPaginatedAPI, isFullPage } from '@notionhq/client'
import type { PageObjectResponse, RichTextItemResponse } from '@notionhq/client/build/src/api-endpoints'
import { NotionToMarkdown } from 'notion-to-md'
import { NotionClient } from './services/NotionClient'
import type { BlogPost, MemberInfo } from './schemas'
import { dateToCalendarDate } from './utils'

export const config = Config.nested('NOTION')(
  Config.map(
    Config.all([
      Config.redacted('API_KEY'),

      Config.string('MEMBERS_DB_ID'),
      Config.string('MEMBERS_PROP_ID_IS_PUBLIC'),
      Config.string('MEMBERS_PROP_ID_FULLNAME'),
      Config.string('MEMBERS_PROP_ID_COLOR'),
      Config.string('MEMBERS_PROP_ID_HOMETOWN'),
      Config.string('MEMBERS_PROP_ID_TELEGRAM'),
      Config.string('MEMBERS_PROP_ID_GITHUB'),
      Config.string('MEMBERS_PROP_ID_BIO'),

      Config.string('POSTS_DB_ID'),
      Config.string('POSTS_PROP_ID_TITLE'),
      Config.string('POSTS_PROP_ID_DATE'),
      Config.string('POSTS_PROP_ID_COVER'),
      Config.string('POSTS_PROP_ID_VISIBILITY'),
    ]),
    ([
      apiKey,

      membersDbId,
      membersPropIdIsPublic,
      membersPropIdFullname,
      membersPropIdColor,
      membersPropIdHometown,
      membersPropIdTelegram,
      membersPropIdGithub,
      membersPropIdBio,

      postsDbId,
      postsPropIdTitle,
      postsPropIdDate,
      postsPropIdCover,
      postsPropIdVisibility,
    ]) => ({
      apiKey,

      membersDbId,
      membersPropIdIsPublic,
      membersPropIdFullname,
      membersPropIdColor,
      membersPropIdHometown,
      membersPropIdTelegram,
      membersPropIdGithub,
      membersPropIdBio,

      postsDbId,
      postsPropIdTitle,
      postsPropIdDate,
      postsPropIdCover,
      postsPropIdVisibility,
    }),
  ),
)

export const allMembers = Effect.gen(function* () {
  const notion = yield* NotionClient
  const cfg = yield* config

  const result = yield* Effect.tryPromise(() =>
    notion.databases.query({
      database_id: cfg.membersDbId,

      // Assume we won't have more than 100 members.
      page_size: 100,

      // Get only public members.
      filter: {
        property: cfg.membersPropIdIsPublic,
        checkbox: { equals: true },
      },

      // Take only required properties.
      filter_properties: [
        cfg.membersPropIdFullname,
        cfg.membersPropIdColor,
        cfg.membersPropIdHometown,
        cfg.membersPropIdTelegram,
        cfg.membersPropIdGithub,
        cfg.membersPropIdBio,
      ],
    }),
  )

  if (result.has_more) {
    yield* Effect.logWarning('Not all members have been fetched from Notion DB')
  }

  const output: (typeof MemberInfo.Type)[] = []
  for (const page of result.results) {
    if (!isFullPage(page)) {
      yield* new NotionParsingError({ reason: 'Got not full member\'s page' })
      continue
    }

    if (page.archived || page.in_trash)
      continue

    const fullname = yield* effectOnProp(
      page.properties,
      cfg.membersPropIdFullname,
      {
        title: titleProp => Effect.succeed(richTextToPlain(titleProp.title)),
        rich_text: titleProp => Effect.succeed(richTextToPlain(titleProp.rich_text)),
      },
    )

    const color = yield* effectOnProp(
      page.properties,
      cfg.membersPropIdColor,
      {
        select: colorProp => Effect.gen(function *() {
          switch (colorProp.select?.color) {
            case 'red':
            case 'purple':
            case 'green':
              return colorProp.select.color
          }
          yield* Effect.logWarning(`Unsupported color: ${colorProp.select?.color}, falling back to "red"`)
          return 'red' as const
        }),
      },
    )

    const hometown = yield* effectOnProp(
      page.properties,
      cfg.membersPropIdHometown,
      {
        rich_text: (hometownProp) => {
          const str = richTextToPlain(hometownProp.rich_text).trim()
          return str ? Effect.succeed(str) : Effect.succeed(null)
        },
      },
    )

    const telegram = yield* effectOnProp(
      page.properties,
      cfg.membersPropIdTelegram,
      {
        rich_text: (telegramProp) => {
          const str = richTextToPlain(telegramProp.rich_text).trim()
          return str ? Effect.succeed(str) : Effect.succeed(null)
        },
      },
    )

    const github = yield* effectOnProp(
      page.properties,
      cfg.membersPropIdGithub,
      {
        rich_text: (githubProp) => {
          const str = richTextToPlain(githubProp.rich_text).trim()
          return str ? Effect.succeed(str) : Effect.succeed(null)
        },
      },
    )

    const bio = yield* effectOnProp(
      page.properties,
      cfg.membersPropIdBio,
      {
        rich_text: bioProp => Effect.succeed(richTextToPlain(bioProp.rich_text)),
      },
    )

    output.push({
      fullname,
      color,
      hometown,
      telegram,
      github,
      bio,
    })
  }

  return output
})

export const allBlogPosts = Effect.gen(function* () {
  const notion = yield* NotionClient
  const cfg = yield* config

  const pages = yield* Effect.tryPromise(() =>
    collectPaginatedAPI(notion.databases.query, {
      database_id: cfg.postsDbId,

      filter: {
        property: cfg.postsPropIdVisibility,
        checkbox: { equals: true },
      },

      sorts: [{
        property: cfg.postsPropIdDate,
        direction: 'descending',
      }],

      filter_properties: [
        cfg.postsPropIdTitle,
        cfg.postsPropIdDate,
        cfg.postsPropIdCover,
      ],
    }),
  )

  const out: (typeof BlogPost.Type)[] = []
  for (const page of pages) {
    if (!isFullPage(page)) {
      yield* new NotionParsingError({ reason: 'Got not full blog post page' })
      continue
    }

    if (page.archived || page.in_trash)
      continue

    const title = yield* effectOnProp(
      page.properties,
      cfg.postsPropIdTitle,
      {
        title: titleProp => Effect.succeed(richTextToPlain(titleProp.title)),
        rich_text: titleProp => Effect.succeed(richTextToPlain(titleProp.rich_text)),
      },
    )

    const date = yield* effectOnProp(
      page.properties,
      cfg.postsPropIdDate,
      {
        date: dateProp => dateProp.date
          ? Effect.succeed(new Date(dateProp.date.start))
          : Effect.fail(new NotionParsingError({ reason: 'Blog post date is empty' })),
      },
    )

    const coverUrl = yield* effectOnProp(
      page.properties,
      cfg.postsPropIdCover,
      {
        url: coverProp => Effect.succeed(coverProp.url),
        files: (coverProp) => {
          const first = coverProp.files[0]

          if (!first)
            return Effect.succeed(null)

          switch (first.type) {
            case 'external':
              return Effect.succeed(first.external.url)
            case 'file':
              return Effect.succeed(first.file.url)
          }

          return Effect.fail(new NotionParsingError({ reason: `Unknown file type: ${first.type}` }))
        },
      },
    )

    const notionToMd = new NotionToMarkdown({
      notionClient: notion,
      config: {
        parseChildPages: false,
      },
    })
    const contentMd = yield* Effect.tryPromise(async () => {
      const blocks = await notionToMd.pageToMarkdown(page.id)
      return notionToMd.toMarkdownString(blocks)
        .parent
        .trim()
        .replaceAll(/\n{3,}/g, '\n\n')
    })

    out.push({
      title,
      date: dateToCalendarDate(date),
      coverUrl,
      contentMd,
    })
  }

  return out
})

// eslint-disable-next-line unicorn/throw-new-error
export class NotionParsingError extends Data.TaggedError('NotionParsingError')<{
  reason: string
}> {}

function effectOnProp<A, E, R>(
  props: PageObjectResponse['properties'],
  id: string,
  actions: {
    [key in PageObjectResponse['properties'][string]['type']]?: (
      prop: Extract<PageObjectResponse['properties'][string], { type: key }>
    ) => Effect.Effect<A, E, R>
  },
) {
  for (const prop of Object.values(props)) {
    if (prop.id === id) {
      const action = actions[prop.type]
      if (action) {
        // @ts-expect-error TypeScript cannot verify that the prop satisfies
        //  action's parameter type though it does.
        return action(prop)
      }
      else {
        const expectedTypes = Object.keys(actions).map(t => `"${t}"`).join(', ')
        return Effect.fail(new NotionParsingError({ reason: `Unsupported property type "${prop.type}", expected one of: ${expectedTypes}` }))
      }
    }
  }

  return Effect.fail(new NotionParsingError({ reason: `Property with ID "${id}" is not found` }))
}

function richTextToPlain(richText: RichTextItemResponse[]): string {
  return richText.map(item => item.plain_text).join('')
}
