import { getApiKeyForModel, getModelAndProviderFromConfig } from '../../lib/langchain/utils'
import { getLlm } from '../../lib/langchain/utils/getLlm'
import { getPrompt } from '../../lib/langchain/utils/getPrompt'

import { JsonOutputParser } from '@langchain/core/output_parsers'
import { loadConfig } from '../../lib/config/utils/loadConfig'
import { executeChain } from '../../lib/langchain/utils/executeChain'
import { getCommitLogCurrentBranch } from '../../lib/simple-git/getCommitLogCurrentBranch'
import { getCommitLogRange } from '../../lib/simple-git/getCommitLogRange'
import { getCurrentBranchName } from '../../lib/simple-git/getCurrentBranchName'
import { getRepo } from '../../lib/simple-git/getRepo'
import { CommandHandler } from '../../lib/types'
import { generateAndReviewLoop } from '../../lib/ui/generateAndReviewLoop'
import { handleResult } from '../../lib/ui/handleResult'
import { LOGO, isInteractive } from '../../lib/ui/helpers'
import { logSuccess } from '../../lib/ui/logSuccess'
import { ChangelogArgv, ChangelogOptions } from './options'
import { CHANGELOG_PROMPT } from './prompt'

interface ChangelogResponse {
  header: string
  content: string
}

export const handler: CommandHandler<ChangelogArgv> = async (argv, logger) => {
  const config = loadConfig<ChangelogOptions, ChangelogArgv>(argv)
  const git = getRepo()
  const key = getApiKeyForModel(config)
  const { provider, model } = getModelAndProviderFromConfig(config)

  if (config.service.authentication.type !== 'None' && !key) {
    logger.log(`No API Key found. 🗝️🚪`, { color: 'red' })
    process.exit(1)
  }

  const llm = getLlm(provider, model, config)

  const INTERACTIVE = isInteractive(config)

  if (INTERACTIVE) {
    logger.log(LOGO)
  }

  async function factory() {
    const branchName = await getCurrentBranchName({ git })

    if (config.range && config.range.includes(':')) {
      const [from, to] = config.range.split(':')

      if (!from || !to) {
        logger.log(`Invalid range provided. Expected format is <from>:<to>`, { color: 'red' })
        process.exit(1)
      }

      return {
        branch: branchName,
        commits: await getCommitLogRange(from, to, { git, noMerges: true }),
      }
    }

    logger.verbose(`No range provided. Defaulting to current branch`, { color: 'yellow' })
    return {
      branch: branchName,
      commits: await getCommitLogCurrentBranch({ git, logger }),
    }
  }

  async function parser({ branch, commits }: { branch: string; commits: string[] }) {
    const result = `## ${branch}\n\n${commits.map((commit) => `${commit}`).join('\n\n\n')}`

    console.log({ result }) 
    return result
  }

  const changelogMsg = await generateAndReviewLoop<{
    branch: string
    commits: string[]
  }>({
    label: 'changelog',
    factory,
    parser,
    agent: async (context, options) => {
      const parser = new JsonOutputParser<ChangelogResponse>()

      const prompt = getPrompt({
        template: options.prompt,
        variables: CHANGELOG_PROMPT.inputVariables,
        fallback: CHANGELOG_PROMPT,
      })

      const formatInstructions =
        "Respond with a valid JSON object, containing two fields: 'header' and 'content', both strings."

      const changelog = await executeChain<ChangelogResponse>({
        llm,
        prompt,
        variables: {
          summary: context,
          format_instructions: formatInstructions,
        },
        parser,
      })

      return `${changelog.header}\n\n${changelog.content}`
    },
    noResult: async () => {
      if (config.range) {
        logger.log(`No commits found in the provided range.`, { color: 'red' })
        process.exit(0)
      }

      logger.log(`No commits found in the current branch.`, { color: 'red' })
      process.exit(0)
    },
    options: {
      ...config,
      prompt: config.prompt || (CHANGELOG_PROMPT.template as string),
      logger,
      interactive: INTERACTIVE,
      review: {
        enableFullRetry: false,
      },
    },
  })

  const MODE =
    (INTERACTIVE && 'interactive') || (config.commit && 'interactive') || config?.mode || 'stdout'

  handleResult({
    result: changelogMsg,
    interactiveHandler: async () => {
      logSuccess()
    },
    mode: MODE as 'interactive' | 'stdout',
  })
}
