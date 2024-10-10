import yargs, { Arguments, Options } from 'yargs'
import changelog from '.'
import { getCommandUsageHeader } from '../../lib/ui/helpers'
import { BaseCommandOptions } from '../types'

export interface ChangelogOptions extends BaseCommandOptions {
  range: string
  branch: string
}

export type ChangelogArgv = Arguments<ChangelogOptions>

/**
 * Command line options via yargs
 */
export const options = {
  range: {
    type: 'string',
    alias: 'r',
    description: 'Commit range e.g `HEAD~2:HEAD`',
  },
  branch: {
    type: 'string',
    alias: 'b',
    description: 'Target branch to compare against',
  },
  i: {
    type: 'boolean',
    alias: 'interactive',
    description: 'Toggle interactive mode',
  },
} as Record<string, Options>

export const builder = (yargsInstance: ReturnType<typeof yargs>) => {
  return yargsInstance.options(options).usage(getCommandUsageHeader(changelog.command))
}
