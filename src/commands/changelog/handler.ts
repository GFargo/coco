import { Argv } from 'yargs'
import clipboard from 'clipboardy';
import { Logger } from '../../lib/utils/logger'
import { getApiKeyForModel, getLlm, getPrompt } from '../../lib/langchain/utils'

import { loadConfig } from '../../lib/config/loadConfig'
import { isInteractive } from '../../lib/ui/helpers'
import { ChangelogOptions } from './options'
import { generateAndReviewLoop } from '../../lib/ui/generateAndReviewLoop'
import { executeChain } from '../../lib/langchain/executeChain'
import { handleResult } from '../../lib/ui/handleResult'
import { CHANGELOG_PROMPT } from '../../lib/langchain/prompts/changelog'
import { getCommitLogRange } from '../../lib/simple-git/getCommitLogRange'
import { getCommitLogCurrentBranch } from '../../lib/simple-git/getCommitLogCurrentBranch'
import { getRepo } from '../../lib/simple-git/getRepo'
import { logSuccess } from '../../lib/ui/logSuccess'
import { logResult } from '../../lib/ui/logResult'


export async function handler(argv: Argv<ChangelogOptions>['argv']) {
  const options = loadConfig(argv) as ChangelogOptions
  const logger = new Logger(options)
  const git = getRepo()
  const key = getApiKeyForModel(options.service, options)

  if (!key) {
    logger.log(`No API Key found. 🗝️🚪`, { color: 'red' })
    process.exit(1)
  }

  const model = getLlm(options.service, key, {
    temperature: 0.4,
    maxConcurrency: 10,
  })

  const INTERACTIVE = isInteractive(options)

  async function factory() {
    if (options.range) {
      const [from, to] = options.range?.split(':')

      if (!from || !to) {
        logger.log(`Invalid range provided. Expected format is <from>:<to>`, { color: 'red' })
        process.exit(1)
      }

      return await getCommitLogRange(from, to, { git, noMerges: true })
    }

    logger.verbose(`No range provided. Defaulting to current branch`, { color: 'yellow' })
    return await getCommitLogCurrentBranch({ git, logger })
  }

  async function parser(messages: string[]) {
    const result = messages.join('\n')
    return result
  }

  const changelogMsg = await generateAndReviewLoop({
    label: 'Changelog',
    factory,
    parser,
    agent: async (context, options) => {
      const prompt = getPrompt({
        template: options.prompt,
        variables: CHANGELOG_PROMPT.inputVariables,
        fallback: CHANGELOG_PROMPT,
      })

      return await executeChain({
        llm: model,
        prompt,
        variables: { summary: context },
      })
    },
    noResult: async () => {
      if (options.range) {
        logger.log(`No commits found in the provided range.`, { color: 'red' })
        process.exit(0)
      }

      logger.log(`No commits found in the current branch.`, { color: 'red' })
      process.exit(0)
    },
    options: {
      ...options,
      prompt: options.prompt || CHANGELOG_PROMPT.template,
      logger,
      interactive: INTERACTIVE,
    },
  })

  const MODE =
    (INTERACTIVE && 'interactive') || (options.commit && 'interactive') || options?.mode || 'stdout'

  handleResult({
    result: changelogMsg,
    interactiveHandler: async (result) => {
      clipboard.writeSync(result)
      logger.log(`Copied to clipboard 📋`, { color: 'green' })
      logSuccess()
    },
    mode: MODE as 'interactive' | 'stdout',
  })
}
