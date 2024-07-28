import type { Effect } from 'effect'
import { Context } from 'effect'
import type { MemberInfo } from '../schemas'

export class MembersRepo extends Context.Tag('MembersRepo')<
  MembersRepo,
  {
    readonly allMembers: Effect.Effect<(typeof MemberInfo.Type)[], unknown>
  }
>() {}
