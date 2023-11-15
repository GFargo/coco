import chalk from 'chalk'
import { CommitOptions } from '../../commands/commit/options'

export const isInteractive = (argv: CommitOptions) => {
  return argv?.mode === 'interactive' || argv.interactive
}

export const SEPERATOR = chalk.blue('----------------')